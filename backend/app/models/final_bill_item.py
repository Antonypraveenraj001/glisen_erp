from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database.base import Base


class FinalBillItem(Base):
    __tablename__ = "final_bill_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    final_bill_id = Column(
        Integer,
        ForeignKey(
            "final_bills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    hsn_code = Column(
        String(20),
        nullable=True,
    )

    quantity = Column(
        Numeric(12, 2),
        nullable=False,
        default=1,
    )

    unit = Column(
        String(30),
        nullable=True,
    )

    unit_price = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
    )

    discount_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    taxable_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    gst_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
    )

    cgst_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    sgst_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    igst_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    tax_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    line_total = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    final_bill = relationship(
        "FinalBill",
        back_populates="items",
    )