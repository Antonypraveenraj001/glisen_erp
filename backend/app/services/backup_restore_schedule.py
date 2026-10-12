"""Pure weekly restore-verification schedule policy for Glisen ERP.

No database access, threads, files, or side effects. The later worker must
record a verification attempt durably *before* executing the test and pass its
UTC timestamp as `last_attempt_utc` on subsequent scheduler polls.

For the current Indian deployment, default schedule is Sunday at 03:00 IST.
Disabled by default; it must be explicitly enabled after safe MySQL credentials
and audit logging are configured. All timestamps supplied must be timezone-aware.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone


@dataclass(frozen=True)
class WeeklyRestorePolicy:
    enabled: bool = False
    weekday: int = 6  # Monday=0, Sunday=6
    hour: int = 3
    minute: int = 0
    utc_offset_minutes: int = 330  # IST; offset configurable per deployment

    def __post_init__(self) -> None:
        if not isinstance(self.enabled, bool):
            raise ValueError("enabled must be a boolean")
        if isinstance(self.weekday, bool) or not isinstance(self.weekday, int) or not 0 <= self.weekday <= 6:
            raise ValueError("weekday must be 0 (Monday) through 6 (Sunday)")
        if isinstance(self.hour, bool) or not isinstance(self.hour, int) or not 0 <= self.hour <= 23:
            raise ValueError("hour must be between 0 and 23")
        if isinstance(self.minute, bool) or not isinstance(self.minute, int) or not 0 <= self.minute <= 59:
            raise ValueError("minute must be between 0 and 59")
        if (
            isinstance(self.utc_offset_minutes, bool)
            or not isinstance(self.utc_offset_minutes, int)
            or not -1439 <= self.utc_offset_minutes <= 1439
        ):
            raise ValueError("UTC offset minutes is invalid")

    @property
    def timezone(self) -> timezone:
        return timezone(timedelta(minutes=self.utc_offset_minutes))


def latest_scheduled_slot(now_utc: datetime, policy: WeeklyRestorePolicy) -> datetime:
    """Latest weekly scheduled time, including one in the previous week.

    Return value is in the configured offset timezone. The weekly verification
    can catch up after an outage, but at most once per scheduled slot.
    """
    _require_aware(now_utc, "now_utc")
    local_now = now_utc.astimezone(policy.timezone)
    days_since_day = (local_now.weekday() - policy.weekday) % 7
    scheduled_date = local_now.date() - timedelta(days=days_since_day)
    scheduled = datetime.combine(
        scheduled_date,
        time(policy.hour, policy.minute),
        tzinfo=policy.timezone,
    )
    if scheduled > local_now:
        scheduled -= timedelta(days=7)
    return scheduled


def weekly_restore_due(
    *,
    policy: WeeklyRestorePolicy,
    now_utc: datetime,
    last_attempt_utc: datetime | None,
) -> bool:
    """Return True only after the scheduled slot and before an attempt in it.

    PASSED and FAILED attempts both count, preventing a failed test from
    running every 60 seconds. The caller must persist the attempt before
    launching an actual test and use a single-worker/DB lock for concurrency.
    """
    _require_aware(now_utc, "now_utc")
    if last_attempt_utc is not None:
        _require_aware(last_attempt_utc, "last_attempt_utc")
    if not policy.enabled:
        return False
    scheduled = latest_scheduled_slot(now_utc, policy)
    if last_attempt_utc is None:
        return True
    return last_attempt_utc.astimezone(policy.timezone) < scheduled


def _require_aware(value: datetime, label: str) -> None:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{label} must be a timezone-aware datetime")
