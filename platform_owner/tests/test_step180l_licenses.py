"""Step 180L owner-only subscription tests: SQLite memory; NO live DB or ERP."""

from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from platform_owner.backend.app import create_app
from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.license_api import advance_months
from platform_owner.backend.license_models import OwnerLicensePlan, OwnerLicenseTerm
from platform_owner.backend.settings import OwnerSettings

ORIGIN = "http://127.0.0.1:8100"
EMAIL = "hrglobalinfo198@gmail.com"
PASSWORD = "OwnerPass!UnitTests2026"
TODAY = date(2026, 10, 17)


class OwnerLicenseTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        OwnerBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine, expire_on_commit=False)
        options = OwnerSettings(
            environment="development", origin=ORIGIN,
            db_host="127.0.0.1", db_port=3306,
            db_name="castle_owner_fake_tests", db_user="castle_owner_tests",
            db_password="NOT_A_REAL_PASSWORD", owner_email=EMAIL, session_minutes=30,
        )
        self.client = TestClient(create_app(options, session_factory=self.factory), base_url=ORIGIN)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)
        with self.factory() as db:
            bootstrap_first_owner(db, EMAIL, PASSWORD)
        self.clock = patch("platform_owner.backend.license_api.business_today", return_value=TODAY)
        self.mock_today = self.clock.start()
        self.addCleanup(self.clock.stop)
        self.endpoint = None

    def login(self):
        answer = self.client.post("/api/owner/auth/login", json={"email": EMAIL, "password": PASSWORD}, headers={"Origin": ORIGIN})
        self.assertEqual(answer.status_code, 200, answer.text)

    def headers(self):
        return {"Origin": ORIGIN, "x-csrf-token": self.client.cookies.get("castle_owner_dev_csrf")}

    def company(self, slug="demo-company"):
        payload = {"slug": slug, "legal_name": "Demo Customer Engineering", "gstin": None,
                   "boss_email": "boss@example.com", "recovery_email": None}
        answer = self.client.post("/api/owner/companies", json=payload, headers=self.headers())
        self.assertEqual(answer.status_code, 201, answer.text)
        self.endpoint = f"/api/owner/companies/{answer.json()['id']}/license"
        return answer.json()["id"]

    def plan(self, plan="MONTHLY", price="999.00"):
        return self.client.put(self.endpoint + "/plan", json={"plan": plan, "price_inr": price}, headers=self.headers())

    def receipt(self, ref="TXN-123"):
        return self.client.post(self.endpoint + "/confirm-payment", json={"payment_reference": ref, "advance_received": True}, headers=self.headers())

    def setup_paid(self, plan="MONTHLY"):
        self.login(); ident = self.company()
        self.assertEqual(self.plan(plan).status_code, 200)
        paid = self.receipt()
        self.assertEqual(paid.status_code, 201, paid.text)
        return ident

    def test_only_owner_models_and_no_erp_imports(self):
        tables = OwnerBase.metadata.tables
        self.assertIn("owner_license_plans", tables)
        self.assertIn("owner_license_terms", tables)
        self.assertNotIn("users", tables)
        self.assertNotIn("company_settings", tables)
        for name in ("license_api.py", "license_models.py"):
            code = (Path(__file__).resolve().parents[1] / "backend" / name).read_text()
            self.assertNotIn("from app.", code)
            self.assertNotIn("import app.", code)
            self.assertNotIn("subprocess", code)

    def test_license_routes_are_owner_only(self):
        for suffix in ("", "/history"):
            self.assertEqual(self.client.get("/api/owner/companies/1/license" + suffix).status_code, 401)
        self.assertEqual(self.client.put("/api/owner/companies/1/license/plan", json={"plan":"MONTHLY","price_inr":"99"}, headers={"Origin": ORIGIN}).status_code, 401)
        self.assertEqual(self.client.post("/api/owner/companies/1/license/confirm-payment", json={"payment_reference":"TEST-001","advance_received":True}, headers={"Origin": ORIGIN}).status_code, 401)

    def test_csrf_origin_required_and_missing_company(self):
        self.login(); self.company()
        body = {"plan": "MONTHLY", "price_inr": "499.00"}
        self.assertEqual(self.client.put(self.endpoint+"/plan", json=body, headers={"Origin": ORIGIN}).status_code, 403)
        self.assertEqual(self.client.put(self.endpoint+"/plan", json=body, headers={**self.headers(), "Origin":"https://attacker.example"}).status_code, 403)
        self.assertEqual(self.client.get("/api/owner/companies/987654/license").status_code, 404)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerLicensePlan).count(), 0)

    def test_new_company_is_not_a_trial_and_has_no_access(self):
        self.login(); self.company()
        view = self.client.get(self.endpoint).json()
        self.assertEqual(view["subscription_status"], "NOT_CONFIGURED")
        self.assertFalse(view["erp_access_enforced"])
        self.assertEqual(view["erp_deployment_status"], "NOT_PROVISIONED")
        self.assertEqual(self.client.get(self.endpoint+"/history").json()["items"], [])

    def test_plan_settings_do_not_invent_payment_or_erp_activation(self):
        self.login(); self.company()
        result = self.plan("MONTHLY", "1499.50")
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["subscription_status"], "AWAITING_ADVANCE")
        self.assertEqual(result.json()["price_inr"], "1499.50")
        self.assertFalse(result.json()["erp_access_enforced"])
        with self.factory() as db:
            self.assertEqual(db.query(OwnerLicenseTerm).count(), 0)

    def test_invalid_plan_invalid_price_and_extra_fields(self):
        self.login(); self.company()
        for bad in (
            {"plan":"TRIAL","price_inr":"999"},
            {"plan":"WEEKLY","price_inr":"999"},
            {"plan":"MONTHLY","price_inr":"0"},
            {"plan":"MONTHLY","price_inr":"-1"},
            {"plan":"MONTHLY","price_inr":"12.123"},
            {"plan":"MONTHLY","price_inr":"NaN"},
            {"plan":"MONTHLY","price_inr":"10.00","secret_key":"x"},
        ):
            response = self.client.put(self.endpoint+"/plan", json=bad, headers=self.headers())
            self.assertEqual(response.status_code, 422, (bad, response.text))

    def test_payment_requires_plan_and_positive_advance_confirmation(self):
        self.login(); self.company()
        self.assertEqual(self.receipt().status_code, 409)
        self.assertEqual(self.plan().status_code, 200)
        for body in (
            {"payment_reference":"TEST-001","advance_received":False},
            {"payment_reference":"BAD REF","advance_received":True},
            {"payment_reference":"TXN-123","advance_received":True,"payment_amount":0},
        ):
            response = self.client.post(self.endpoint+"/confirm-payment", json=body, headers=self.headers())
            self.assertEqual(response.status_code, 422, response.text)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerLicenseTerm).count(), 0)

    def test_monthly_is_one_calendar_month_without_grace(self):
        self.setup_paid()
        view = self.client.get(self.endpoint).json()
        self.assertEqual(view["subscription_status"], "PAID_CURRENT")
        self.assertEqual(view["last_paid_term"]["start_on"], "2026-10-17")
        self.assertEqual(view["last_paid_term"]["expires_on"], "2026-11-17")
        self.mock_today.return_value = date(2026, 11, 16)
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "PAID_CURRENT")
        self.mock_today.return_value = date(2026, 11, 17)
        ended = self.client.get(self.endpoint).json()
        self.assertEqual(ended["subscription_status"], "CANCELLED")
        self.assertEqual(ended["cancellation_effective_on"], "2026-11-17")
        self.assertEqual(ended["data_recovery_deadline_on"], "2027-02-15")
        self.assertFalse(ended["data_retention_automation_enabled"])
        self.mock_today.return_value = date(2026, 11, 18)
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "CANCELLED")

    def test_annual_has_exact_seven_calendar_days_grace(self):
        self.setup_paid("ANNUAL")
        self.mock_today.return_value = date(2027, 10, 16)
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "PAID_CURRENT")
        self.mock_today.return_value = date(2027, 10, 17)
        view = self.client.get(self.endpoint).json()
        self.assertEqual(view["subscription_status"], "ANNUAL_GRACE")
        self.assertEqual(view["annual_grace_ends_on"], "2027-10-24")
        self.mock_today.return_value = date(2027, 10, 23)
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "ANNUAL_GRACE")
        self.mock_today.return_value = date(2027, 10, 24)
        ended = self.client.get(self.endpoint).json()
        self.assertEqual(ended["subscription_status"], "CANCELLED")
        self.assertEqual(ended["cancellation_effective_on"], "2027-10-24")
        self.assertEqual(ended["data_recovery_deadline_on"], "2028-01-22")

    def test_early_renewal_waits_until_previous_paid_term_ends(self):
        self.setup_paid()
        first = self.client.get(self.endpoint).json()["last_paid_term"]
        second = self.receipt("TXN-456")
        self.assertEqual(second.status_code, 201, second.text)
        new_term = second.json()["last_paid_term"]
        self.assertEqual(new_term["start_on"], first["expires_on"])
        self.assertEqual(new_term["expires_on"], "2026-12-17")
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "PAID_CURRENT")
        self.assertEqual(self.receipt("TXN-789").status_code, 409)
        self.mock_today.return_value = date(2026, 11, 17)
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "PAID_CURRENT")

    def test_annual_renewal_in_grace_starts_on_original_expiry(self):
        self.setup_paid("ANNUAL")
        self.mock_today.return_value = date(2027, 10, 20)
        renewed = self.receipt("GRACE-002")
        self.assertEqual(renewed.status_code, 201, renewed.text)
        self.assertEqual(renewed.json()["last_paid_term"]["start_on"], "2027-10-17")
        self.assertEqual(renewed.json()["last_paid_term"]["expires_on"], "2028-10-17")
        self.assertEqual(renewed.json()["subscription_status"], "PAID_CURRENT")

    def test_late_renewal_restarts_today_without_overdue_charges(self):
        self.setup_paid()
        self.mock_today.return_value = date(2026, 12, 20)
        self.assertEqual(self.client.get(self.endpoint).json()["subscription_status"], "CANCELLED")
        renewed = self.receipt("LATE-200")
        self.assertEqual(renewed.status_code, 201)
        self.assertEqual(renewed.json()["last_paid_term"]["start_on"], "2026-12-20")
        self.assertEqual(renewed.json()["last_paid_term"]["expires_on"], "2027-01-20")

    def test_plan_change_only_impacts_subsequent_renewal(self):
        self.setup_paid()
        changed = self.plan("ANNUAL", "9499.00")
        self.assertEqual(changed.status_code, 200, changed.text)
        previous = self.client.get(self.endpoint).json()["last_paid_term"]
        self.assertEqual(previous["plan"], "MONTHLY")
        self.assertEqual(previous["amount_received_inr"], "999.00")
        self.assertEqual(self.receipt("NEW-ANNUAL").json()["last_paid_term"]["plan"], "ANNUAL")
        self.assertEqual(self.client.get(self.endpoint).json()["last_paid_term"]["amount_received_inr"], "9499.00")

    def test_duplicate_references_rejected_globally_and_history_immutable(self):
        self.setup_paid()
        self.assertEqual(self.receipt("TXN-123").status_code, 409)
        self.company(slug="second-company")
        self.assertEqual(self.plan().status_code, 200)
        self.assertEqual(self.receipt("TXN-123").status_code, 409)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerLicenseTerm).count(), 1)
        response = self.client.get(self.endpoint+"/history")
        self.assertEqual(response.json()["items"], [])

    def test_onboarding_hold_blocks_plan_and_payment(self):
        self.login(); ident = self.company()
        self.assertEqual(self.plan().status_code, 200)
        hold = self.client.post(f"/api/owner/companies/{ident}/hold", headers=self.headers())
        self.assertEqual(hold.status_code, 200)
        self.assertEqual(self.plan().status_code, 409)
        self.assertEqual(self.receipt().status_code, 409)

    def test_company_activation_remains_blocked_despite_current_paid_license(self):
        ident = self.setup_paid()
        for action in ("activate", "suspend"):
            response = self.client.post(f"/api/owner/companies/{ident}/{action}", headers=self.headers())
            self.assertEqual(response.status_code, 409)
        with self.factory() as db:
            self.assertEqual(db.get(OwnerCompany, ident).status, "PENDING_SETUP")
            self.assertEqual(db.query(OwnerLicenseTerm).count(), 1)

    def test_date_math_end_of_month_and_leap_day(self):
        self.assertEqual(advance_months(date(2027,1,31),1),date(2027,2,28))
        self.assertEqual(advance_months(date(2028,1,31),1),date(2028,2,29))
        self.assertEqual(advance_months(date(2028,2,29),12),date(2029,2,28))

    def test_owner_company_history_includes_payment_without_secret(self):
        ident = self.setup_paid()
        response = self.client.get(f"/api/owner/companies/{ident}/history")
        kinds = [row["event_type"] for row in response.json()["items"]]
        self.assertIn("PAYMENT_CONFIRMED", kinds)
        self.assertIn("LICENSE_PLAN_SET", kinds)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompanyEvent).count(), 3)


if __name__ == "__main__":
    unittest.main()
