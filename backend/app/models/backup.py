from datetime import time

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class BackupSettings(Base):
    __tablename__ = "backup_settings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    # ============================================================
    # AUTOMATIC BACKUP
    # ============================================================

    automatic_backup_enabled: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    backup_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
        default=time(22, 0),
    )

    # ============================================================
    # STORAGE
    # ============================================================

    primary_backup_path: Mapped[
        str | None
    ] = mapped_column(
        String(1000),
        nullable=True,
    )

    secondary_backup_enabled: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    secondary_backup_path: Mapped[
        str | None
    ] = mapped_column(
        String(1000),
        nullable=True,
    )

    retention_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
        server_default="30",
    )

    include_uploads: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    verify_after_backup: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    # ============================================================
    # AUDIT
    # ============================================================

    created_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class BackupLog(Base):
    __tablename__ = "backup_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # MANUAL
    # AUTOMATIC
    # FY_FINAL
    # PRE_RESTORE
    backup_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    primary_path: Mapped[
        str | None
    ] = mapped_column(
        String(1000),
        nullable=True,
    )

    secondary_path: Mapped[
        str | None
    ] = mapped_column(
        String(1000),
        nullable=True,
    )

    file_size_bytes: Mapped[
        int | None
    ] = mapped_column(
        BigInteger,
        nullable=True,
    )

    checksum_sha256: Mapped[
        str | None
    ] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )

    # STARTED
    # SUCCESS
    # FAILED
    # VERIFIED
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    financial_year_id: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "financial_years.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    created_by: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    app_version: Mapped[
        str | None
    ] = mapped_column(
        String(50),
        nullable=True,
    )

    schema_revision: Mapped[
        str | None
    ] = mapped_column(
        String(100),
        nullable=True,
    )

    manifest_version: Mapped[
        str | None
    ] = mapped_column(
        String(30),
        nullable=True,
    )

    started_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    completed_at: Mapped[
        object | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    verified_at: Mapped[
        object | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    error_message: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )