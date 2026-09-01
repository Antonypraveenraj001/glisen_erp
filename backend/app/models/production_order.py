from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ProductionOrder(Base):
    __tablename__ = "production_orders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    production_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    proforma_id: Mapped[int] = mapped_column(
        ForeignKey("proformas.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Pending",
        index=True,
    )

    planned_start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    actual_start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    actual_end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    operations = relationship(
        "ProductionOperation",
        back_populates="production_order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    materials = relationship(
        "ProductionMaterial",
        back_populates="production_order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )