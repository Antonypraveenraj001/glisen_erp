from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ProductionOperation(Base):
    __tablename__ = "production_operations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    production_order_id: Mapped[int] = mapped_column(
        ForeignKey(
            "production_orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    operation_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    machine_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    hourly_rate: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    planned_hours: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )

    actual_hours: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )

    operation_cost: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Pending",
        index=True,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    production_order = relationship(
        "ProductionOrder",
        back_populates="operations",
    )