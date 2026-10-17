"""Owner-only emergency recovery review. NO customer ERP access or password changes."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from platform_owner.backend.database import OwnerBase


class OwnerBossRecoveryCase(OwnerBase):
    __tablename__ = "owner_boss_recovery_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("owner_companies.id"), nullable=False, index=True,
    )
    reason: Mapped[str] = mapped_column(String(32), nullable=False)
    requester_role: Mapped[str] = mapped_column(String(30), nullable=False)
    requester_email: Mapped[str] = mapped_column(String(254), nullable=False)
    status: Mapped[str] = mapped_column(String(35), nullable=False, default="OPEN")
    verification_method: Mapped[str | None] = mapped_column(String(45))
    evidence_reference: Mapped[str | None] = mapped_column(String(80))
    opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    opened_by_id: Mapped[int] = mapped_column(ForeignKey("owner_accounts.id"), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    verified_by_id: Mapped[int | None] = mapped_column(ForeignKey("owner_accounts.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("owner_accounts.id"))
    decision_code: Mapped[str | None] = mapped_column(String(35))


class OwnerBossRecoveryEvent(OwnerBase):
    __tablename__ = "owner_boss_recovery_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("owner_boss_recovery_cases.id"), nullable=False, index=True,
    )
    owner_id: Mapped[int] = mapped_column(ForeignKey("owner_accounts.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(35), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
