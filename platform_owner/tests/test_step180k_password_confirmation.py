"""Step 180K: repeat-new-password confirmation for the independent owner login.

Only in-memory SQLite is used. Never loads platform_owner/.env or live MySQL.
"""

from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from platform_owner.backend.app import create_app
from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.models import OwnerAccount, OwnerSession
from platform_owner.backend.security import verify_password
from platform_owner.backend.settings import OwnerSettings

ORIGIN = "http://127.0.0.1:8100"
EMAIL = "hrglobalinfo198@gmail.com"
OLD = "StrongOldOwner!2026"
NEW = "StrongNewOwner!2027"


class OwnerConfirmPasswordTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        OwnerBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine, expire_on_commit=False)
        self.addCleanup(self.engine.dispose)
        settings = OwnerSettings(
            environment="development", origin=ORIGIN,
            db_host="127.0.0.1", db_port=3306,
            db_name="castle_owner_confirmation_tests", db_user="castle_owner_tests",
            db_password="TEST_ONLY_NOT_MYSQL_PASSWORD", owner_email=EMAIL,
            session_minutes=30,
        )
        self.client = TestClient(create_app(settings, session_factory=self.factory), base_url=ORIGIN)
        self.addCleanup(self.client.close)
        with self.factory() as db:
            bootstrap_first_owner(db, EMAIL, OLD)
        result = self.client.post(
            "/api/owner/auth/login",
            json={"email": EMAIL, "password": OLD},
            headers={"Origin": ORIGIN},
        )
        self.assertEqual(result.status_code, 200, result.text)

    def headers(self):
        return {
            "Origin": ORIGIN,
            "x-csrf-token": self.client.cookies.get("castle_owner_dev_csrf"),
        }

    def change(self, **overrides):
        payload = {
            "current_password": OLD,
            "new_password": NEW,
            "confirm_new_password": NEW,
        }
        payload.update(overrides)
        return self.client.post(
            "/api/owner/auth/change-password", json=payload, headers=self.headers()
        )

    def test_ui_has_required_confirmation_field_and_browser_validation(self):
        static = Path(__file__).resolve().parents[1] / "backend" / "static"
        markup = (static / "index.html").read_text(encoding="utf-8")
        script = (static / "app.js").read_text(encoding="utf-8")
        self.assertIn('<label for="confirmNewPassword">Confirm new password</label>', markup)
        self.assertIn('id="confirmNewPassword" type="password" autocomplete="new-password" minlength="14" required', markup)
        self.assertIn('byId("newPassword").value !== confirmation.value', script)
        self.assertIn('confirmation.reportValidity()', script)
        self.assertIn('confirm_new_password: confirmation.value', script)
        self.assertLess(script.index('byId("newPassword").value !== confirmation.value'), script.index('await api("auth/change-password"'))

    def test_missing_confirmation_is_rejected_without_changing_password(self):
        result = self.client.post(
            "/api/owner/auth/change-password",
            json={"current_password": OLD, "new_password": NEW},
            headers=self.headers(),
        )
        self.assertEqual(result.status_code, 422)
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 200)
        with self.factory() as db:
            self.assertTrue(verify_password(OLD, db.query(OwnerAccount).one().password_hash))
            self.assertEqual(db.query(OwnerSession).count(), 1)

    def test_mismatched_confirmation_is_rejected_without_revoking_session(self):
        result = self.change(confirm_new_password="MismatchedOwner!2027")
        self.assertEqual(result.status_code, 422, result.text)
        self.assertIn("do not match", result.json()["detail"])
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 200)
        with self.factory() as db:
            self.assertTrue(verify_password(OLD, db.query(OwnerAccount).one().password_hash))
            self.assertEqual(db.query(OwnerSession).count(), 1)

    def test_invalid_current_password_cannot_change_password(self):
        result = self.change(current_password="WrongOldOwner!2026")
        self.assertEqual(result.status_code, 401)
        with self.factory() as db:
            self.assertTrue(verify_password(OLD, db.query(OwnerAccount).one().password_hash))

    def test_matching_confirmation_changes_password_and_revokes_session(self):
        result = self.change()
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.client.get("/api/owner/auth/me").status_code, 401)
        with self.factory() as db:
            self.assertTrue(verify_password(NEW, db.query(OwnerAccount).one().password_hash))
            self.assertEqual(db.query(OwnerSession).count(), 0)
        self.assertEqual(self.client.post(
            "/api/owner/auth/login", json={"email": EMAIL, "password": NEW},
            headers={"Origin": ORIGIN},
        ).status_code, 200)


if __name__ == "__main__":
    unittest.main()
