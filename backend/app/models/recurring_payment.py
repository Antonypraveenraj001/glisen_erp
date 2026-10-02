from datetime import (
    date,
    datetime,
)
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class RecurringPayment(Base):

    __tablename__ = (
        "recurring_payments"
    )


    __table_args__ = (

        # --------------------------------------------------------
        # ONE STAFF SALARY PAYMENT PER MONTH
        # --------------------------------------------------------

        UniqueConstraint(
            "staff_id",
            "period_start",
            name=(
                "uq_recurring_payment_"
                "staff_period"
            ),
        ),


        # --------------------------------------------------------
        # ONE OVERHEAD PAYMENT PER MONTH
        # --------------------------------------------------------

        UniqueConstraint(
            "expense_id",
            "period_start",
            name=(
                "uq_recurring_payment_"
                "expense_period"
            ),
        ),


        # --------------------------------------------------------
        # PAYMENT MUST POINT TO EXACTLY ONE SOURCE
        # --------------------------------------------------------

        CheckConstraint(
            """
            (
                payment_kind = 'STAFF_SALARY'
                AND staff_id IS NOT NULL
                AND expense_id IS NULL
            )
            OR
            (
                payment_kind = 'OVERHEAD'
                AND staff_id IS NULL
                AND expense_id IS NOT NULL
            )
            """,
            name=(
                "ck_recurring_payment_"
                "valid_source"
            ),
        ),


        CheckConstraint(
            "amount > 0",
            name=(
                "ck_recurring_payment_"
                "amount_positive"
            ),
        ),
    )


    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )


    # ============================================================
    # PAYMENT TYPE
    #
    # STAFF_SALARY
    # OVERHEAD
    # ============================================================

    payment_kind: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )


    # ============================================================
    # SOURCE
    # ============================================================

    staff_id: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "staff.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )


    expense_id: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "expenses.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )


    # ============================================================
    # ACCOUNTING PERIOD
    #
    # Always first day of payment month.
    #
    # Example:
    #
    # Payment Date:
    #     02-Oct-2026
    #
    # period_start:
    #     01-Oct-2026
    #
    # This is what prevents duplicate October payments.
    # ============================================================

    period_start: Mapped[
        date
    ] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )


    # ============================================================
    # ACTUAL PAYMENT DATE
    # ============================================================

    payment_date: Mapped[
        date
    ] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )


    # ============================================================
    # FROZEN PAYMENT AMOUNT
    #
    # Salary / overhead rate applicable to payment_date is copied
    # here. Future changes therefore never modify old payments.
    # ============================================================

    amount: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(
            14,
            2,
        ),
        nullable=False,
    )


    payment_mode: Mapped[
        str | None
    ] = mapped_column(
        String(50),
        nullable=True,
    )


    reference_number: Mapped[
        str | None
    ] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )


    notes: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )


    created_by: Mapped[
        int
    ] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )


    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )