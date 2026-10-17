"""Owner-only company directory. NEVER maps or connects to customer ERP tables.

The status here is a registry/onboarding status. It cannot authorize or revoke
ERP access until an independently tested per-instance enforcement channel ships.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from platform_owner.backend.database import OwnerBase


class OwnerCompany(OwnerBase):
    __tablename__ = "owner_companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(15), unique=True)
    boss_email: Mapped[str] = mapped_column(String(254), nullable=False)
    recovery_email: Mapped[str | None] = mapped_column(String(254))
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PENDING_SETUP"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("owner_accounts.id"), nullable=False
    )


class OwnerCompanyEvent(OwnerBase):
    __tablename__ = "owner_company_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("owner_companies.id"), nullable=False, index=True
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("owner_accounts.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
