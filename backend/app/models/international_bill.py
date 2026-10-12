"""Standalone international invoices; never linked to domestic sales or stock."""

from sqlalchemy import (
    Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func,
)
from sqlalchemy.orm import relationship

from app.database.base import Base


class InternationalBill(Base):
    __tablename__ = "international_bills"

    id = Column(Integer, primary_key=True)
    bill_number = Column(String(40), nullable=False, unique=True, index=True)
    bill_date = Column(Date, nullable=False, index=True)

    seller_name = Column(String(200), nullable=False)
    seller_address = Column(Text, nullable=True)
    seller_contact = Column(String(200), nullable=True)

    customer_name = Column(String(200), nullable=False)
    customer_country = Column(String(120), nullable=False)
    customer_address = Column(Text, nullable=True)
    customer_contact = Column(String(200), nullable=True)

    currency_code = Column(String(3), nullable=False)
    cost_currency_code = Column(String(3), nullable=False)
    # Number of cost-currency units per ONE invoice-currency unit.
    exchange_rate = Column(Numeric(18, 6), nullable=False)
    tax_label = Column(String(60), nullable=False, default="Tax")
    payment_terms = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    subtotal = Column(Numeric(18, 2), nullable=False)
    discount_amount = Column(Numeric(18, 2), nullable=False)
    taxable_amount = Column(Numeric(18, 2), nullable=False)
    tax_amount = Column(Numeric(18, 2), nullable=False)
    grand_total = Column(Numeric(18, 2), nullable=False)
    sales_cost_currency = Column(Numeric(18, 2), nullable=False)
    # NULL until the production/manual cost of every line is known.
    cost_amount = Column(Numeric(18, 2), nullable=True)
    gross_profit = Column(Numeric(18, 2), nullable=True)

    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    items = relationship(
        "InternationalBillItem",
        back_populates="bill",
        order_by="InternationalBillItem.id",
        cascade="all, delete-orphan",
    )


class InternationalBillItem(Base):
    __tablename__ = "international_bill_items"

    id = Column(Integer, primary_key=True)
    international_bill_id = Column(
        Integer,
        ForeignKey("international_bills.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Read-only provenance reference (no FK to production/domestic workflow).
    finished_product_id = Column(Integer, nullable=True)
    finished_product_number = Column(String(30), nullable=True)
    description = Column(String(500), nullable=False)
    unit = Column(String(50), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_price = Column(Numeric(18, 2), nullable=False)
    discount_percent = Column(Numeric(5, 2), nullable=False)
    tax_percent = Column(Numeric(5, 2), nullable=False)
    line_subtotal = Column(Numeric(18, 2), nullable=False)
    discount_amount = Column(Numeric(18, 2), nullable=False)
    taxable_amount = Column(Numeric(18, 2), nullable=False)
    tax_amount = Column(Numeric(18, 2), nullable=False)
    line_total = Column(Numeric(18, 2), nullable=False)
    # A frozen snapshot of production cost, or manually entered cost.
    unit_cost = Column(Numeric(18, 2), nullable=True)
    cost_amount = Column(Numeric(18, 2), nullable=True)
    cost_source = Column(String(30), nullable=False)

    bill = relationship("InternationalBill", back_populates="items")
