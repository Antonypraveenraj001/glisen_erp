from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    # ============================================================
    # BUSINESS DEFAULTS
    # ============================================================

    currency_code: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    timezone: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Asia/Kolkata",
        server_default="Asia/Kolkata",
    )

    default_gst_percent: Mapped[
        Decimal
    ] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("18.00"),
        server_default="18.00",
    )

    default_page_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
        server_default="10",
    )

    # ============================================================
    # FINANCIAL YEAR
    #
    # Indian FY default:
    # 01-Apr to 31-Mar
    # ============================================================

    financial_year_start_month: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        default=4,
        server_default="4",
    )

    financial_year_start_day: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    # ============================================================
    # DOCUMENT PREFIXES
    #
    # Number generation remains inside each module.
    # These are configuration values only.
    # ============================================================

    enquiry_prefix: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ENQ",
        server_default="ENQ",
    )

    proforma_prefix: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PRO",
        server_default="PRO",
    )

    production_prefix: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PROD",
        server_default="PROD",
    )

    finished_goods_receipt_prefix: Mapped[
        str
    ] = mapped_column(
        String(20),
        nullable=False,
        default="FGR",
        server_default="FGR",
    )

    invoice_prefix: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="INV",
        server_default="INV",
    )

    credit_note_prefix: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="CN",
        server_default="CN",
    )

    sequence_digits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=4,
        server_default="4",
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