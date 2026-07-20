from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database.base import Base


class PurchaseBillItem(Base):
    __tablename__ = "purchase_bill_items"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    purchase_bill_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_bills.id"),
        nullable=False,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    purchase_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    gst_percentage: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    line_total: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    purchase_bill = relationship(
        "PurchaseBill",
        back_populates="items",
    )

    product = relationship(
        "Product",
    )

    created_user = relationship(
        "User",
    )