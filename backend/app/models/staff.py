from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    staff_name = Column(
        String(200),
        nullable=False,
        index=True,
    )

    designation = Column(
        String(150),
        nullable=True,
    )

    # ========================================================
    # CURRENT MONTHLY SALARY
    #
    # This field remains as the quick/current value used by
    # the UI.
    #
    # Historical salary values are preserved separately in
    # staff_salary_rates.
    # ========================================================

    monthly_salary = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    joining_date = Column(
        Date,
        nullable=True,
    )

    relieving_date = Column(
        Date,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        index=True,
    )

    # Hidden from Staff Master after the user chooses Delete.
    # The row itself is retained so old salary/payment history
    # remains relationally traceable.
    is_deleted = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
        index=True,
    )

    notes = Column(
        Text,
        nullable=True,
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
    # SALARY HISTORY
    # ========================================================

    salary_rates = relationship(
        "StaffSalaryRate",
        back_populates="staff",
        order_by=(
            "StaffSalaryRate.effective_from"
        ),
    )