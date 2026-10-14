"""Unit tests using mocks. No MySQL, scheduler thread, or live backup writes."""

import unittest
from datetime import date, time
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.services import backup_scheduler as scheduler
from app.services.backup_alert_reporter import BackupAlertReporter


class BackupAlertReporterTests(unittest.TestCase):
    def test_scheduled_failure_is_deduped_by_business_day(self):
        with patch("app.services.backup_alert_reporter.SessionLocal") as factory, \
             patch("app.services.backup_alert_reporter.SystemAlertService") as service:
            BackupAlertReporter.scheduled_failure(
                business_date=date(2026, 10, 14), reason="FAILED"
            )
            kwargs = service.record_failure.call_args.kwargs
            self.assertEqual(kwargs["dedupe_key"], "BACKUP_SCHEDULE_FAILED:2026-10-14")
            self.assertEqual(kwargs["severity"], "CRITICAL")
            self.assertNotIn("password", kwargs["message"].lower())
            factory.return_value.close.assert_called_once()

    def test_notification_write_failure_does_not_crash_backup(self):
        with patch("app.services.backup_alert_reporter.SessionLocal", side_effect=OSError()):
            BackupAlertReporter.scheduled_failure(
                business_date=date(2026, 10, 14), reason="FAILED"
            )
            BackupAlertReporter.scheduled_recovered(
                business_date=date(2026, 10, 14)
            )

    def test_recovery_uses_same_incident_key(self):
        with patch("app.services.backup_alert_reporter.SessionLocal") as factory, \
             patch("app.services.backup_alert_reporter.SystemAlertService") as service:
            BackupAlertReporter.scheduled_recovered(business_date=date(2026, 10, 14))
            self.assertEqual(
                service.resolve.call_args.kwargs["dedupe_key"],
                "BACKUP_SCHEDULE_FAILED:2026-10-14"
            )
            factory.return_value.close.assert_called_once()


class BackupSchedulerIntegrationTests(unittest.TestCase):
    def setUp(self):
        scheduler._last_failed_attempt_at = None
        self.db = MagicMock()
        self.db.query.return_value.first.return_value = None
        self.settings = SimpleNamespace(
            automatic_backup_enabled=True,
            primary_backup_path="configured",
            backup_time=time(0, 0),
        )
        self.patches = [
            patch.object(scheduler, "SessionLocal", return_value=self.db),
            patch.object(scheduler.BackupService, "get_or_create_settings",
                         return_value=self.settings),
            patch.object(scheduler, "_business_backup_zone",
                         return_value=scheduler.DEFAULT_BACKUP_ZONE),
            patch.object(scheduler, "_already_completed_today", return_value=False),
            patch.object(scheduler.BackupService, "cleanup_automatic_retention",
                         return_value={"purged": 0, "partial": 0}),
            patch.object(scheduler.BackupAlertReporter, "scheduled_failure"),
            patch.object(scheduler.BackupAlertReporter, "scheduled_recovered"),
            patch.object(scheduler.BackupAlertReporter, "retention_failure"),
            patch.object(scheduler.BackupAlertReporter, "retention_recovered"),
        ]
        for patcher in self.patches:
            patcher.start()
            self.addCleanup(patcher.stop)
        self.addCleanup(setattr, scheduler, "_last_failed_attempt_at", None)

    def test_success_only_resolves_notifications(self):
        with patch.object(scheduler.BackupService, "create_automatic_backup",
                          return_value=SimpleNamespace(filename="safe.zip", status="VERIFIED")):
            scheduler.run_due_automatic_backup_once()
        scheduler.BackupAlertReporter.scheduled_recovered.assert_called_once()
        scheduler.BackupAlertReporter.scheduled_failure.assert_not_called()
        scheduler.BackupAlertReporter.retention_recovered.assert_called_once()
        self.db.close.assert_called_once()

    def test_backup_exception_generates_alert(self):
        with patch.object(scheduler.BackupService, "create_automatic_backup",
                          side_effect=RuntimeError("do not expose raw error")), \
             patch.object(scheduler.traceback, "print_exc"):
            scheduler.run_due_automatic_backup_once()
        scheduler.BackupAlertReporter.scheduled_failure.assert_called_once()
        self.assertEqual(
            scheduler.BackupAlertReporter.scheduled_failure.call_args.kwargs["reason"],
            "FAILED",
        )
        self.db.close.assert_called_once()

    def test_partial_result_generates_alert(self):
        with patch.object(scheduler.BackupService, "create_automatic_backup",
                          return_value=SimpleNamespace(filename="partial.zip", status="PARTIAL")):
            scheduler.run_due_automatic_backup_once()
        scheduler.BackupAlertReporter.scheduled_failure.assert_called_once()
        self.assertEqual(
            scheduler.BackupAlertReporter.scheduled_failure.call_args.kwargs["reason"],
            "PARTIAL",
        )

    def test_retention_error_alerts_without_reverting_success(self):
        with patch.object(scheduler.BackupService, "create_automatic_backup",
                          return_value=SimpleNamespace(filename="good.zip", status="VERIFIED")), \
             patch.object(scheduler.BackupService, "cleanup_automatic_retention",
                          side_effect=RuntimeError("test cleanup failure")):
            scheduler.run_due_automatic_backup_once()
        scheduler.BackupAlertReporter.scheduled_recovered.assert_called_once()
        scheduler.BackupAlertReporter.retention_failure.assert_called_once()
        scheduler.BackupAlertReporter.scheduled_failure.assert_not_called()

    def test_missing_primary_path_alerts(self):
        self.settings.primary_backup_path = None
        scheduler.run_due_automatic_backup_once()
        scheduler.BackupAlertReporter.scheduled_failure.assert_called_once()
        self.assertEqual(
            scheduler.BackupAlertReporter.scheduled_failure.call_args.kwargs["reason"],
            "CONFIGURATION",
        )

    def test_disabled_automatic_backups_do_not_alert(self):
        self.settings.automatic_backup_enabled = False
        scheduler.run_due_automatic_backup_once()
        scheduler.BackupAlertReporter.scheduled_failure.assert_not_called()


if __name__ == "__main__":
    unittest.main()
