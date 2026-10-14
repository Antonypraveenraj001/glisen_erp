"""API response models for Boss-only system health notifications.

All timestamps are stored as naive UTC in MySQL. Return explicit UTC timestamps
so browsers display the correct local business time.
"""

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, field_validator


class SystemAlertResponse(BaseModel):
    id: int
    category: str
    severity: str
    title: str
    message: str
    occurrence_count: int
    first_occurred_at: datetime
    last_occurred_at: datetime
    acknowledged_at: datetime | None
    acknowledged_by_id: int | None
    resolved_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

    @field_validator(
        "first_occurred_at", "last_occurred_at",
        "acknowledged_at", "resolved_at", mode="before",
    )
    @classmethod
    def timestamps_are_utc(cls, value):
        if value is None or not isinstance(value, datetime):
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class SystemAlertCountResponse(BaseModel):
    unacknowledged_count: int
