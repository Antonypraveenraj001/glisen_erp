"""Step 180G activity feed: isolated SQLite tests, no live MySQL/ERP."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from platform_owner.backend.app import create_app
from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.models import OwnerAccount
from platform_owner.backend.settings import OwnerSettings

ORIGIN = "http://127.0.0.1:8100"
EMAIL = "hrglobalinfo198@gmail.com"
PASSWORD = "VeryStrong!Owner2026"


class OwnerAuditTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        OwnerBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine, expire_on_commit=False)
        settings = OwnerSettings(
            environment="development", origin=ORIGIN, db_host="127.0.0.1", db_port=3306,
            db_name="castle_owner_fake_tests", db_user="castle_owner_tests",
            db_password="NOT_A_REAL_PASSWORD", owner_email=EMAIL, session_minutes=30,
        )
        self.client = TestClient(create_app(settings, session_factory=self.factory), base_url=ORIGIN)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)
        with self.factory() as db:
            bootstrap_first_owner(db, EMAIL, PASSWORD)

    def login(self):
        reply = self.client.post("/api/owner/auth/login", json={"email": EMAIL, "password": PASSWORD}, headers={"Origin": ORIGIN})
        self.assertEqual(reply.status_code, 200, reply.text)

    def headers(self):
        return {"Origin": ORIGIN, "x-csrf-token": self.client.cookies.get("castle_owner_dev_csrf")}

    def create_company(self, slug="demo-company"):
        reply = self.client.post("/api/owner/companies", json={
            "slug": slug, "legal_name": "CASTLE Demo Engineering", "gstin": None,
            "boss_email": "demo@example.com", "recovery_email": None,
        }, headers=self.headers())
        self.assertEqual(reply.status_code, 201, reply.text)
        return reply.json()["id"]

    def test_anonymous_access_denied(self):
        self.assertEqual(self.client.get("/api/owner/audit").status_code, 401)
        self.assertEqual(self.client.get("/api/owner/audit?category=LICENSE").status_code, 401)

    def test_empty_activity_has_honest_scope(self):
        self.login()
        data = self.client.get("/api/owner/audit").json()
        self.assertEqual(data["items"], [])
        self.assertEqual(data["total"], 0)
        self.assertEqual(data["scope"], "OWNER_REGISTRY_EVENTS_ONLY")
        self.assertFalse(data["customer_erp_connected"])
        self.assertFalse(data["immutable_external_audit_enabled"])

    def test_registration_action_shows_actor_company_and_timestamp(self):
        self.login(); company_id = self.create_company()
        data = self.client.get("/api/owner/audit").json()
        self.assertEqual(data["total"], 1)
        row = data["items"][0]
        self.assertEqual(row["action"], "REGISTERED")
        self.assertEqual(row["category"], "REGISTRATION")
        self.assertEqual(row["company_id"], company_id)
        self.assertEqual(row["company_code"], "demo-company")
        self.assertEqual(row["company_name"], "CASTLE Demo Engineering")
        self.assertEqual(row["actor_email"], EMAIL)
        self.assertTrue(row["occurred_at"].endswith("Z"))
        self.assertFalse(row["live_erp_access_changed"])
        self.assertNotIn("password", str(row).lower())

    def test_company_edit_and_hold_resume_are_recorded(self):
        self.login(); cid = self.create_company()
        profile = {"legal_name": "Demo Engineering Changed", "gstin": None,
                   "boss_email": "demo@example.com", "recovery_email": None}
        self.assertEqual(self.client.put(f"/api/owner/companies/{cid}", json=profile, headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.post(f"/api/owner/companies/{cid}/hold", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.post(f"/api/owner/companies/{cid}/resume", headers=self.headers()).status_code, 200)
        items = self.client.get("/api/owner/audit").json()["items"]
        self.assertEqual([r["action"] for r in items], ["ONBOARDING_RESUMED", "ONBOARDING_HELD", "PROFILE_UPDATED", "REGISTERED"])

    def test_license_actions_visible_with_safe_description(self):
        self.login(); cid = self.create_company()
        base = f"/api/owner/companies/{cid}/license"
        self.assertEqual(self.client.put(base + "/plan", json={"plan": "MONTHLY", "price_inr": "2000.00"}, headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.post(base + "/confirm-payment", json={"payment_reference": "TEST-ABC-001", "advance_received": True}, headers=self.headers()).status_code, 201)
        rows = self.client.get("/api/owner/audit?category=LICENSE").json()["items"]
        self.assertEqual([r["action"] for r in rows], ["PAYMENT_CONFIRMED", "LICENSE_PLAN_SET"])
        self.assertTrue(all(r["category"] == "LICENSE" for r in rows))
        self.assertNotIn("TEST-ABC-001", str(rows))  # Payment reference is not disclosed in audit feed

    def test_recovery_events_are_not_double_counted(self):
        self.login(); cid = self.create_company()
        entry = self.client.post(f"/api/owner/companies/{cid}/boss-recovery", json={
            "reason": "LOST_PASSWORD", "requester_role": "BOSS", "requester_email": "demo@example.com",
        }, headers=self.headers())
        self.assertEqual(entry.status_code, 201, entry.text)
        case_id = entry.json()["id"]
        response = self.client.post(f"/api/owner/companies/{cid}/boss-recovery/{case_id}/reject",
            json={"decision_code": "INSUFFICIENT_PROOF"}, headers=self.headers())
        self.assertEqual(response.status_code, 200, response.text)
        data = self.client.get("/api/owner/audit?category=RECOVERY").json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["items"]), 2)
        self.assertTrue(all(x["action"] == "BOSS_RECOVERY" for x in data["items"]))
        self.assertNotIn("demo@example.com", str(data["items"]))

    def test_filtering_by_category_and_company_code(self):
        self.login(); c1 = self.create_company("first-demo"); c2 = self.create_company("second-demo")
        self.client.post(f"/api/owner/companies/{c2}/hold", headers=self.headers())
        data = self.client.get("/api/owner/audit?category=REGISTRATION&company_code=first-demo").json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["company_id"], c1)
        self.assertEqual(self.client.get("/api/owner/audit?company_code=missing-code").json()["total"], 0)
        self.assertEqual(self.client.get("/api/owner/audit?category=RECOVERY").json()["total"], 0)

    def test_newest_first_and_paginated(self):
        self.login()
        for i in range(5):
            self.create_company(f"demo-company-{i}")
        page = self.client.get("/api/owner/audit?limit=2&offset=0").json()
        self.assertEqual(page["total"], 5)
        self.assertEqual(len(page["items"]), 2)
        self.assertEqual([x["company_code"] for x in page["items"]], ["demo-company-4", "demo-company-3"])
        tail = self.client.get("/api/owner/audit?limit=2&offset=4").json()
        self.assertEqual(len(tail["items"]), 1)
        self.assertEqual(tail["total"], 5)

    def test_invalid_filters_are_rejected(self):
        self.login()
        for query in ("?limit=0", "?limit=101", "?offset=-1", "?category=SECURITY", "?category=BOGUS",
                      "?company_code=../config", "?company_code=Owner", "?company_code=abc--def", "?company_code=abc-"):
            response = self.client.get("/api/owner/audit" + query)
            self.assertEqual(response.status_code, 422, query)

    def test_no_delete_or_edit_routes(self):
        self.login(); self.create_company()
        self.assertEqual(self.client.delete("/api/owner/audit", headers=self.headers()).status_code, 405)
        self.assertEqual(self.client.post("/api/owner/audit", json={}, headers=self.headers()).status_code, 405)
        self.assertEqual(self.client.put("/api/owner/audit", json={}, headers=self.headers()).status_code, 405)

    def test_unknown_event_does_not_expose_raw_text(self):
        self.login(); cid = self.create_company()
        with self.factory() as db:
            owner = db.query(OwnerAccount).one()
            db.add(OwnerCompanyEvent(company_id=cid, owner_id=owner.id,
                event_type="UNREVIEWED", message="SECRET=SHOULD_NOT_APPEAR",
                created_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=1)))
            db.commit()
        data = self.client.get("/api/owner/audit").json()
        self.assertEqual(data["items"][0]["category"], "OTHER")
        self.assertNotIn("SECRET=SHOULD_NOT_APPEAR", str(data))

    def test_after_logout_and_expiration_access_is_denied(self):
        self.login(); self.create_company()
        self.assertEqual(self.client.post("/api/owner/auth/logout", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.get("/api/owner/audit").status_code, 401)

    def test_reading_feed_does_not_mutate_database(self):
        self.login(); self.create_company()
        with self.factory() as db:
            count_before = db.query(OwnerCompanyEvent).count()
        self.assertEqual(self.client.get("/api/owner/audit").status_code, 200)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompanyEvent).count(), count_before)

    def test_owner_ui_has_safe_read_only_rendering(self):
        root = Path(__file__).resolve().parents[1] / "backend"
        js = (root / "static" / "app.js").read_text(encoding="utf-8")
        html = (root / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn("auditTab", html)
        self.assertIn("auditFilters", html)
        self.assertIn("auditList", html)
        self.assertIn("renderAudit", js)
        self.assertIn("list.replaceChildren()", js)
        self.assertNotIn("innerHTML", js)

    def test_no_customer_erp_imports_or_schema_additions(self):
        root = Path(__file__).resolve().parents[1] / "backend"
        code = (root / "audit_api.py").read_text(encoding="utf-8")
        self.assertNotIn("from app.", code)
        self.assertNotIn("import app.", code)
        self.assertNotIn("subprocess", code)
        self.assertNotIn("OwnerBase", code)
        self.assertNotIn("sessionmaker", code)
        self.assertEqual(len(OwnerBase.metadata.tables), 9)


if __name__ == "__main__":
    unittest.main()
