from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database.base import Base


class PurchaseBillAIBatch(Base):
    __tablename__ = "purchase_bill_ai_batches"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    total_files: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    created_user = relationship(
        "User",
        foreign_keys=[created_by],
    )

    drafts = relationship(
        "PurchaseBillAIDraft",
        back_populates="batch",
        cascade="all, delete-orphan",
        order_by="PurchaseBillAIDraft.sequence_number",
    )


class PurchaseBillAIDraft(Base):
    __tablename__ = "purchase_bill_ai_drafts"

    __table_args__ = (
        UniqueConstraint(
            "batch_id",
            "sequence_number",
            name=(
                "uq_purchase_bill_ai_draft_"
                "batch_sequence"
            ),
        ),
        CheckConstraint(
            (
                "status IN ("
                "'QUEUED', "
                "'PROCESSING', "
                "'READY', "
                "'FAILED', "
                "'CONFIRMED', "
                "'CANCELLED'"
                ")"
            ),
            name=(
                "ck_purchase_bill_ai_draft_status"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    batch_id: Mapped[int] = mapped_column(
        ForeignKey(
            "purchase_bill_ai_batches.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    sequence_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # --------------------------------------------------------
    # ORIGINAL FILE INFORMATION
    #
    # Only the filename is retained.
    # The image itself is NEVER stored.
    # --------------------------------------------------------

    original_filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # --------------------------------------------------------
    # QUEUED
    # PROCESSING
    # READY
    # FAILED
    # CONFIRMED
    # CANCELLED
    # --------------------------------------------------------

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="QUEUED",
        server_default="QUEUED",
        index=True,
    )

    # --------------------------------------------------------
    # EXTRACTED DRAFT DATA
    #
    # Contains:
    # supplier
    # purchase_bill
    # products
    #
    # No image bytes or image path are stored.
    # --------------------------------------------------------

    extracted_data: Mapped[
        dict | None
    ] = mapped_column(
        JSON,
        nullable=True,
    )

    # --------------------------------------------------------
    # FAILURE
    # --------------------------------------------------------

    error_message: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    # --------------------------------------------------------
    # CONFIRMATION TRACEABILITY
    #
    # Populated only after the user confirms the draft.
    # --------------------------------------------------------

    confirmed_purchase_bill_id: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "purchase_bills.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # PROCESSING TIMES
    # ========================================================

    processing_started_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime,
        nullable=True,
    )

    processing_completed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime,
        nullable=True,
    )

    confirmed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime,
        nullable=True,
    )

    cancelled_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    batch = relationship(
        "PurchaseBillAIBatch",
        back_populates="drafts",
    )

    created_user = relationship(
        "User",
        foreign_keys=[created_by],
    )

    confirmed_purchase_bill = relationship(
        "PurchaseBill",
        foreign_keys=[
            confirmed_purchase_bill_id
        ],
    )