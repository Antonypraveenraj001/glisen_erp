"""One-shot weekly isolated restore verification for Glisen ERP.

This module has NO background thread and runs nothing at import time.
The existing backup scheduler will call it in a later, separately tested step.
It does not change the source BackupLog or call the production restore routine.

The verification-history migration must be applied BEFORE enabling weekly tests.
The dedicated MySQL test account must have restricted test-schema-only grants.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from sqlalchemy.orm import Session

from app.models.backup import BackupLog
from app.models.backup_restore_verification import BackupRestoreVerification
from app.models.system_state import SystemState
from app.services.backup_restore_history import (
    finish_restore_verification,
    start_restore_verification,
)
from app.services.backup_restore_schedule import (
    WeeklyRestorePolicy,
    latest_scheduled_slot,
)
from app.services.backup_restore_trial import (
    RestoreTrialResult,
    restore_archive_to_disposable_database,
)
from app.services.backup_service import BackupService


# Require a recent archive; an ancient backup should not make the weekly
# disaster-recovery check appear healthy.
MAX_BACKUP_AGE_DAYS = 8


def _system_busy(db: Session) -> bool:
    """Independently enforce operational interlocks, not only scheduler checks."""
    if BackupService.RESTORE_IN_PROGRESS:
        return True
    state = db.query(SystemState).first()
    return bool(state and (state.restore_in_progress or state.year_transition_in_progress))


def _newest_recent_backup(db: Session, now_utc: datetime) -> BackupLog | None:
    cutoff = now_utc.astimezone(timezone.utc).replace(tzinfo=None) - timedelta(
        days=MAX_BACKUP_AGE_DAYS
    )
    return (
        db.query(BackupLog)
        .filter(
            BackupLog.status.in_(("VERIFIED", "SUCCESS", "PARTIAL")),
            BackupLog.backup_type.in_(("AUTOMATIC", "MANUAL", "FY_FINAL")),
            BackupLog.checksum_sha256.is_not(None),
            BackupLog.started_at >= cutoff,
        )
        .order_by(BackupLog.id.desc())
        .first()
    )


def _safe_failure_description(error: Exception) -> tuple[str, bool | None]:
    """Never persist passwords, MySQL stderr, SQL statements or file contents."""
    if "cleanup failed" in str(error).lower():
        return ("Disposable MySQL database cleanup failed; operator intervention required.", False)
    return ("Isolated backup restoration failed; review restricted server diagnostics.", None)


def run_weekly_restore_verification_once(
    db: Session,
    *,
    now_utc: datetime,
    policy: WeeklyRestorePolicy,
    test_user: str,
    test_password: str,
    trial_runner: Callable[..., RestoreTrialResult] | None = None,
    archive_locator: Callable[[BackupLog], Path] | None = None,
    production_config=None,
) -> str:
    """Process at most one due weekly slot; return a short non-secret status.

    Possible results: DISABLED, BUSY, ALREADY_ATTEMPTED, PASSED, FAILED.
    The result is NOT a scheduler or an alert, and the caller must not expose
    exceptions verbatim to end users. A FAILED attempt is persisted to history.

    test_user/password are intentionally explicit. Never default either value
    from the production DB account. The scheduler integration will supply the
    dedicated test credentials only after opt-in has been reviewed.
    """
    if not isinstance(now_utc, datetime) or now_utc.tzinfo is None or now_utc.utcoffset() is None:
        raise ValueError("now_utc must be timezone-aware.")
    if not isinstance(policy, WeeklyRestorePolicy):
        raise TypeError("policy must be WeeklyRestorePolicy.")
    if not policy.enabled:
        return "DISABLED"
    if _system_busy(db):
        return "BUSY"
    if not BackupService.BACKUP_LOCK.acquire(blocking=False):
        return "BUSY"

    try:
        # Re-check after acquiring the common backup/restore lock.
        if _system_busy(db):
            return "BUSY"

        slot = latest_scheduled_slot(now_utc, policy).astimezone(timezone.utc)
        slot_naive = slot.replace(tzinfo=None)
        prior = db.query(BackupRestoreVerification).filter(
            BackupRestoreVerification.scheduled_slot_utc == slot_naive
        ).first()
        if prior is not None:
            return "ALREADY_ATTEMPTED"

        candidate = _newest_recent_backup(db, now_utc)
        record = start_restore_verification(
            db,
            scheduled_slot_utc=slot,
            started_at_utc=now_utc,
            backup_log_id=candidate.id if candidate is not None else None,
            archive_sha256=candidate.checksum_sha256 if candidate is not None else None,
        )
        if record is None:
            return "ALREADY_ATTEMPTED"

        # All potentially risky IO begins only AFTER durable RUNNING history.
        result: RestoreTrialResult | None = None
        failure: str | None = None
        cleanup_completed: bool | None = None
        try:
            if candidate is None:
                failure = "No recent eligible backup is available for weekly verification."
            elif not test_user or not test_password:
                failure = "Restricted restore-test MySQL credentials are not configured."
            else:
                if production_config is None:
                    from app.core.config import settings as production_config
                if test_user.casefold() == production_config.DB_USER.casefold():
                    failure = "Restricted restore-test account must differ from production."
                else:
                    locator = archive_locator or BackupService.locate_verified_archive
                    archive_path = locator(candidate)
                    runner = trial_runner or restore_archive_to_disposable_database
                    result = runner(
                        archive_path=Path(archive_path),
                        expected_sha256=candidate.checksum_sha256,
                        mysql_host=production_config.DB_HOST,
                        mysql_port=production_config.DB_PORT,
                        production_database=production_config.DB_NAME,
                        production_user=production_config.DB_USER,
                        test_user=test_user,
                        test_password=test_password,
                    )
                    cleanup_completed = result.cleanup_completed
        except Exception as exc:
            failure, cleanup_completed = _safe_failure_description(exc)

        passed = bool(result and result.cleanup_completed and result.table_count > 0 and failure is None)
        if not passed and failure is None:
            failure = "Isolated restoration did not pass verification checks."
        finish_restore_verification(
            db,
            verification_id=record.id,
            completed_at_utc=datetime.now(timezone.utc),
            succeeded=passed,
            cleanup_completed=cleanup_completed,
            test_database_name=result.test_database if result is not None else None,
            table_count=result.table_count if result is not None else None,
            schema_revision=result.schema_revision if result is not None else None,
            safe_error_message=failure,
        )
        return "PASSED" if passed else "FAILED"
    finally:
        BackupService.BACKUP_LOCK.release()
