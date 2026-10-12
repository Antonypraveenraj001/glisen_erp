"""Persistent, audit-only history for isolated backup-restore verification.

Only writes `backup_restore_verifications`. It never restores data, connects to
MySQL directly, changes BackupLog, or schedules work. The migration creating
this table must be reviewed/applied separately before the worker is enabled.

Dates are UTC-aware at the Python boundary and UTC-naive in the MySQL columns.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.backup_restore_verification import BackupRestoreVerification


_TEST_DB_NAME = re.compile(r"\Aglisen_verify_[0-9a-f]{12}\Z")
_SHA256 = re.compile(r"\A[0-9a-f]{64}\Z")


def _utc_naive(value: datetime, label: str) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{label} must be timezone-aware.")
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def start_restore_verification(
    db: Session,
    *,
    scheduled_slot_utc: datetime,
    started_at_utc: datetime,
    backup_log_id: int | None,
    archive_sha256: str | None = None,
) -> BackupRestoreVerification | None:
    """Commit RUNNING before beginning a trial; return None for an attempted slot.

    The DB unique constraint on scheduled_slot_utc is the last line of defense
    against two scheduler workers attempting the same weekly run concurrently.
    An IntegrityError unrelated to the unique slot is NOT silently swallowed.
    """
    slot = _utc_naive(scheduled_slot_utc, "scheduled_slot_utc")
    started = _utc_naive(started_at_utc, "started_at_utc")
    if started < slot:
        raise ValueError("Verification cannot begin before its scheduled slot.")
    if backup_log_id is not None and (not isinstance(backup_log_id, int) or backup_log_id < 1):
        raise ValueError("backup_log_id must be a positive integer or None.")
    if archive_sha256 is not None and not _SHA256.fullmatch(archive_sha256):
        raise ValueError("archive_sha256 must be a lowercase SHA-256 digest.")

    record = BackupRestoreVerification(
        backup_log_id=backup_log_id,
        scheduled_slot_utc=slot,
        started_at_utc=started,
        status="RUNNING",
        archive_sha256=archive_sha256,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(BackupRestoreVerification).filter(
            BackupRestoreVerification.scheduled_slot_utc == slot
        ).first()
        if existing is not None:
            return None
        raise
    db.refresh(record)
    return record


def finish_restore_verification(
    db: Session,
    *,
    verification_id: int,
    completed_at_utc: datetime,
    succeeded: bool,
    cleanup_completed: bool | None,
    test_database_name: str | None = None,
    table_count: int | None = None,
    schema_revision: str | None = None,
    safe_error_message: str | None = None,
) -> BackupRestoreVerification:
    """Finish one RUNNING record, without altering the source BackupLog.

    A check cannot PASSED unless the restore had tables AND test DB cleanup
    completed. Never pass raw SQL, passwords, or subprocess stderr as errors;
    use operator-safe, generic text from the worker.
    """
    completed = _utc_naive(completed_at_utc, "completed_at_utc")
    if not isinstance(verification_id, int) or verification_id < 1:
        raise ValueError("verification_id must be positive.")
    if test_database_name is not None and not _TEST_DB_NAME.fullmatch(test_database_name):
        raise ValueError("Unexpected test database name; refused to record.")
    if table_count is not None and (not isinstance(table_count, int) or table_count < 0):
        raise ValueError("table_count cannot be negative.")
    if schema_revision is not None and (not isinstance(schema_revision, str) or len(schema_revision) > 100):
        raise ValueError("Invalid schema revision.")
    if safe_error_message is not None and (not isinstance(safe_error_message, str) or len(safe_error_message) > 512):
        raise ValueError("Use an operator-safe error description, at most 512 characters.")

    record = db.query(BackupRestoreVerification).filter(
        BackupRestoreVerification.id == verification_id
    ).with_for_update().first()
    if record is None:
        raise ValueError("Restore verification record does not exist.")
    if record.status != "RUNNING":
        raise ValueError("Restore verification has already been completed.")
    if completed < record.started_at_utc:
        raise ValueError("Completion time cannot precede start time.")

    passed = succeeded is True and cleanup_completed is True and table_count is not None and table_count > 0
    record.completed_at_utc = completed
    record.status = "PASSED" if passed else "FAILED"
    record.test_database_name = test_database_name
    record.table_count = table_count
    record.schema_revision = schema_revision
    record.cleanup_completed = cleanup_completed
    record.error_message = None if passed else (safe_error_message or "Isolated restore verification did not complete successfully.")
    db.commit()
    db.refresh(record)
    return record
