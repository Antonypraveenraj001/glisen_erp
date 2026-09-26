from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    expense_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    expense_type = Column(
        String(30),
        nullable=False,
        default="GENERAL",
        server_default="GENERAL",
        index=True,
    )

    category = Column(
        String(50),
        nullable=False,
        index=True,
    )

    description = Column(
        String(255),
        nullable=False,
    )

    # ========================================================
    # AMOUNT
    #
    # GENERAL:
    #     Actual one-time amount.
    #
    # DIRECT_PRODUCTION:
    #     Actual production-linked amount.
    #
    # OVERHEAD:
    #     Current monthly amount.
    #
    # Historical monthly overhead amounts are stored in
    # expense_recurring_rates.
    # ========================================================

    amount = Column(
        Numeric(14, 2),
        nullable=False,
    )

    # ========================================================
    # MONTHLY RECURRING OVERHEAD
    # ========================================================

    is_monthly_recurring = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
        index=True,
    )

    effective_from = Column(
        Date,
        nullable=True,
        index=True,
    )

    effective_to = Column(
        Date,
        nullable=True,
        index=True,
    )

    # ========================================================
    # DIRECT PRODUCTION LINK
    # ========================================================

    production_order_id = Column(
        Integer,
        ForeignKey(
            "production_orders.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    payment_mode = Column(
        String(50),
        nullable=True,
    )

    reference_number = Column(
        String(100),
        nullable=True,
        index=True,
    )

    vendor_name = Column(
        String(200),
        nullable=True,
    )

    notes = Column(
        Text,
        nullable=True,
    )

    created_by = Column(
        Integer,
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    production_order = relationship(
        "ProductionOrder",
        foreign_keys=[
            production_order_id
        ],
    )

    recurring_rates = relationship(
        "ExpenseRecurringRate",
        back_populates="expense",
        order_by=(
            "ExpenseRecurringRate.effective_from"
        ),
    )