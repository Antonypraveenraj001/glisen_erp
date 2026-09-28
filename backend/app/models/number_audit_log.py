from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class NumberAuditLog(Base):
    __tablename__ = "number_audit_logs"

    __table_args__ = (
        UniqueConstraint(
            "document_type",
            "document_number",
            name=(
                "uq_number_audit_"
                "document_type_number"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    financial_year_id: Mapped[int] = mapped_column(
        ForeignKey(
            "financial_years.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ENQUIRY
    # PROFORMA
    # PRODUCTION
    # FGR
    # INVOICE
    # CREDIT_NOTE
    document_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    document_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # SKIPPED
    # RESERVED
    action: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    performed_by: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    performed_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )