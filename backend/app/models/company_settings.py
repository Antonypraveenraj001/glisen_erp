from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.database.base import Base


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ============================================================
    # COMPANY IDENTITY
    # ============================================================

    company_name = Column(
        String(200),
        nullable=False,
    )

    gst_number = Column(
        String(15),
        nullable=False,
        unique=True,
        index=True,
    )

    pan_number = Column(
        String(10),
        nullable=True,
        index=True,
    )

    state_name = Column(
        String(100),
        nullable=False,
    )

    state_code = Column(
        String(2),
        nullable=False,
        index=True,
    )

    address = Column(
        Text,
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

    website = Column(
        String(200),
        nullable=True,
    )

    # Logo is stored as a file in the configured upload folder.
    # Only the relative/path reference is stored in MySQL.
    logo_path = Column(
        String(500),
        nullable=True,
    )

    # ============================================================
    # BANK / PAYMENT DETAILS
    # ============================================================

    bank_account_name = Column(
        String(200),
        nullable=True,
    )

    bank_name = Column(
        String(200),
        nullable=True,
    )

    bank_account_number = Column(
        String(50),
        nullable=True,
    )

    bank_ifsc_code = Column(
        String(20),
        nullable=True,
    )

    bank_branch = Column(
        String(200),
        nullable=True,
    )

    upi_id = Column(
        String(100),
        nullable=True,
    )

    # ============================================================
    # AUDIT
    # ============================================================

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