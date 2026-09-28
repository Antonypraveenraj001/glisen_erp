from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database.base import Base


class SystemState(Base):
    __tablename__ = "system_state"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    # Used while restore / financial-year transition
    # is performing protected operations.
    maintenance_mode: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    maintenance_reason: Mapped[
        str | None
    ] = mapped_column(
        String(500),
        nullable=True,
    )

    restore_in_progress: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    year_transition_in_progress: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    updated_at: Mapped[
        object
    ] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )