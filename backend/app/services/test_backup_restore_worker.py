"""SQLite-only tests for weekly restore worker. No MySQL or subprocess calls."""

from __future__ import annotations

import threading
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database.base import Base
from app.models.backup import BackupLog
from app.models.backup_restore_verification import BackupRestoreVerification
from app.services.backup_restore_schedule import WeeklyRestorePolicy
from app.services.backup_restore_trial import RestoreTrialResult
from app.services import backup_restore_worker as worker


NOW = datetime.now(timezone.utc) - timedelta(minutes=1)
POLICY = WeeklyRestorePolicy(enabled=True)
PROD = SimpleNamespace(DB_USER="glisen_app", DB_NAME="glisen_erp", DB_HOST="localhost", DB_PORT=3306)


class WeeklyRestoreWorkerTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine, tables=[BackupLog.__table__, BackupRestoreVerification.__table__])
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.state_patch = patch.object(worker, "_system_busy", return_value=False)
        self.state_patch.start()
        self.addCleanup(self.state_patch.stop)
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.archive = Path(self.tmp.name) / "backup.zip"
        self.archive.write_bytes(b"simulated")
        self.runner = Mock(return_value=RestoreTrialResult(
            test_database="glisen_verify_a1b2c3d4e5f6", table_count=18,
            schema_revision="t6v7w1x2y064", cleanup_completed=True))
        self.locator = Mock(return_value=self.archive)

    def backup(self, *, age_days=1, status="VERIFIED"):
        row = BackupLog(
            backup_type="AUTOMATIC", filename="sample.zip", status=status,
            started_at=(NOW - timedelta(days=age_days)).replace(tzinfo=None),
            checksum_sha256="a" * 64,
            primary_path=str(self.archive),
        )
        self.db.add(row)
        self.db.commit()
        return row

    def run_worker(self, *, now=NOW, policy=POLICY, user="glisen_test", password="fake-secret"):
        return worker.run_weekly_restore_verification_once(
            self.db, now_utc=now, policy=policy, test_user=user,
            test_password=password, trial_runner=self.runner,
            archive_locator=self.locator, production_config=PROD,
        )

    def records(self):
        return self.db.query(BackupRestoreVerification).all()

    def test_disabled_does_not_create_history_or_touch_mysql(self):
        self.backup()
        self.assertEqual(self.run_worker(policy=WeeklyRestorePolicy()), "DISABLED")
        self.assertEqual(len(self.records()), 0)
        self.runner.assert_not_called()

    def test_success_persists_pass_without_mutating_backup_log(self):
        original = self.backup()
        self.assertEqual(self.run_worker(), "PASSED")
        row = self.records()[0]
        self.assertEqual(row.status, "PASSED")
        self.assertEqual(row.backup_log_id, original.id)
        self.assertEqual(row.table_count, 18)
        self.assertTrue(row.cleanup_completed)
        self.db.refresh(original)
        self.assertEqual(original.status, "VERIFIED")
        self.runner.assert_called_once()

    def test_same_week_not_run_twice(self):
        self.backup()
        self.assertEqual(self.run_worker(), "PASSED")
        self.assertEqual(self.run_worker(), "ALREADY_ATTEMPTED")
        self.assertEqual(len(self.records()), 1)
        self.runner.assert_called_once()

    def test_no_recent_archive_records_failure_without_restore(self):
        self.backup(age_days=12)
        self.assertEqual(self.run_worker(), "FAILED")
        self.assertIsNone(self.records()[0].backup_log_id)
        self.runner.assert_not_called()

    def test_missing_test_credentials_failed_without_mysql(self):
        self.backup()
        self.assertEqual(self.run_worker(password=""), "FAILED")
        self.assertIn("credentials", self.records()[0].error_message)
        self.runner.assert_not_called()

    def test_production_account_never_used(self):
        self.backup()
        self.assertEqual(self.run_worker(user="glisen_app"), "FAILED")
        self.runner.assert_not_called()

    def test_trial_error_is_sanitized_and_week_consumed(self):
        self.backup()
        self.runner.side_effect = RuntimeError("Import failure: MYSQL_PWD=very-secret")
        self.assertEqual(self.run_worker(), "FAILED")
        self.assertNotIn("very-secret", self.records()[0].error_message)
        self.assertEqual(self.run_worker(), "ALREADY_ATTEMPTED")

    def test_cleanup_error_never_passes(self):
        self.backup()
        self.runner.side_effect = RuntimeError("Restore-test cleanup failed for temporary schema glisen_verify_a1b2c3d4e5f6")
        self.assertEqual(self.run_worker(), "FAILED")
        self.assertFalse(self.records()[0].cleanup_completed)

    def test_restore_in_progress_skips_history(self):
        self.backup()
        with patch.object(worker, "_system_busy", return_value=True):
            self.assertEqual(self.run_worker(), "BUSY")
        self.assertEqual(len(self.records()), 0)
        self.runner.assert_not_called()

    def test_backup_lock_in_use_skips_attempt(self):
        self.backup()
        acquired = worker.BackupService.BACKUP_LOCK.acquire(blocking=False)
        self.assertTrue(acquired)
        try:
            self.assertEqual(self.run_worker(), "BUSY")
        finally:
            worker.BackupService.BACKUP_LOCK.release()
        self.assertEqual(len(self.records()), 0)

    def test_bad_archive_locator_saves_failure(self):
        self.backup()
        self.locator.side_effect = ValueError("access to bad/path.zip denied")
        self.assertEqual(self.run_worker(), "FAILED")
        self.assertNotIn("bad/path", self.records()[0].error_message)
        self.runner.assert_not_called()


if __name__ == "__main__":
    unittest.main()
