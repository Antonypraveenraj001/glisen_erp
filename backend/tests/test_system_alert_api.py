"""Isolated Boss alert API security tests. SQLite only, never production MySQL.

Creates a minimal FastAPI application without the ERP startup/scheduler events.
"""

import unittest
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.v1.system_alerts import router
from app.database.base import Base
from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.role import Role
from app.models.system_alert import SystemAlert
from app.models.user import User
from app.services.system_alert_service import SystemAlertService


class SystemAlertAPITests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(
            self.engine,
            tables=[Role.__table__, User.__table__, SystemAlert.__table__],
        )
        self.db = Session(self.engine)
        boss_role = Role(name="Boss", description="Admin", is_active=True)
        staff_role = Role(name="Sales", description="Sales", is_active=True)
        self.db.add_all([boss_role, staff_role])
        self.db.flush()
        self.boss = User(
            full_name="Boss", username="boss_api", email="boss-api@example.test",
            password_hash="unused", role_id=boss_role.id, is_active=True,
        )
        self.staff = User(
            full_name="Staff", username="staff_api", email="staff-api@example.test",
            password_hash="unused", role_id=staff_role.id, is_active=True,
        )
        self.db.add_all([self.boss, self.staff])
        self.db.commit()
        self.boss_id, self.staff_id = self.boss.id, self.staff.id
        self.boss_role_id = boss_role.id

        self.app = FastAPI()
        self.app.include_router(router, prefix="/api/v1")
        # Override only the DB connection here; requests never contact MySQL.
        def fake_get_db():
            yield self.db
        self.app.dependency_overrides[get_db] = fake_get_db
        self.app.dependency_overrides[get_current_user] = (
            lambda: SimpleNamespace(id=self.boss_id)
        )
        self.client = TestClient(self.app)
        self.base = "/api/v1/system-alerts"

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def as_user(self, user_id):
        self.app.dependency_overrides[get_current_user] = (
            lambda: SimpleNamespace(id=user_id)
        )

    def create_alert(self):
        return SystemAlertService.record_failure(
            self.db,
            dedupe_key="BACKUP_SCHEDULE_FAILED:2026-10-14",
            category="BACKUP_SCHEDULE_FAILED", severity="CRITICAL",
            title="Scheduled backup failed",
            message="Backup storage is unavailable.",
        )

    def test_empty_list_and_count_for_boss(self):
        listing = self.client.get(self.base)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json(), [])
        response = self.client.get(self.base + "/unacknowledged-count")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"unacknowledged_count": 0})

    def test_boss_lists_and_counts_alert(self):
        self.create_alert()
        listed = self.client.get(self.base)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)
        row = listed.json()[0]
        self.assertEqual(row["severity"], "CRITICAL")
        self.assertEqual(row["occurrence_count"], 1)
        self.assertEqual(row["message"], "Backup storage is unavailable.")
        self.assertTrue(row["first_occurred_at"].endswith("Z"))
        self.assertNotIn("dedupe_key", row)
        self.assertEqual(self.client.get(
            self.base + "/unacknowledged-count"
        ).json()["unacknowledged_count"], 1)

    def test_acknowledge_and_repeat_is_idempotent(self):
        alert = self.create_alert()
        endpoint = f"{self.base}/{alert.id}/acknowledge"
        first = self.client.post(endpoint)
        second = self.client.post(endpoint)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertIsNotNone(first.json()["acknowledged_at"])
        self.assertEqual(first.json()["acknowledged_by_id"], self.boss_id)
        self.assertEqual(first.json()["acknowledged_at"], second.json()["acknowledged_at"])
        self.assertEqual(self.client.get(
            self.base + "/unacknowledged-count"
        ).json()["unacknowledged_count"], 0)

    def test_missing_alert_returns_404_for_boss(self):
        self.assertEqual(self.client.post(
            self.base + "/999/acknowledge"
        ).status_code, 404)

    def test_staff_cannot_list_count_or_acknowledge(self):
        alert = self.create_alert()
        self.as_user(self.staff_id)
        for response in (
            self.client.get(self.base),
            self.client.get(self.base + "/unacknowledged-count"),
            self.client.post(f"{self.base}/{alert.id}/acknowledge"),
        ):
            self.assertEqual(response.status_code, 403)

    def test_inactive_boss_and_inactive_role_denied(self):
        self.create_alert()
        boss = self.db.get(User, self.boss_id)
        boss.is_active = False
        self.db.commit()
        self.assertEqual(self.client.get(self.base).status_code, 403)
        boss.is_active = True
        self.db.get(Role, self.boss_role_id).is_active = False
        self.db.commit()
        self.assertEqual(self.client.get(self.base).status_code, 403)

    def test_unauthenticated_request_returns_401(self):
        # Real auth dependency has an OAuth bearer guard: no token -> 401.
        self.app.dependency_overrides.pop(get_current_user)
        self.assertEqual(self.client.get(self.base).status_code, 401)

    def test_invalid_limit_returns_422(self):
        self.assertEqual(self.client.get(self.base + "?limit=0").status_code, 422)
        self.assertEqual(self.client.get(self.base + "?limit=201").status_code, 422)

    def test_all_routes_present_in_openapi(self):
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn(self.base, paths)
        self.assertIn(self.base + "/unacknowledged-count", paths)
        self.assertIn(self.base + "/{alert_id}/acknowledge", paths)


if __name__ == "__main__":
    unittest.main()
