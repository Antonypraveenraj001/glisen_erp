"""Audit-only results of disposable weekly backup-restore checks.

Distinct from BackupLog: a failed restore test must NOT rewrite the original
backup archive's checksum/file-integrity status. All timestamps are UTC-naive
in MySQL; the worker will convert explicitly from timezone-aware UTC values.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class BackupRestoreVerification(Base):
    __tablename__ = "backup_restore_verifications"
    __table_args__ = (
        UniqueConstraint("scheduled_slot_utc", name="uq_backup_restore_verifications_slot"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # A nullable link permits recording FAILED when no usable backup exists.
    backup_log_id: Mapped[int | None] = mapped_column(
        ForeignKey("backup_logs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # One row per weekly slot, created with RUNNING *before* the restore trial.
    # Unique constraint prevents two scheduler processes repeating that slot.
    scheduled_slot_utc: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    started_at_utc: Mapped[datetime] = mapped_column(DateTime(), nullable=False, index=True)
    completed_at_utc: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)

    # RUNNING / PASSED / FAILED. The original BackupLog status is unchanged.
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Diagnostic metadata, never passwords or full SQL contents.
    test_database_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    table_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    schema_revision: Mapped[str | None] = mapped_column(String(100), nullable=True)
    archive_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    cleanup_completed: Mapped[bool | None] = mapped_column(Boolean(), nullable=True)

    # A future Boss-notification worker can send/ack failures independently.
    boss_notified_at_utc: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
