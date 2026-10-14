from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SystemAlert(Base):
    """
    Persistent system alerts.

    Alerts are shared by Boss accounts and are not deleted
    when acknowledged or resolved.

    The dedupe_key prevents repeated scheduler attempts from
    creating duplicate alerts for the same incident.
    """

    __tablename__ = "system_alerts"

    __table_args__ = (
        UniqueConstraint(
            "dedupe_key",
            name="uq_system_alerts_dedupe_key",
        ),
        Index(
            "ix_system_alerts_category",
            "category",
        ),
        Index(
            "ix_system_alerts_state",
            "resolved_at",
            "acknowledged_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    dedupe_key: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="ERROR",
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    occurrence_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="1",
    )

    first_occurred_at = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    last_occurred_at = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    acknowledged_at = mapped_column(
        DateTime,
        nullable=True,
    )

    acknowledged_by_id = mapped_column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    resolved_at = mapped_column(
        DateTime,
        nullable=True,
    )
