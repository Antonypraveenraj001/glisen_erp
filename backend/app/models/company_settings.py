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