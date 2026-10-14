"""Persistence and Boss-only access for CASTLE ERP system alerts.

This module is not attached to the scheduler until the integration step.
Callers must supply safe, user-facing messages, not raw tracebacks or secrets.
All stored times are naive UTC, matching the application's MySQL DATETIME use.
"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.system_alert import SystemAlert
from app.models.user import User


class SystemAlertService:
    VALID_SEVERITIES = frozenset({"WARNING", "ERROR", "CRITICAL"})

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def _require_boss(db: Session, user_id: int) -> None:
        user = db.execute(
            select(User.id)
            .join(Role, User.role_id == Role.id)
            .where(
                User.id == user_id,
                User.is_active.is_(True),
                Role.name == "Boss",
                Role.is_active.is_(True),
            )
        ).scalar_one_or_none()
        if user is None:
            raise PermissionError("Active Boss access required.")

    @staticmethod
    def record_failure(
        db: Session,
        *,
        dedupe_key: str,
        category: str,
        title: str,
        message: str,
        severity: str = "ERROR",
        occurred_at: datetime | None = None,
    ) -> SystemAlert:
        """Create or update one incident, safely deduplicated by key.

        For scheduled jobs use a stable key per alert category and business
        date, e.g. ``backup:scheduled:2026-10-14``. Retries increment the
        occurrence counter without generating additional visible rows.
        An acknowledged, still-active incident stays acknowledged; a newly
        re-opened incident requires acknowledgement again.

        Never send raw exception strings or credentials as ``message``.
        """
        values = {
            "dedupe_key": (dedupe_key, 160),
            "category": (category, 64),
            "title": (title, 200),
            "message": (message, 2000),
        }
        for field, (value, max_length) in values.items():
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{field} must be a nonempty string")
            if len(value) > max_length:
                raise ValueError(f"{field} exceeds {max_length} characters")

        if severity not in SystemAlertService.VALID_SEVERITIES:
            raise ValueError("Unsupported alert severity")

        now = occurred_at or SystemAlertService._utc_now()
        if now.tzinfo is not None:
            now = now.astimezone(timezone.utc).replace(tzinfo=None)

        # The unique database key handles concurrent attempts to insert the
        # same incident. Locking existing rows serializes increments on MySQL.
        for attempt in range(2):
            alert = db.execute(
                select(SystemAlert)
                .where(SystemAlert.dedupe_key == dedupe_key)
                .with_for_update()
            ).scalar_one_or_none()

            if alert is None:
                alert = SystemAlert(
                    dedupe_key=dedupe_key,
                    category=category,
                    severity=severity,
                    title=title,
                    message=message,
                    occurrence_count=1,
                    first_occurred_at=now,
                    last_occurred_at=now,
                )
                db.add(alert)
            else:
                was_resolved = alert.resolved_at is not None
                alert.category = category
                alert.severity = severity
                alert.title = title
                alert.message = message
                alert.occurrence_count = (alert.occurrence_count or 0) + 1
                alert.last_occurred_at = now
                if was_resolved:
                    alert.resolved_at = None
                    alert.acknowledged_at = None
                    alert.acknowledged_by_id = None

            try:
                db.commit()
                db.refresh(alert)
                return alert
            except IntegrityError:
                db.rollback()
                if attempt:
                    raise

        raise RuntimeError("Unable to record system alert")

    @staticmethod
    def resolve(db: Session, *, dedupe_key: str) -> bool:
        """Mark a recovered incident as resolved; keep its audit history."""
        alert = db.execute(
            select(SystemAlert)
            .where(SystemAlert.dedupe_key == dedupe_key)
            .with_for_update()
        ).scalar_one_or_none()
        if alert is None or alert.resolved_at is not None:
            return False
        alert.resolved_at = SystemAlertService._utc_now()
        db.commit()
        return True

    @staticmethod
    def acknowledge(db: Session, *, alert_id: int, boss_user_id: int) -> SystemAlert:
        """Only an active Boss may acknowledge an incident."""
        SystemAlertService._require_boss(db, boss_user_id)
        alert = db.execute(
            select(SystemAlert)
            .where(SystemAlert.id == alert_id)
            .with_for_update()
        ).scalar_one_or_none()
        if alert is None:
            raise LookupError("System alert not found")
        if alert.acknowledged_at is None:
            alert.acknowledged_at = SystemAlertService._utc_now()
            alert.acknowledged_by_id = boss_user_id
            db.commit()
            db.refresh(alert)
        return alert

    @staticmethod
    def recent_for_boss(
        db: Session, *, boss_user_id: int, limit: int = 50
    ) -> list[SystemAlert]:
        SystemAlertService._require_boss(db, boss_user_id)
        if not 1 <= limit <= 200:
            raise ValueError("Alert list limit must be between 1 and 200")
        return list(db.execute(
            select(SystemAlert)
            .order_by(SystemAlert.last_occurred_at.desc(), SystemAlert.id.desc())
            .limit(limit)
        ).scalars().all())

    @staticmethod
    def unacknowledged_count(db: Session, *, boss_user_id: int) -> int:
        SystemAlertService._require_boss(db, boss_user_id)
        return int(db.execute(
            select(func.count(SystemAlert.id))
            .where(
                SystemAlert.acknowledged_at.is_(None),
                SystemAlert.resolved_at.is_(None),
            )
        ).scalar_one())
