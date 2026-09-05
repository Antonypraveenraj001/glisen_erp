from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
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
    relationship,
)

from app.database.base import Base


class StockMovement(Base):
    __tablename__ = "stock_movements"

    __table_args__ = (
        UniqueConstraint(
            "source_type",
            "source_id",
            "product_id",
            "movement_type",
            name="uq_stock_movement_source_product_type",
        ),
        CheckConstraint(
            "quantity_in >= 0",
            name="ck_stock_movement_quantity_in_nonnegative",
        ),
        CheckConstraint(
            "quantity_out >= 0",
            name="ck_stock_movement_quantity_out_nonnegative",
        ),
        CheckConstraint(
            (
                "(quantity_in > 0 AND quantity_out = 0) "
                "OR "
                "(quantity_out > 0 AND quantity_in = 0)"
            ),
            name="ck_stock_movement_single_direction",
        ),
        CheckConstraint(
            "stock_before >= 0",
            name="ck_stock_movement_stock_before_nonnegative",
        ),
        CheckConstraint(
            "stock_after >= 0",
            name="ck_stock_movement_stock_after_nonnegative",
        ),
        CheckConstraint(
            "unit_cost >= 0",
            name="ck_stock_movement_unit_cost_nonnegative",
        ),
        CheckConstraint(
            "movement_value >= 0",
            name="ck_stock_movement_value_nonnegative",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    movement_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    source_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    source_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    quantity_in: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        nullable=False,
    )

    quantity_out: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        nullable=False,
    )

    stock_before: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    stock_after: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        default=0,
        nullable=False,
    )

    movement_value: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        default=0,
        nullable=False,
    )

    performed_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    movement_date: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    product = relationship(
        "Product",
    )

    performer = relationship(
        "User",
        foreign_keys=[performed_by],
    )