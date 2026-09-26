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


class StaffSalaryRate(Base):
    __tablename__ = "staff_salary_rates"

    __table_args__ = (
        UniqueConstraint(
            "staff_id",
            "effective_from",
            name=(
                "uq_staff_salary_rates_"
                "staff_effective_from"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    staff_id: Mapped[int] = mapped_column(
        ForeignKey(
            "staff.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    monthly_salary: Mapped[Decimal] = mapped_column(
        Numeric(
            14,
            2,
        ),
        nullable=False,
    )

    # First day from which this monthly salary applies.
    effective_from: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    # NULL means this salary is still current.
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

    staff = relationship(
        "Staff",
        back_populates="salary_rates",
    )