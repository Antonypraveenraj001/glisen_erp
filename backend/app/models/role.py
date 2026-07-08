"""
Role model for Role-Based Access Control (RBAC).

A role represents a collection of permissions that can be assigned
to one or more users.
"""

from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.database.base import Base


class Role(Base):
    """
    Represents a system role.

    Examples:
    - Boss
    - Assistant
    - Purchase Manager
    """

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    users: Mapped[list["User"]] = relationship(
    "User",
    back_populates="role",
    )

    permissions: Mapped[list["RolePermission"]] = relationship(
    "RolePermission",
    back_populates="role",
    cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Role(name='{self.name}')>"