"""Isolated tests for scheduler SSD/HDD reconciliation (no real database or disk).

Run from the Glisen ERP backend directory using its virtualenv:
    python -m unittest discover -s app/services -p test_backup_scheduler_sync.py -v
"""

import unittest
from contextlib import ExitStack
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.core.config import settings
from app.services import backup_scheduler as scheduler


class SchedulerSyncTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.fake_db = Mock(name="fake_db")
        self.fake_db.query.return_value.first.return_value = None
        self.open_session = self.stack.enter_context(
            patch.object(scheduler, "SessionLocal", return_value=self.fake_db)
        )
        self.sync = self.stack.enter_context(
            patch.object(scheduler.BackupFallbackSync, "sync_pending", return_value={
                "synced": 1, "failed": 0, "skipped": 0, "errors": []
            })
        )
        self.logger = self.stack.enter_context(patch.object(scheduler, "_log"))
        self.stack.enter_context(
            patch.object(scheduler.BackupService, "RESTORE_IN_PROGRESS", False)
        )
        for name, value in (
            ("BACKUP_HDD_MOUNT_POINT", "/mnt/glisen-backups"),
            ("BACKUP_HDD_UUID", "27efb529-a6e4-469f-a0f0-1bd9f46dd31c"),
            ("BACKUP_SSD_FALLBACK_FOLDER", "/tmp/glisen-backup-fallback"),
        ):
            self.stack.enter_context(patch.object(settings, name, value))

    def test_feature_off_skips_database_and_sync(self):
        with patch.object(settings, "BACKUP_HDD_MOUNT_POINT", ""), \
             patch.object(settings, "BACKUP_HDD_UUID", ""), \
             patch.object(settings, "BACKUP_SSD_FALLBACK_FOLDER", ""):
            scheduler._sync_fallback_backups_once()
        self.open_session.assert_not_called()
        self.sync.assert_not_called()

    def test_incomplete_configuration_skips_database_and_sync(self):
        with patch.object(settings, "BACKUP_HDD_UUID", ""):
            scheduler._sync_fallback_backups_once()
        self.open_session.assert_not_called()
        self.sync.assert_not_called()
        self.logger.assert_called()

    def test_active_restore_skips_database_and_sync(self):
        with patch.object(scheduler.BackupService, "RESTORE_IN_PROGRESS", True):
            scheduler._sync_fallback_backups_once()
        self.open_session.assert_not_called()
        self.sync.assert_not_called()

    def test_persistent_restore_flag_skips_sync(self):
        self.fake_db.query.return_value.first.return_value = SimpleNamespace(
            restore_in_progress=True, year_transition_in_progress=False
        )
        scheduler._sync_fallback_backups_once()
        self.sync.assert_not_called()
        self.fake_db.close.assert_called_once()

    def test_financial_year_transition_flag_skips_sync(self):
        self.fake_db.query.return_value.first.return_value = SimpleNamespace(
            restore_in_progress=False, year_transition_in_progress=True
        )
        scheduler._sync_fallback_backups_once()
        self.sync.assert_not_called()
        self.fake_db.close.assert_called_once()

    def test_ready_system_runs_sync_and_closes_session(self):
        scheduler._sync_fallback_backups_once()
        self.sync.assert_called_once_with(db=self.fake_db, max_records=10)
        self.fake_db.close.assert_called_once()

    def test_sync_failure_still_closes_database_session(self):
        self.sync.side_effect = RuntimeError("simulated HDD failure")
        with self.assertRaisesRegex(RuntimeError, "simulated HDD failure"):
            scheduler._sync_fallback_backups_once()
        self.fake_db.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
