"""Step 180B/180K: isolated HTTP/database security integration tests.

All tests use SQLite in memory. NO company ERP or live MySQL connections.
"""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from platform_owner.backend.app import create_app
from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.models import OwnerAccount, OwnerLoginThrottle, OwnerSession
from platform_owner.backend.security import digest, hash_password, now_utc, verify_password
from platform_owner.backend.settings import OwnerSettings


EMAIL = "hrglobalinfo198@gmail.com"
PASSWORD = "VeryStrongOwner!2026"
NEW_PASSWORD = "AnotherStrongOwner!2027"
ORIGIN = "http://127.0.0.1:8100"


def fake_settings(*, environment="development", origin=ORIGIN, db_name="castle_owner_unit_tests"):
    return OwnerSettings(
        environment=environment,
        origin=origin,
        db_host="127.0.0.1",
        db_port=3306,
        db_name=db_name,
        db_user="castle_owner_test",
        db_password="NOT_REAL_SQLITE_TEST_PASSWORD",
        owner_email=EMAIL,
        session_minutes=30,
    )


class OwnerSecurityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        OwnerBase.metadata.create_all(self.engine)
        self.db_factory = sessionmaker(self.engine, expire_on_commit=False)
        self.settings = fake_settings()
        self.app = create_app(self.settings, session_factory=self.db_factory)
        self.client = TestClient(self.app, base_url=ORIGIN)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)
        with self.db_factory() as db:
            bootstrap_first_owner(db, EMAIL, PASSWORD)

    def login(self, email=EMAIL, password=PASSWORD, headers=None):
        return self.client.post(
            "/api/owner/auth/login",
            json={"email": email, "password": password},
            headers=headers or {"Origin": ORIGIN},
        )

    def csrf_headers(self):
        value = self.client.cookies.get("castle_owner_dev_csrf")
        self.assertTrue(value)
        return {"Origin": ORIGIN, "x-csrf-token": value}

    def test_owner_database_name_and_separate_user_are_required(self):
        with self.assertRaises(ValueError):
            fake_settings(db_name="glisen_erp").validate()
        bad = fake_settings()
        bad = OwnerSettings(**{**bad.__dict__, "db_user": "glisen_app"})
        with self.assertRaises(ValueError):
            bad.validate()

    def test_dev_requires_loopback_and_prod_requires_https(self):
        with self.assertRaises(ValueError):
            fake_settings(origin="http://192.168.1.4:8100").validate()
        with self.assertRaises(ValueError):
            fake_settings(environment="production").validate()
        good = fake_settings(environment="production", origin="https://owner.castleapr.com")
        good.validate()
        self.assertTrue(good.secure_cookies)
        self.assertTrue(good.session_cookie.startswith("__Host-"))

    def test_password_hash_is_salted_and_no_plaintext(self):
        one, two = hash_password(PASSWORD), hash_password(PASSWORD)
        self.assertNotEqual(one, two)
        self.assertNotIn(PASSWORD, one)
        self.assertTrue(verify_password(PASSWORD, one))
        self.assertFalse(verify_password("incorrect", one))
        with self.assertRaises(ValueError):
            hash_password("weakpassword")

    def test_bootstrap_refuses_second_owner(self):
        with self.db_factory() as db, self.assertRaises(RuntimeError):
            bootstrap_first_owner(db, "second@example.com", NEW_PASSWORD)
        with self.db_factory() as db:
            self.assertEqual(db.query(OwnerAccount).count(), 1)

    def test_no_signup_route_and_no_unauthenticated_access(self):
        self.assertEqual(self.client.post("/api/owner/auth/register", json={}).status_code, 404)
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 401)
        self.assertEqual(self.client.get("/api/owner/health").status_code, 200)

    def test_login_rejects_cross_origin_and_invalid_credentials(self):
        self.assertEqual(self.login(headers={"Origin": "https://bad.example"}).status_code, 403)
        self.assertEqual(self.login(password="incorrect").status_code, 401)
        self.assertFalse(self.client.cookies.get("castle_owner_dev_session"))

    def test_login_lockout_persists_in_database(self):
        for attempt in range(5):
            response = self.login(password="incorrect")
            self.assertEqual(response.status_code, 401, attempt)
        self.assertEqual(self.login().status_code, 429)
        with self.db_factory() as db:
            self.assertEqual(db.query(OwnerLoginThrottle).count(), 1)

    def test_login_sets_private_session_not_erp_jwt(self):
        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        cookie = response.headers.get("set-cookie", "")
        self.assertIn("httponly", cookie.lower())
        self.assertIn("samesite=strict", cookie.lower())
        raw = self.client.cookies.get("castle_owner_dev_session")
        self.assertTrue(raw)
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 200)
        with self.db_factory() as db:
            record = db.query(OwnerSession).one()
            self.assertEqual(record.token_hash, digest(raw))
            self.assertNotEqual(record.token_hash, raw)
        self.assertIn("no-store", self.client.get("/").headers["cache-control"])

    def test_csrf_and_origin_required_for_logout(self):
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(
            self.client.post("/api/owner/auth/logout", headers={"Origin": ORIGIN}).status_code, 403
        )
        headers = self.csrf_headers()
        self.assertEqual(
            self.client.post("/api/owner/auth/logout", headers={"Origin": "https://evil.example", "x-csrf-token": headers["x-csrf-token"]}).status_code, 403
        )
        self.assertEqual(self.client.post("/api/owner/auth/logout", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 401)

    def test_password_change_revokes_all_sessions(self):
        self.assertEqual(self.login().status_code, 200)
        other = TestClient(self.app, base_url=ORIGIN)
        self.addCleanup(other.close)
        self.assertEqual(
            other.post("/api/owner/auth/login", json={"email": EMAIL, "password": PASSWORD}, headers={"Origin": ORIGIN}).status_code, 200
        )
        response = self.client.post("/api/owner/auth/change-password", json={"current_password": PASSWORD, "new_password": NEW_PASSWORD}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 401)
        self.assertEqual(other.get("/api/owner/auth/me").status_code, 401)
        self.assertEqual(self.login(password=PASSWORD).status_code, 401)
        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, 200)

    def test_expired_session_is_rejected(self):
        self.assertEqual(self.login().status_code, 200)
        with self.db_factory() as db:
            record = db.query(OwnerSession).one()
            record.expires_at = now_utc() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 401)

    def test_owner_files_do_not_import_company_app(self):
        root = Path(__file__).resolve().parents[1] / "backend"
        for path in root.glob("*.py"):
            source = path.read_text(encoding="utf-8")
            self.assertNotIn("from app.", source)
            self.assertNotIn("import app.", source)


if __name__ == "__main__":
    unittest.main()
