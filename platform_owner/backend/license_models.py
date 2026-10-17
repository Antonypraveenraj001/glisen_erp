"""Owner-only subscription and confirmed-payment records; NOT ERP access keys.

Terms are immutable payment history. Expiry is computed on every read from the
business date so an offline scheduler cannot silently grant an overdue license.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from platform_owner.backend.database import OwnerBase


class OwnerLicensePlan(OwnerBase):
    __tablename__ = "owner_license_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("owner_companies.id"), nullable=False, unique=True
    )
    plan: Mapped[str] = mapped_column(String(10), nullable=False)
    price_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    updated_by_id: Mapped[int] = mapped_column(ForeignKey("owner_accounts.id"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class OwnerLicenseTerm(OwnerBase):
    __tablename__ = "owner_license_terms"
    __table_args__ = (
        UniqueConstraint("company_id", "start_on", name="uq_owner_license_company_start"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("owner_companies.id"), nullable=False, index=True
    )
    plan: Mapped[str] = mapped_column(String(10), nullable=False)
    amount_received_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_reference: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    start_on: Mapped[date] = mapped_column(Date, nullable=False)
    expires_on: Mapped[date] = mapped_column(Date, nullable=False)
    confirmed_by_id: Mapped[int] = mapped_column(ForeignKey("owner_accounts.id"), nullable=False)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
