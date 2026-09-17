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
    relationship,
)

from app.database.base import Base


class PurchaseBillPayment(Base):
    __tablename__ = "purchase_bill_payments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    purchase_bill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "purchase_bills.id",
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
        Numeric(12, 2),
        nullable=False,
    )

    payment_mode: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

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

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    purchase_bill = relationship(
        "PurchaseBill",
        back_populates="payments",
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
    )