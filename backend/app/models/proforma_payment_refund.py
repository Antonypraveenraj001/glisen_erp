from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class ProformaPaymentRefund(Base):
    __tablename__ = (
        "proforma_payment_refunds"
    )

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id: Mapped[int] = (
        mapped_column(
            Integer,
            primary_key=True,
            index=True,
        )
    )

    # ========================================================
    # PROFORMA
    # ========================================================

    proforma_id: Mapped[int] = (
        mapped_column(
            ForeignKey(
                "proformas.id",
                ondelete="RESTRICT",
            ),
            nullable=False,
            index=True,
        )
    )

    # ========================================================
    # REFUND DATE
    # ========================================================

    refund_date: Mapped[datetime] = (
        mapped_column(
            DateTime,
            nullable=False,
            index=True,
        )
    )

    # ========================================================
    # REFUND AMOUNT
    # ========================================================

    amount: Mapped[Decimal] = (
        mapped_column(
            Numeric(
                14,
                2,
            ),
            nullable=False,
        )
    )

    # ========================================================
    # REFUND MODE
    #
    # Examples:
    # Bank Transfer
    # UPI
    # Cash
    # Cheque
    # Other
    # ========================================================

    refund_mode: Mapped[
        str | None
    ] = (
        mapped_column(
            String(
                50
            ),
            nullable=True,
        )
    )

    # ========================================================
    # REFERENCE
    #
    # UTR / cheque number / transaction reference.
    # ========================================================

    reference_number: Mapped[
        str | None
    ] = (
        mapped_column(
            String(
                100
            ),
            nullable=True,
        )
    )

    # ========================================================
    # NOTES
    # ========================================================

    notes: Mapped[
        str | None
    ] = (
        mapped_column(
            Text,
            nullable=True,
        )
    )

    # ========================================================
    # AUDIT USER
    # ========================================================

    created_by: Mapped[int] = (
        mapped_column(
            ForeignKey(
                "users.id",
                ondelete="RESTRICT",
            ),
            nullable=False,
            index=True,
        )
    )

    # ========================================================
    # CREATED
    # ========================================================

    created_at: Mapped[datetime] = (
        mapped_column(
            DateTime,
            server_default=func.now(),
            nullable=False,
        )
    )