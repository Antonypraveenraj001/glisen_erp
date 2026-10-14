"""Isolated SQLite tests: no production DB, scheduler or web server."""

import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.role import Role
from app.models.system_alert import SystemAlert
from app.models.user import User
from app.services.system_alert_service import SystemAlertService


class SystemAlertServiceTests(unittest.TestCase):
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
        boss_role = Role(name="Boss", description="Full access", is_active=True)
        staff_role = Role(name="Sales", description="Sales", is_active=True)
        self.db.add_all([boss_role, staff_role])
        self.db.flush()
        boss = User(
            full_name="Boss Test", username="boss_test", email="boss@example.test",
            password_hash="test-not-a-real-hash", role_id=boss_role.id, is_active=True,
        )
        staff = User(
            full_name="Staff Test", username="staff_test", email="staff@example.test",
            password_hash="test-not-a-real-hash", role_id=staff_role.id, is_active=True,
        )
        self.db.add_all([boss, staff])
        self.db.commit()
        self.boss_id, self.staff_id = boss.id, staff.id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def failure(self, **overrides):
        fields = dict(
            dedupe_key="backup:scheduled:2026-10-14",
            category="BACKUP_SCHEDULE_FAILED",
            title="Scheduled backup failed",
            message="The primary backup storage is unavailable.",
            severity="CRITICAL",
        )
        fields.update(overrides)
        return SystemAlertService.record_failure(self.db, **fields)

    def test_first_failure_is_persistent(self):
        alert = self.failure()
        self.assertEqual(alert.occurrence_count, 1)
        self.assertEqual(alert.severity, "CRITICAL")
        self.assertIsNone(alert.acknowledged_at)
        self.assertEqual(SystemAlertService.unacknowledged_count(
            self.db, boss_user_id=self.boss_id
        ), 1)
        self.assertEqual(len(SystemAlertService.recent_for_boss(
            self.db, boss_user_id=self.boss_id
        )), 1)

    def test_retries_are_deduplicated_and_counted(self):
        first = self.failure()
        second = self.failure(message="Retry failed: storage still unavailable")
        self.assertEqual(first.id, second.id)
        self.assertEqual(second.occurrence_count, 2)
        self.assertEqual(self.db.query(SystemAlert).count(), 1)

    def test_only_active_boss_can_view_or_acknowledge(self):
        alert = self.failure()
        with self.assertRaises(PermissionError):
            SystemAlertService.recent_for_boss(
                self.db, boss_user_id=self.staff_id
            )
        with self.assertRaises(PermissionError):
            SystemAlertService.acknowledge(
                self.db, alert_id=alert.id, boss_user_id=self.staff_id
            )
        acknowledged = SystemAlertService.acknowledge(
            self.db, alert_id=alert.id, boss_user_id=self.boss_id
        )
        self.assertEqual(acknowledged.acknowledged_by_id, self.boss_id)
        self.assertEqual(SystemAlertService.unacknowledged_count(
            self.db, boss_user_id=self.boss_id
        ), 0)
        self.db.get(User, self.boss_id).is_active = False
        self.db.commit()
        with self.assertRaises(PermissionError):
            SystemAlertService.recent_for_boss(
                self.db, boss_user_id=self.boss_id
            )

    def test_retry_after_acknowledgement_remains_acknowledged(self):
        alert = self.failure()
        SystemAlertService.acknowledge(
            self.db, alert_id=alert.id, boss_user_id=self.boss_id
        )
        latest = self.failure()
        self.assertEqual(latest.occurrence_count, 2)
        self.assertIsNotNone(latest.acknowledged_at)

    def test_recovery_and_new_failure_reopen_alert(self):
        alert = self.failure()
        SystemAlertService.acknowledge(
            self.db, alert_id=alert.id, boss_user_id=self.boss_id
        )
        self.assertTrue(SystemAlertService.resolve(
            self.db, dedupe_key=alert.dedupe_key
        ))
        self.assertFalse(SystemAlertService.resolve(
            self.db, dedupe_key=alert.dedupe_key
        ))
        new = self.failure()
        self.assertEqual(new.id, alert.id)
        self.assertIsNone(new.resolved_at)
        self.assertIsNone(new.acknowledged_at)
        self.assertEqual(SystemAlertService.unacknowledged_count(
            self.db, boss_user_id=self.boss_id
        ), 1)

    def test_different_day_creates_new_incident(self):
        self.failure()
        self.failure(dedupe_key="backup:scheduled:2026-10-15")
        self.assertEqual(self.db.query(SystemAlert).count(), 2)

    def test_validation_and_utc_time(self):
        with self.assertRaises(ValueError):
            self.failure(message="")
        with self.assertRaises(ValueError):
            self.failure(severity="NOT_ALLOWED")
        alert = self.failure(occurred_at=datetime(
            2026, 10, 14, 8, 0, tzinfo=timezone.utc
        ))
        self.assertEqual(alert.first_occurred_at, datetime(2026, 10, 14, 8, 0))


if __name__ == "__main__":
    unittest.main()
