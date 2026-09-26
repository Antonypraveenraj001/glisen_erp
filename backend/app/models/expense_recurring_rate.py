from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database.base import Base


class ExpenseRecurringRate(Base):
    __tablename__ = "expense_recurring_rates"

    __table_args__ = (
        UniqueConstraint(
            "expense_id",
            "effective_from",
            name=(
                "uq_expense_recurring_rates_"
                "expense_effective_from"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # RECURRING OVERHEAD MASTER
    #
    # Points to the Expense row representing the regular
    # company overhead.
    # ========================================================

    expense_id: Mapped[int] = mapped_column(
        ForeignKey(
            "expenses.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # MONTHLY AMOUNT FOR THIS PERIOD
    # ========================================================

    monthly_amount: Mapped[Decimal] = mapped_column(
        Numeric(
            14,
            2,
        ),
        nullable=False,
    )

    # First date this monthly amount applies.
    effective_from: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    # NULL means this is the current rate.
    effective_to: Mapped[
        date | None
    ] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    expense = relationship(
        "Expense",
        back_populates="recurring_rates",
    )