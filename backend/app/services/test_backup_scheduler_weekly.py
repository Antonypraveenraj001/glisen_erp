"""No-MySQL scheduler integration checks for opt-in weekly restore verification.

Run from the backend directory using the Glisen ERP virtualenv:
    .\\venv\\Scripts\\python.exe -m unittest discover -s app/services -p test_backup_scheduler_weekly.py -v
"""
from __future__ import annotations

import ast
import inspect
import unittest
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from app.core.config import settings
from app.services import backup_scheduler as scheduler
from app.services import backup_restore_worker as worker


class WeeklySchedulerIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.db = Mock(name="simulated_session")
        self.session_patch = patch.object(scheduler, "SessionLocal", return_value=self.db)
        self.session = self.session_patch.start()
        self.addCleanup(self.session_patch.stop)
        self.worker_patch = patch.object(worker, "run_weekly_restore_verification_once", return_value="PASSED")
        self.run_worker = self.worker_patch.start()
        self.addCleanup(self.worker_patch.stop)
        self.log_patch = patch.object(scheduler, "_log")
        self.log = self.log_patch.start()
        self.addCleanup(self.log_patch.stop)
        for name, value in (
            ("BACKUP_WEEKLY_RESTORE_ENABLED", True),
            ("BACKUP_WEEKLY_RESTORE_TEST_USER", "glisen_test_only"),
            ("BACKUP_WEEKLY_RESTORE_TEST_PASSWORD", "fake-secret-never-log"),
        ):
            p = patch.object(settings, name, value)
            p.start()
            self.addCleanup(p.stop)
        restore_p = patch.object(scheduler.BackupService, "RESTORE_IN_PROGRESS", False)
        restore_p.start()
        self.addCleanup(restore_p.stop)

    def test_disabled_skips_all_database_access(self):
        with patch.object(settings, "BACKUP_WEEKLY_RESTORE_ENABLED", False):
            scheduler._run_weekly_restore_verification_once()
        self.session.assert_not_called()
        self.run_worker.assert_not_called()
        self.log.assert_not_called()

    def test_restore_in_progress_skips_worker_and_session(self):
        with patch.object(scheduler.BackupService, "RESTORE_IN_PROGRESS", True):
            scheduler._run_weekly_restore_verification_once()
        self.session.assert_not_called()
        self.run_worker.assert_not_called()

    def test_enabled_calls_worker_once_with_utc_and_restricted_test_credentials(self):
        scheduler._run_weekly_restore_verification_once()
        self.session.assert_called_once_with()
        self.run_worker.assert_called_once()
        args, kwargs = self.run_worker.call_args
        self.assertIs(args[0], self.db)
        self.assertIsInstance(kwargs["now_utc"], datetime)
        self.assertEqual(kwargs["now_utc"].tzinfo, timezone.utc)
        policy = kwargs["policy"]
        self.assertTrue(policy.enabled)
        self.assertEqual((policy.weekday, policy.hour, policy.minute, policy.utc_offset_minutes), (6, 3, 0, 330))
        self.assertEqual(kwargs["test_user"], "glisen_test_only")
        self.assertEqual(kwargs["test_password"], "fake-secret-never-log")
        self.db.close.assert_called_once()

    def test_result_logs_only_safe_status_without_secrets(self):
        scheduler._run_weekly_restore_verification_once()
        self.assertEqual(self.log.call_count, 1)
        self.assertIn("PASSED", self.log.call_args.args[0])
        self.assertNotIn("fake-secret", str(self.log.call_args_list))
        self.assertNotIn("glisen_test_only", str(self.log.call_args_list))

    def test_failure_status_is_logged_and_session_closed(self):
        self.run_worker.return_value = "FAILED"
        scheduler._run_weekly_restore_verification_once()
        self.db.close.assert_called_once()
        self.assertIn("FAILED", self.log.call_args.args[0])

    def test_busy_worker_not_logged_but_session_closed(self):
        self.run_worker.return_value = "BUSY"
        scheduler._run_weekly_restore_verification_once()
        self.db.close.assert_called_once()
        self.log.assert_not_called()

    def test_worker_exception_still_closes_session(self):
        self.run_worker.side_effect = RuntimeError("simulated worker failure")
        with self.assertRaisesRegex(RuntimeError, "simulated worker failure"):
            scheduler._run_weekly_restore_verification_once()
        self.db.close.assert_called_once()

    def test_original_scheduler_runs_backup_sync_then_weekly(self):
        source = inspect.getsource(scheduler._scheduler_loop)
        tree = ast.parse(source)
        calls = [
            node.func.id for node in ast.walk(tree)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
        ]
        expected = [
            "run_due_automatic_backup_once",
            "_sync_fallback_backups_once",
            "_run_weekly_restore_verification_once",
        ]
        positions = [calls.index(name) for name in expected]
        self.assertEqual(positions, sorted(positions))


if __name__ == "__main__":
    unittest.main()
