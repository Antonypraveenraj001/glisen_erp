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


class FinalBillPayment(Base):
    __tablename__ = "final_bill_payments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    final_bill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "final_bills.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    payment_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    # Examples:
    # Advance
    # Part Payment
    # Final Payment
    payment_type: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    # Examples:
    # Bank Transfer
    # UPI
    # Cash
    # Cheque
    payment_mode: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # UTR / cheque number / transaction reference.
    reference_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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
    )