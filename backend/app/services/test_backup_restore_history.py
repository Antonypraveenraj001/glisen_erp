"""SQLite-only persistence tests: never open MySQL or trigger a restore."""

import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database.base import Base
from app.models.backup_restore_verification import BackupRestoreVerification
from app.services.backup_restore_history import (
    finish_restore_verification,
    start_restore_verification,
)


T0 = datetime(2026, 10, 11, 0, 0, tzinfo=timezone.utc)
TEST_DB = "glisen_verify_a1b2c3d4e5f6"


class RestoreHistoryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        # Only create the new audit table. No actual backup or business tables.
        Base.metadata.create_all(self.engine, tables=[BackupRestoreVerification.__table__])
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def start(self, slot=T0):
        return start_restore_verification(
            self.db,
            scheduled_slot_utc=slot,
            started_at_utc=slot + timedelta(minutes=2),
            backup_log_id=None,
        )

    def test_commits_running_before_trial(self):
        record = self.start()
        with Session(self.engine) as second:
            persisted = second.get(BackupRestoreVerification, record.id)
            self.assertEqual(persisted.status, "RUNNING")
            self.assertEqual(persisted.scheduled_slot_utc, T0.replace(tzinfo=None))

    def test_second_attempt_same_week_skipped(self):
        first = self.start()
        self.assertIsNone(self.start())
        self.assertEqual(self.db.query(BackupRestoreVerification).count(), 1)
        self.assertEqual(self.db.get(BackupRestoreVerification, first.id).status, "RUNNING")

    def test_passing_trial_persists_cleanup_and_tables(self):
        first = self.start()
        done = finish_restore_verification(
            self.db,
            verification_id=first.id,
            completed_at_utc=T0 + timedelta(minutes=10),
            succeeded=True,
            cleanup_completed=True,
            test_database_name=TEST_DB,
            table_count=31,
            schema_revision="t6v7w1x2y064",
        )
        self.assertEqual(done.status, "PASSED")
        self.assertTrue(done.cleanup_completed)
        self.assertEqual(done.table_count, 31)
        self.assertIsNone(done.error_message)

    def test_failed_trial_does_not_repeat_this_week(self):
        first = self.start()
        done = finish_restore_verification(
            self.db,
            verification_id=first.id,
            completed_at_utc=T0 + timedelta(minutes=5),
            succeeded=False,
            cleanup_completed=True,
            safe_error_message="Import failed in isolated test database.",
        )
        self.assertEqual(done.status, "FAILED")
        self.assertIsNone(self.start())

    def test_cleanup_failure_can_never_pass(self):
        first = self.start()
        done = finish_restore_verification(
            self.db,
            verification_id=first.id,
            completed_at_utc=T0 + timedelta(minutes=5),
            succeeded=True,
            cleanup_completed=False,
            table_count=31,
            test_database_name=TEST_DB,
        )
        self.assertEqual(done.status, "FAILED")
        self.assertFalse(done.cleanup_completed)

    def test_no_tables_can_never_pass(self):
        first = self.start()
        done = finish_restore_verification(
            self.db,
            verification_id=first.id,
            completed_at_utc=T0 + timedelta(minutes=5),
            succeeded=True,
            cleanup_completed=True,
            table_count=0,
        )
        self.assertEqual(done.status, "FAILED")

    def test_next_week_allowed_and_unchanged_first_row(self):
        first = self.start()
        next_record = self.start(T0 + timedelta(days=7))
        self.assertNotEqual(first.id, next_record.id)
        self.assertEqual(self.db.query(BackupRestoreVerification).count(), 2)
        self.assertEqual(self.db.get(BackupRestoreVerification, first.id).status, "RUNNING")

    def test_reject_naive_timestamp_before_write(self):
        with self.assertRaises(ValueError):
            self.start(T0.replace(tzinfo=None))
        self.assertEqual(self.db.query(BackupRestoreVerification).count(), 0)

    def test_does_not_double_finish_record(self):
        first = self.start()
        args = dict(
            verification_id=first.id,
            completed_at_utc=T0 + timedelta(minutes=5),
            succeeded=False,
            cleanup_completed=None,
        )
        finish_restore_verification(self.db, **args)
        with self.assertRaises(ValueError):
            finish_restore_verification(self.db, **args)


if __name__ == "__main__":
    unittest.main()
