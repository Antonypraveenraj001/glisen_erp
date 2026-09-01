from decimal import Decimal

from sqlalchemy import (
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ProductionMaterial(Base):
    __tablename__ = "production_materials"

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

    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"),
        nullable=True,
        index=True,
    )

    material_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    unit: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    quantity_required: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    quantity_issued: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    material_cost: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    production_order = relationship(
        "ProductionOrder",
        back_populates="materials",
    )