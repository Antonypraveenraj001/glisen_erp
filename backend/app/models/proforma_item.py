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


class ProformaItem(Base):
    __tablename__ = "proforma_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    proforma_id = Column(
        Integer,
        ForeignKey(
            "proformas.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=True,
        index=True,
    )

    description = Column(
        Text,
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

    tax_percent = Column(
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

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    proforma = relationship(
        "Proforma",
        back_populates="items",
    )