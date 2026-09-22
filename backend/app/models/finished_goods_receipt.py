from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
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


class FinishedGoodsReceipt(Base):
    __tablename__ = "finished_goods_receipts"

    __table_args__ = (
        UniqueConstraint(
            "production_order_id",
            name=(
                "uq_finished_goods_receipt_"
                "production_order"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    receipt_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    production_order_id: Mapped[int] = mapped_column(
        ForeignKey(
            "production_orders.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # LEGACY STOCK PRODUCT LINK
    # ========================================================
    #
    # Existing historical records may contain product_id.
    #
    # New manufactured outputs do not need to exist in the
    # purchased Products table, therefore this is optional.
    # ========================================================

    product_id: Mapped[
        int | None
    ] = mapped_column(
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    quantity_received: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(
            12,
            2,
        ),
        nullable=False,
    )

    # These remain for historical/audit compatibility.
    # Manufactured Finished Products do not increase Store stock.

    stock_before: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(
            12,
            2,
        ),
        nullable=False,
    )

    stock_after: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(
            12,
            2,
        ),
        nullable=False,
    )

    received_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    received_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    remarks: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    production_order = relationship(
        "ProductionOrder",
    )

    product = relationship(
        "Product",
    )

    receiver = relationship(
        "User",
        foreign_keys=[
            received_by
        ],
    )