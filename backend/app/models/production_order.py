from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy.sql import func

from app.database.base import Base


class ProductionOrder(Base):
    __tablename__ = "production_orders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    production_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    proforma_id: Mapped[int] = mapped_column(
        ForeignKey(
            "proformas.id",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # SOURCE PROFORMA ITEM
    # ========================================================

    proforma_item_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "proforma_items.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    # ========================================================
    # MANUFACTURED PRODUCT
    # ========================================================
    #
    # product_name is the source of truth for what Glisen
    # manufactures.
    #
    # This is separate from purchased Products / Stock.
    # ========================================================

    product_name: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Nos",
    )

    # ========================================================
    # LEGACY PRODUCT MASTER LINK
    # ========================================================
    #
    # Existing historical Production Orders may still point
    # to products.id.
    #
    # New manufactured jobs normally leave this NULL.
    # ========================================================

    product_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "products.id",
        ),
        nullable=True,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Pending",
        index=True,
    )

    planned_start_date: Mapped[
        date | None
    ] = mapped_column(
        Date,
        nullable=True,
    )

    actual_start_date: Mapped[
        date | None
    ] = mapped_column(
        Date,
        nullable=True,
    )

    actual_end_date: Mapped[
        date | None
    ] = mapped_column(
        Date,
        nullable=True,
    )

    notes: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    proforma_item = relationship(
        "ProformaItem",
    )

    # --------------------------------------------------------
    # LINKED PROFORMA
    #
    # This relationship allows shared Production Order
    # responses to expose:
    #
    # - Proforma Number
    # - Customer / Company Name
    #
    # Store users can therefore select the correct Production
    # Order without being granted access to the Proforma module.
    # --------------------------------------------------------

    proforma = relationship(
        "Proforma",
        foreign_keys=[
            proforma_id,
        ],
        lazy="selectin",
    )

    # --------------------------------------------------------
    # HUMAN-READABLE PROFORMA CONTEXT
    # --------------------------------------------------------

    @property
    def proforma_number(
        self,
    ) -> str | None:

        if (
            self.proforma
            is None
        ):
            return None

        return (
            self.proforma
            .proforma_number
        )

    @property
    def company_name(
        self,
    ) -> str | None:

        if (
            self.proforma
            is None
        ):
            return None

        return (
            self.proforma
            .company_name
        )

    # --------------------------------------------------------
    # PRODUCTION CHILD RECORDS
    # --------------------------------------------------------

    operations = relationship(
        "ProductionOperation",
        back_populates="production_order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    materials = relationship(
        "ProductionMaterial",
        back_populates="production_order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )