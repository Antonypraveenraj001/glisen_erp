from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database.base import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    enquiry_number = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    enquiry_date = Column(
        Date,
        nullable=False,
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    company_name = Column(
        String(200),
        nullable=False,
    )

    contact_person = Column(
        String(150),
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

    machine_name = Column(
        String(200),
        nullable=True,
    )

    machine_model = Column(
        String(150),
        nullable=True,
    )

    application = Column(
        String(300),
        nullable=True,
    )

    quantity = Column(
        Integer,
        nullable=True,
    )

    requirements = Column(
        Text,
        nullable=True,
    )

    remarks = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="New",
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )