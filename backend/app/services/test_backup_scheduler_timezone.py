"""Regression tests for UTC backup timestamps and local-company schedules."""
import unittest
from datetime import date, datetime, timezone
from unittest.mock import Mock, patch
from zoneinfo import ZoneInfo

from app.services import backup_scheduler as scheduler


class BackupTimezoneTests(unittest.TestCase):
    def test_naive_mysql_utc_evening_becomes_next_day_in_india(self):
        timestamp = datetime(2026, 10, 12, 19, 10)  # 00:40 IST Oct 13
        self.assertEqual(
            scheduler._backup_started_on_local_date(timestamp, ZoneInfo("Asia/Kolkata")),
            date(2026, 10, 13),
        )

    def test_utc_early_evening_stays_same_local_day(self):
        timestamp = datetime(2026, 10, 12, 17, 59)
        self.assertEqual(
            scheduler._backup_started_on_local_date(timestamp, ZoneInfo("Asia/Kolkata")),
            date(2026, 10, 12),
        )

    def test_aware_utc_value_is_not_reinterpreted(self):
        stamp = datetime(2026, 10, 12, 19, 10, tzinfo=timezone.utc)
        self.assertEqual(
            scheduler._backup_started_on_local_date(stamp, ZoneInfo("Asia/Kolkata")),
            date(2026, 10, 13),
        )

    def test_configured_company_timezone_is_used(self):
        db = Mock()
        db.query.return_value.first.return_value = ("Europe/London",)
        self.assertEqual(scheduler._business_backup_zone(db).key, "Europe/London")

    def test_invalid_timezone_fails_to_safe_default(self):
        db = Mock()
        db.query.return_value.first.return_value = ("Not/AZone",)
        with patch.object(scheduler, "_log"):
            self.assertEqual(scheduler._business_backup_zone(db).key, "Asia/Kolkata")

    def test_completed_today_checks_ist_date_not_utc_date(self):
        db = Mock()
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = Mock(
            started_at=datetime(2026, 10, 12, 19, 10)
        )
        self.assertTrue(scheduler._already_completed_today(
            db, date(2026, 10, 13), ZoneInfo("Asia/Kolkata")))
        self.assertFalse(scheduler._already_completed_today(
            db, date(2026, 10, 12), ZoneInfo("Asia/Kolkata")))

    def test_missing_backup_is_not_marked_complete(self):
        db = Mock()
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        self.assertFalse(scheduler._already_completed_today(
            db, date(2026, 10, 13), ZoneInfo("Asia/Kolkata")))


if __name__ == "__main__":
    unittest.main()
