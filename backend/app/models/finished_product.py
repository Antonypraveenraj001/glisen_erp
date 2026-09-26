from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database.base import Base


class FinishedProduct(Base):
    __tablename__ = "finished_products"

    __table_args__ = (
        UniqueConstraint(
            "production_order_id",
            name=(
                "uq_finished_product_"
                "production_order"
            ),
        ),
        UniqueConstraint(
            "finished_goods_receipt_id",
            name=(
                "uq_finished_product_"
                "goods_receipt"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    finished_product_number: Mapped[
        str
    ] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    # ========================================================
    # MANUFACTURED PRODUCT
    # ========================================================

    product_name: Mapped[
        str
    ] = mapped_column(
        String(500),
        nullable=False,
    )

    unit: Mapped[
        str
    ] = mapped_column(
        String(50),
        nullable=False,
        default="Nos",
    )

    # ========================================================
    # LEGACY PRODUCT MASTER
    # ========================================================

    product_master_id: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    # ========================================================
    # PRODUCTION TRACEABILITY
    # ========================================================

    production_order_id: Mapped[
        int
    ] = mapped_column(
        ForeignKey(
            "production_orders.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # COMPLETION TRACEABILITY
    # ========================================================

    finished_goods_receipt_id: Mapped[
        int
    ] = mapped_column(
        ForeignKey(
            "finished_goods_receipts.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # IMMUTABLE PRODUCTION COST SNAPSHOT
    #
    # These values will be calculated when production is
    # completed and the Finished Product is created.
    #
    # They must NOT change later when salary, rent or another
    # regular overhead is updated.
    # ========================================================

    material_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    operation_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    direct_expense_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    allocated_staff_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    allocated_overhead_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    total_production_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    unit_cost: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )

    # NULL means an older Finished Product has not yet had
    # its historical production-cost snapshot generated.
    cost_snapshot_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
    )

    # ========================================================
    # AUDIT
    # ========================================================

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

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    product_master = relationship(
        "Product",
    )

    production_order = relationship(
        "ProductionOrder",
    )

    finished_goods_receipt = relationship(
        "FinishedGoodsReceipt",
    )

    creator = relationship(
        "User",
        foreign_keys=[
            created_by
        ],
    )