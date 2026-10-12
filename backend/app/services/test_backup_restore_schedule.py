"""Unit tests for the pure weekly verification policy (no database access)."""

import unittest
from datetime import datetime, timedelta, timezone

from app.services.backup_restore_schedule import (
    WeeklyRestorePolicy,
    latest_scheduled_slot,
    weekly_restore_due,
)

UTC = timezone.utc


def local(y, m, d, hour, minute=0):
    """Build an IST moment and return its aware UTC equivalent."""
    return datetime(y, m, d, hour, minute, tzinfo=timezone(timedelta(minutes=330))).astimezone(UTC)


class WeeklyRestoreScheduleTests(unittest.TestCase):
    def setUp(self):
        self.enabled = WeeklyRestorePolicy(enabled=True)

    def test_disabled_by_default(self):
        self.assertFalse(weekly_restore_due(
            policy=WeeklyRestorePolicy(), now_utc=local(2026, 10, 11, 3), last_attempt_utc=None))

    def test_sunday_schedule_starts_at_three_ist(self):
        self.assertEqual(latest_scheduled_slot(local(2026, 10, 11, 3), self.enabled).isoformat(),
                         "2026-10-11T03:00:00+05:30")
        self.assertTrue(weekly_restore_due(
            policy=self.enabled, now_utc=local(2026, 10, 11, 3), last_attempt_utc=None))

    def test_attempt_this_slot_suppresses_repeat_after_failure(self):
        self.assertFalse(weekly_restore_due(
            policy=self.enabled,
            now_utc=local(2026, 10, 11, 9),
            last_attempt_utc=local(2026, 10, 11, 3, 1)))

    def test_next_week_is_due_again(self):
        self.assertTrue(weekly_restore_due(
            policy=self.enabled,
            now_utc=local(2026, 10, 18, 3),
            last_attempt_utc=local(2026, 10, 11, 3, 1)))

    def test_catches_up_on_monday_after_missed_sunday(self):
        self.assertTrue(weekly_restore_due(
            policy=self.enabled,
            now_utc=local(2026, 10, 12, 9),
            last_attempt_utc=local(2026, 10, 4, 3, 1)))

    def test_sunday_before_time_uses_previous_week_slot(self):
        self.assertFalse(weekly_restore_due(
            policy=self.enabled,
            now_utc=local(2026, 10, 11, 2, 59),
            last_attempt_utc=local(2026, 10, 4, 3, 1)))

    def test_requires_aware_timestamps(self):
        with self.assertRaises(ValueError):
            weekly_restore_due(policy=self.enabled, now_utc=datetime(2026, 10, 11, 3), last_attempt_utc=None)
        with self.assertRaises(ValueError):
            weekly_restore_due(policy=self.enabled, now_utc=local(2026, 10, 11, 3), last_attempt_utc=datetime(2026, 10, 4, 3))

    def test_invalid_config_rejected(self):
        with self.assertRaises(ValueError):
            WeeklyRestorePolicy(enabled=True, weekday=7)
        with self.assertRaises(ValueError):
            WeeklyRestorePolicy(enabled=True, hour=24)
        with self.assertRaises(ValueError):
            WeeklyRestorePolicy(enabled=True, utc_offset_minutes=1440)


if __name__ == "__main__":
    unittest.main()
