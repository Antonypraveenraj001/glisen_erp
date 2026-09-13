from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
)
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

    category = Column(
        String(50),
        nullable=False,
        index=True,
    )

    description = Column(
        String(255),
        nullable=False,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
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