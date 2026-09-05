from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class FinalBill(Base):
    __tablename__ = "final_bills"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    invoice_number = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    invoice_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    proforma_id = Column(
        Integer,
        ForeignKey(
            "proformas.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    customer_id = Column(
        Integer,
        ForeignKey(
            "customers.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    company_name = Column(
        String(200),
        nullable=False,
    )

    contact_person = Column(
        String(150),
        nullable=True,
    )

    phone = Column(
        String(30),
        nullable=True,
    )

    email = Column(
        String(150),
        nullable=True,
    )

    gst_number = Column(
        String(50),
        nullable=True,
    )

    billing_address = Column(
        String(500),
        nullable=True,
    )

    shipping_address = Column(
        String(500),
        nullable=True,
    )

    payment_terms = Column(
        Text,
        nullable=True,
    )

    delivery_terms = Column(
        Text,
        nullable=True,
    )

    notes = Column(
        Text,
        nullable=True,
    )

    subtotal = Column(
        Numeric(14, 2),
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

    grand_total = Column(
        Numeric(14, 2),
        nullable=False,
        default=0,
    )

    invoice_type = Column(
        String(30),
        nullable=False,
        default="Tax Invoice",
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Draft",
        index=True,
    )

    revision_number = Column(
        Integer,
        nullable=False,
        default=0,
    )

    parent_invoice_id = Column(
        Integer,
        ForeignKey(
            "final_bills.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    items = relationship(
        "FinalBillItem",
        back_populates="final_bill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    parent_invoice = relationship(
        "FinalBill",
        remote_side=[id],
    )