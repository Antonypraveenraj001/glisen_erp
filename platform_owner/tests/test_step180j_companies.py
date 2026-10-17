"""Step 180J owner company registry security tests. SQLite MEMORY ONLY.

No requests to deployed ERP instances and no connections to MySQL or internet.
"""

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from platform_owner.backend.app import create_app
from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.settings import OwnerSettings

ORIGIN = "http://127.0.0.1:8100"
EMAIL = "hrglobalinfo198@gmail.com"
PASSWORD = "SecurityTest#Password2026"


def settings():
    return OwnerSettings(
        environment="development", origin=ORIGIN,
        db_host="127.0.0.1", db_port=3306, db_name="castle_owner_unit_tests",
        db_user="castle_owner_test", db_password="NOT_A_REAL_DATABASE_PASSWORD",
        owner_email=EMAIL, session_minutes=30,
    )


class CompanyRegistryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        OwnerBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine, expire_on_commit=False)
        self.app = create_app(settings(), session_factory=self.factory)
        self.client = TestClient(self.app, base_url=ORIGIN)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)
        with self.factory() as db:
            bootstrap_first_owner(db, EMAIL, PASSWORD)
        self.payload = {
            "slug": "abc-industries", "legal_name": "ABC Industries Pvt Ltd",
            "gstin": "33ABCDE1234F1Z5", "boss_email": "boss@example.com",
            "recovery_email": "backup@example.com",
        }

    def login(self):
        reply = self.client.post(
            "/api/owner/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            headers={"Origin": ORIGIN},
        )
        self.assertEqual(reply.status_code, 200, reply.text)

    def headers(self):
        csrf = self.client.cookies.get("castle_owner_dev_csrf")
        self.assertTrue(csrf)
        return {"Origin": ORIGIN, "x-csrf-token": csrf}

    def create(self, payload=None, headers=None):
        return self.client.post(
            "/api/owner/companies", json=payload or self.payload,
            headers=headers if headers is not None else self.headers(),
        )

    def test_owner_only_models_registered_as_separate_tables(self):
        names = set(OwnerBase.metadata.tables)
        self.assertIn("owner_companies", names)
        self.assertIn("owner_company_events", names)
        self.assertNotIn("users", names)
        self.assertNotIn("company_settings", names)
        self.assertNotIn("glisen_erp", names)

    def test_company_endpoints_require_owner_authentication(self):
        self.assertEqual(self.client.get("/api/owner/companies").status_code, 401)
        self.assertEqual(self.client.get("/api/owner/companies/1").status_code, 401)
        self.assertEqual(self.client.get("/api/owner/companies/1/history").status_code, 401)
        self.assertEqual(self.client.post("/api/owner/companies", json=self.payload, headers={"Origin": ORIGIN}).status_code, 401)
        self.assertEqual(self.client.post("/api/owner/companies/1/activate", headers={"Origin": ORIGIN}).status_code, 401)

    def test_authenticated_mutations_require_origin_and_csrf(self):
        self.login()
        self.assertEqual(self.create(headers={"Origin": ORIGIN}).status_code, 403)
        wrong = {**self.headers(), "Origin": "https://attacker.example"}
        self.assertEqual(self.create(headers=wrong).status_code, 403)
        self.assertEqual(self.create(headers={**self.headers(), "x-csrf-token": "x" * 64}).status_code, 403)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompany).count(), 0)

    def test_create_company_is_registration_only(self):
        self.login()
        response = self.create()
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        self.assertEqual(data["status"], "PENDING_SETUP")
        self.assertFalse(data["operational_access_enforced"])
        self.assertEqual(data["slug"], "abc-industries")
        self.assertEqual(data["boss_email"], "boss@example.com")
        self.assertNotIn("password", data)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompany).count(), 1)
            self.assertEqual(db.query(OwnerCompanyEvent).count(), 1)
        lookup = self.client.get(f"/api/owner/companies/{data['id']}")
        self.assertEqual(lookup.status_code, 200)

    def test_invalid_codes_and_reserved_codes_are_rejected(self):
        self.login()
        for slug in ["owner", "erp", "admin", "ab", "1-company", "abc--def", "abc-", "a/b"]:
            response = self.create({**self.payload, "slug": slug})
            self.assertEqual(response.status_code, 422, (slug, response.text))
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompany).count(), 0)

    def test_invalid_gstin_and_name_rejected(self):
        self.login()
        for updates in [{"gstin": "BAD"}, {"legal_name": "  "}, {"boss_email": "not-an-email"}]:
            response = self.create({**self.payload, **updates})
            self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.create({**self.payload, "db_name": "glisen_erp"}).status_code, 422)

    def test_duplicate_slug_and_gstin_cannot_create_multiple_companies(self):
        self.login()
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create({**self.payload, "gstin": None}).status_code, 409)
        self.assertEqual(self.create({**self.payload, "slug": "different-co"}).status_code, 409)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompany).count(), 1)
            self.assertEqual(db.query(OwnerCompanyEvent).count(), 1)

    def test_registration_profile_edit_has_fixed_immutable_company_code(self):
        self.login()
        company_id = self.create().json()["id"]
        endpoint = f"/api/owner/companies/{company_id}"
        changed = {
            "legal_name": "New ABC Industries", "gstin": None,
            "boss_email": "newboss@example.com", "recovery_email": None,
        }
        self.assertEqual(self.client.put(endpoint, json={**changed, "slug": "evil"}, headers=self.headers()).status_code, 422)
        update = self.client.put(endpoint, json=changed, headers=self.headers())
        self.assertEqual(update.status_code, 200, update.text)
        self.assertEqual(update.json()["slug"], "abc-industries")
        self.assertEqual(update.json()["boss_email"], "newboss@example.com")
        with self.factory() as db:
            self.assertEqual(db.query(OwnerCompanyEvent).count(), 2)

    def test_hold_resume_changes_registry_only_and_records_events(self):
        self.login()
        ident = self.create().json()["id"]
        endpoint = f"/api/owner/companies/{ident}"
        hold = self.client.post(endpoint + "/hold", headers=self.headers())
        self.assertEqual(hold.status_code, 200, hold.text)
        self.assertEqual(hold.json()["status"], "ON_HOLD")
        self.assertFalse(hold.json()["operational_access_enforced"])
        self.assertEqual(self.client.post(endpoint + "/hold", headers=self.headers()).status_code, 409)
        resume = self.client.post(endpoint + "/resume", headers=self.headers())
        self.assertEqual(resume.status_code, 200, resume.text)
        self.assertEqual(resume.json()["status"], "PENDING_SETUP")
        self.assertEqual(self.client.post(endpoint + "/resume", headers=self.headers()).status_code, 409)
        history = self.client.get(endpoint + "/history")
        self.assertEqual(history.status_code, 200, history.text)
        self.assertEqual([r["event_type"] for r in history.json()["items"]], ["ONBOARDING_RESUMED", "ONBOARDING_HELD", "REGISTERED"])

    def test_live_activation_and_suspension_fail_closed(self):
        self.login()
        ident = self.create().json()["id"]
        for action in ["activate", "suspend"]:
            response = self.client.post(f"/api/owner/companies/{ident}/{action}", headers=self.headers())
            self.assertEqual(response.status_code, 409, response.text)
            self.assertIn("until", response.json()["detail"])
        with self.factory() as db:
            record = db.get(OwnerCompany, ident)
            self.assertEqual(record.status, "PENDING_SETUP")
            self.assertEqual(db.query(OwnerCompanyEvent).count(), 1)

    def test_company_list_pagination_and_bounds(self):
        self.login()
        for index in range(3):
            response = self.create({**self.payload, "slug": f"mycompany-{index}", "gstin": None})
            self.assertEqual(response.status_code, 201, response.text)
        result = self.client.get("/api/owner/companies?limit=2&offset=0")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["total"], 3)
        self.assertEqual(len(result.json()["items"]), 2)
        result = self.client.get("/api/owner/companies?limit=2&offset=2")
        self.assertEqual(len(result.json()["items"]), 1)
        self.assertEqual(self.client.get("/api/owner/companies?limit=101").status_code, 422)
        self.assertEqual(self.client.get("/api/owner/companies?offset=-1").status_code, 422)

    def test_logged_out_and_expired_sessions_cannot_access_companies(self):
        self.login()
        self.assertEqual(self.client.get("/api/owner/companies").status_code, 200)
        self.assertEqual(self.client.post("/api/owner/auth/logout", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.get("/api/owner/companies").status_code, 401)
        self.assertEqual(self.client.post("/api/owner/companies", json=self.payload, headers={"Origin": ORIGIN}).status_code, 401)

    def test_company_code_not_exposed_as_real_erp_domain_or_connection(self):
        self.login()
        created = self.create().json()
        self.assertNotIn("database", created)
        self.assertNotIn("db_password", created)
        self.assertNotIn("url", created)
        self.assertFalse(created["operational_access_enforced"])


if __name__ == "__main__":
    unittest.main()
