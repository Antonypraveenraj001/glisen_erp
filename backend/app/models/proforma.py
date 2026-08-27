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


class Proforma(Base):
    __tablename__ = "proformas"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    proforma_number = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    proforma_date = Column(
        Date,
        nullable=False,
    )

    enquiry_id = Column(
        Integer,
        ForeignKey("enquiries.id"),
        nullable=False,
        index=True,
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
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

    billing_address = Column(
        String(500),
        nullable=True,
    )

    shipping_address = Column(
        String(500),
        nullable=True,
    )

    validity_days = Column(
        Integer,
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

    terms_and_conditions = Column(
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

    status = Column(
        String(50),
        nullable=False,
        default="Draft",
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    items = relationship(
        "ProformaItem",
        back_populates="proforma",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )