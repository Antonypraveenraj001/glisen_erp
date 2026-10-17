"""Step 180C: in-memory, owner-only dashboard tests; never access live MySQL."""

from datetime import date, datetime, timedelta
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
from platform_owner.backend.company_models import OwnerCompany
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.license_models import OwnerLicensePlan, OwnerLicenseTerm
from platform_owner.backend.recovery_models import OwnerBossRecoveryCase
from platform_owner.backend.settings import OwnerSettings

ORIGIN = "http://127.0.0.1:8100"
EMAIL = "hrglobalinfo198@gmail.com"
PASSWORD = "StrongDemoOwner!2026"
TODAY = date(2026, 10, 17)


class OwnerDashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        OwnerBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine, expire_on_commit=False)
        settings = OwnerSettings(
            environment="development", origin=ORIGIN, db_host="127.0.0.1",
            db_port=3306, db_name="castle_owner_memory_tests", db_user="castle_owner_tests",
            db_password="FAKE_TEST_PASSWORD_ONLY", owner_email=EMAIL, session_minutes=30,
        )
        self.app = create_app(settings, session_factory=self.factory)
        self.client = TestClient(self.app, base_url=ORIGIN)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)
        with self.factory() as db:
            bootstrap_first_owner(db, EMAIL, PASSWORD)
        self.clock = patch("platform_owner.backend.dashboard_api.business_today", return_value=TODAY)
        self.mock_today = self.clock.start()
        self.addCleanup(self.clock.stop)

    def login(self):
        response = self.client.post("/api/owner/auth/login", json={"email": EMAIL, "password": PASSWORD}, headers={"Origin": ORIGIN})
        self.assertEqual(response.status_code, 200, response.text)

    def headers(self):
        return {"Origin": ORIGIN, "x-csrf-token": self.client.cookies.get("castle_owner_dev_csrf")}

    def create_company(self, suffix, status="PENDING_SETUP", name=None):
        with self.factory.begin() as db:
            account_id = 1
            c = OwnerCompany(
                slug=f"demo-company-{suffix}", legal_name=name or f"Demo Company {suffix}",
                gstin=None, boss_email=f"boss{suffix}@example.com", recovery_email=None,
                status=status, created_at=datetime(2026, 1, 1),
                updated_at=datetime(2026, 1, 1), created_by_id=account_id,
            )
            db.add(c)
            db.flush()
            return c.id

    def plan(self, company_id, plan="MONTHLY"):
        with self.factory.begin() as db:
            db.add(OwnerLicensePlan(
                company_id=company_id, plan=plan, price_inr=Decimal("1999.00"),
                updated_by_id=1, updated_at=datetime(2026, 1, 1),
            ))

    def term(self, company_id, start, end, plan="MONTHLY", ref=None):
        with self.factory.begin() as db:
            db.add(OwnerLicenseTerm(
                company_id=company_id, plan=plan, amount_received_inr=Decimal("1999.00"),
                payment_reference=ref or f"PAY-{company_id}-{start.isoformat()}",
                start_on=start, expires_on=end, confirmed_by_id=1,
                confirmed_at=datetime(2026, 1, 1),
            ))

    def case(self, company_id, status="OPEN"):
        with self.factory.begin() as db:
            case = OwnerBossRecoveryCase(
                company_id=company_id, reason="LOST_PASSWORD", requester_role="RECOVERY_CONTACT",
                requester_email="recovery@example.com", status=status,
                opened_at=datetime(2026, 10, 17), opened_by_id=1,
            )
            db.add(case)
            db.flush()
            return case.id

    def summary(self):
        response = self.client.get("/api/owner/dashboard")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_dashboard_is_owner_only_and_no_post_mutation(self):
        self.assertEqual(self.client.get("/api/owner/dashboard").status_code, 401)
        self.assertEqual(self.client.post("/api/owner/dashboard").status_code, 405)
        self.login()
        self.assertEqual(self.client.get("/api/owner/dashboard").status_code, 200)
        self.assertIn("no-store", self.client.get("/api/owner/dashboard").headers["cache-control"])
        self.assertEqual(self.client.post("/api/owner/dashboard", headers=self.headers()).status_code, 405)
        self.assertEqual(self.client.post("/api/owner/auth/logout", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.get("/api/owner/dashboard").status_code, 401)

    def test_empty_dashboard_has_zero_counts_and_no_false_activation(self):
        self.login()
        data = self.summary()
        self.assertEqual(data["companies"], {"total": 0, "pending_setup": 0, "on_hold": 0})
        self.assertEqual(data["subscriptions"]["PAID_CURRENT"], 0)
        self.assertEqual(data["recoveries"]["open"], 0)
        self.assertEqual(data["as_of_ist"], TODAY.isoformat())
        self.assertEqual(data["scope"], "OWNER_REGISTRY_ONLY")
        self.assertFalse(data["erp_access_enforced"])
        self.assertFalse(data["customer_instances_connected"])
        self.assertEqual(data["attention_total"], 0)
        self.assertEqual(data["attention"], [])

    def test_pending_on_hold_and_unconfigured_companies(self):
        self.create_company("one")
        self.create_company("two", status="ON_HOLD")
        self.login()
        data = self.summary()
        self.assertEqual(data["companies"], {"total": 2, "pending_setup": 1, "on_hold": 1})
        self.assertEqual(data["subscriptions"]["NOT_CONFIGURED"], 2)
        self.assertEqual(data["attention_total"], 1)
        self.assertEqual(data["attention"][0]["kind"], "ONBOARDING_ON_HOLD")

    def test_plan_without_payment_is_not_paid_current(self):
        ident = self.create_company("one")
        self.plan(ident)
        self.login()
        data = self.summary()
        self.assertEqual(data["subscriptions"]["AWAITING_ADVANCE"], 1)
        self.assertEqual(data["subscriptions"]["PAID_CURRENT"], 0)
        self.assertEqual(data["attention_total"], 0)

    def test_monthly_expiring_in_30_days_and_no_grace(self):
        ident = self.create_company("one")
        self.plan(ident)
        self.term(ident, date(2026, 9, 17), date(2026, 11, 16))
        self.login()
        result = self.summary()
        self.assertEqual(result["subscriptions"]["PAID_CURRENT"], 1)
        self.assertEqual(result["subscriptions"]["expiring_within_30_days"], 1)
        self.assertEqual(result["attention"][0]["due_on"], "2026-11-16")
        self.mock_today.return_value = date(2026, 11, 16)
        result = self.summary()
        self.assertEqual(result["subscriptions"]["CANCELLED"], 1)
        self.assertEqual(result["subscriptions"]["ANNUAL_GRACE"], 0)
        self.assertEqual(result["attention"][0]["kind"], "CANCELLED")

    def test_expiry_on_day_31_not_flagged(self):
        ident = self.create_company("one")
        self.plan(ident)
        self.term(ident, date(2026, 10, 1), TODAY + timedelta(days=31))
        self.login()
        self.assertEqual(self.summary()["subscriptions"]["expiring_within_30_days"], 0)
        self.mock_today.return_value = TODAY + timedelta(days=1)
        self.assertEqual(self.summary()["subscriptions"]["expiring_within_30_days"], 1)

    def test_paid_ahead_renewal_prevents_false_imminent_expiry(self):
        ident = self.create_company("one")
        self.plan(ident)
        self.term(ident, date(2026, 10, 1), date(2026, 10, 20), ref="TERM-ONE")
        self.term(ident, date(2026, 10, 20), date(2026, 12, 20), ref="TERM-TWO")
        self.login()
        data = self.summary()
        self.assertEqual(data["subscriptions"]["PAID_CURRENT"], 1)
        self.assertEqual(data["subscriptions"]["expiring_within_30_days"], 0)

    def test_annual_grace_exact_days_and_cancellation(self):
        ident = self.create_company("annual")
        self.plan(ident, "ANNUAL")
        self.term(ident, date(2025, 10, 17), TODAY, plan="ANNUAL")
        self.login()
        result = self.summary()
        self.assertEqual(result["subscriptions"]["ANNUAL_GRACE"], 1)
        self.assertEqual(result["attention"][0]["due_on"], "2026-10-24")
        self.mock_today.return_value = date(2026, 10, 23)
        self.assertEqual(self.summary()["subscriptions"]["ANNUAL_GRACE"], 1)
        self.mock_today.return_value = date(2026, 10, 24)
        self.assertEqual(self.summary()["subscriptions"]["CANCELLED"], 1)

    def test_future_scheduled_paid_term_is_not_current(self):
        ident = self.create_company("future")
        self.plan(ident)
        self.term(ident, date(2026, 11, 1), date(2026, 12, 1))
        self.login()
        data = self.summary()
        self.assertEqual(data["subscriptions"]["SCHEDULED"], 1)
        self.assertEqual(data["subscriptions"]["PAID_CURRENT"], 0)

    def test_recovery_state_counts_and_prioritized_review(self):
        company = self.create_company("recovery")
        for status in ("OPEN", "VERIFIED", "READY_PENDING_CONNECTOR", "REJECTED"):
            self.case(company, status)
        self.login()
        data = self.summary()
        self.assertEqual(data["recoveries"], {
            "open": 1, "verified": 1, "ready_pending_connector": 1, "rejected": 1,
        })
        self.assertEqual(data["attention_total"], 3)
        self.assertTrue(all(a["kind"].startswith("RECOVERY_") for a in data["attention"]))
        self.assertTrue(all("credentials" not in str(a).lower() for a in data["attention"]))
        self.assertTrue(all(a["recovery_case_id"] is not None for a in data["attention"]))

    def test_attention_is_bounded_but_counts_all_companies(self):
        for number in range(20):
            self.create_company(str(number), status="ON_HOLD")
        self.login()
        data = self.summary()
        self.assertEqual(data["companies"]["total"], 20)
        self.assertEqual(data["attention_total"], 20)
        self.assertEqual(len(data["attention"]), 12)
        self.assertEqual(len({item["company_id"] for item in data["attention"]}), 12)

    def test_recovery_priority_before_expiring_and_held(self):
        held = self.create_company("held", status="ON_HOLD")
        current = self.create_company("monthly")
        self.plan(current)
        self.term(current, date(2026, 10, 1), date(2026, 10, 20))
        recovery = self.create_company("recovery")
        self.case(recovery)
        self.login()
        kinds = [item["kind"] for item in self.summary()["attention"]]
        self.assertEqual(kinds, ["RECOVERY_OPEN", "EXPIRING_SOON", "ONBOARDING_ON_HOLD"])
        self.assertTrue(held > 0)

    def test_no_sensitive_values_in_dashboard_response(self):
        ident = self.create_company("name", name="<script>alert(1)</script>" )
        self.plan(ident)
        self.case(ident)
        self.login()
        response = self.client.get("/api/owner/dashboard")
        self.assertEqual(response.status_code, 200)
        for key in ("password", "token", "gstin", "evidence_reference", "db_password", "payment_reference"):
            self.assertNotIn('"' + key + '"', response.text)
        self.assertNotIn("glisen_erp", response.text)
        self.assertEqual(response.json()["attention"][0]["company_name"], "<script>alert(1)</script>")
        source = (Path(__file__).resolve().parents[1] / "backend/static/app.js").read_text()
        self.assertIn('card.appendChild(element("strong"', source)
        self.assertNotIn("innerHTML", source)

    def test_no_new_table_or_erp_imports_and_no_mutation(self):
        self.assertNotIn("owner_dashboard", OwnerBase.metadata.tables)
        code = (Path(__file__).resolve().parents[1] / "backend/dashboard_api.py").read_text()
        self.assertNotIn("from app.", code)
        self.assertNotIn("import app.", code)
        self.assertNotIn("subprocess", code)
        self.assertNotIn("requests", code)
        company = self.create_company("one", status="ON_HOLD")
        self.login()
        for _ in range(3): self.summary()
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompany).count(), 1)
            self.assertEqual(db.get(OwnerCompany, company).status, "ON_HOLD")
            self.assertEqual(db.query(OwnerLicenseTerm).count(), 0)

    def test_dashboard_is_default_after_login_and_tabs_remain(self):
        source = (Path(__file__).resolve().parents[1] / "backend/static/app.js").read_text()
        html = (Path(__file__).resolve().parents[1] / "backend/static/index.html").read_text()
        for tag in ("dashboardTab", "dashboardPanel", "companiesTab", "securityTab", "dashboardGoCompanies"):
            self.assertIn('id="' + tag + '"', html)
        self.assertIn('if (signedIn) showTab("dashboard")', source)
        for id_ in ("metricCompanies", "metricPending", "metricPaid", "metricRecovery"):
            self.assertIn('id="' + id_ + '"', html)


if __name__ == "__main__":
    unittest.main()
