from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
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
            name="uq_finished_product_production_order",
        ),
        UniqueConstraint(
            "finished_goods_receipt_id",
            name="uq_finished_product_goods_receipt",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    finished_product_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    # ========================================================
    # PRODUCT / MACHINE THAT GLISEN MANUFACTURED
    # ========================================================

    product_master_id: Mapped[int] = mapped_column(
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # PRODUCTION TRACEABILITY
    # ========================================================

    production_order_id: Mapped[int] = mapped_column(
        ForeignKey(
            "production_orders.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # FINISHED GOODS / STOCK TRACEABILITY
    # ========================================================

    finished_goods_receipt_id: Mapped[int] = mapped_column(
        ForeignKey(
            "finished_goods_receipts.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # AUDIT
    # ========================================================

    created_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
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
        foreign_keys=[created_by],
    )