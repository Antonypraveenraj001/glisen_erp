from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class DocumentSettings(Base):
    __tablename__ = "document_settings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    # ============================================================
    # PRINT MODE
    # ============================================================
    #
    # company_header
    # letterhead
    # ============================================================

    default_print_mode: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="company_header",
        server_default="company_header",
    )

    letterhead_top_space_mm: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(6, 2),
        nullable=False,
        default=Decimal("40.00"),
        server_default="40.00",
    )

    # ============================================================
    # COMPANY HEADER VISIBILITY
    # ============================================================

    show_logo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    show_gst_number: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    show_contact_details: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    show_bank_details_on_proforma: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    show_bank_details_on_final_bill: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    # ============================================================
    # SIGNATURE / FOOTER
    # ============================================================

    show_authorized_signature: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    authorized_signatory_name: Mapped[
        str | None
    ] = mapped_column(
        String(200),
        nullable=True,
    )

    authorized_signatory_designation: Mapped[
        str | None
    ] = mapped_column(
        String(150),
        nullable=True,
    )

    footer_text: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    # ============================================================
    # PROFORMA DEFAULTS
    # ============================================================

    proforma_validity_days: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        default=30,
        server_default="30",
    )

    proforma_payment_terms: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    proforma_delivery_terms: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    proforma_terms_and_conditions: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    # ============================================================
    # AUDIT
    # ============================================================

    created_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )