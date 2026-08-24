from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class EnquiryBase(BaseModel):
    enquiry_date: date
    customer_id: int

    company_name: str = Field(
        min_length=1,
        max_length=200,
    )

    contact_person: str | None = Field(
        default=None,
        max_length=150,
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    email: str | None = Field(
        default=None,
        max_length=150,
    )

    machine_name: str | None = Field(
        default=None,
        max_length=200,
    )

    machine_model: str | None = Field(
        default=None,
        max_length=150,
    )

    application: str | None = Field(
        default=None,
        max_length=300,
    )

    quantity: int | None = Field(
        default=None,
        ge=1,
    )

    requirements: str | None = None

    remarks: str | None = None

    status: str = Field(
        default="New",
        max_length=50,
    )


class EnquiryCreate(EnquiryBase):
    pass


class EnquiryUpdate(BaseModel):
    enquiry_date: date | None = None
    customer_id: int | None = None

    company_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    contact_person: str | None = Field(
        default=None,
        max_length=150,
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    email: str | None = Field(
        default=None,
        max_length=150,
    )

    machine_name: str | None = Field(
        default=None,
        max_length=200,
    )

    machine_model: str | None = Field(
        default=None,
        max_length=150,
    )

    application: str | None = Field(
        default=None,
        max_length=300,
    )

    quantity: int | None = Field(
        default=None,
        ge=1,
    )

    requirements: str | None = None

    remarks: str | None = None

    status: str | None = Field(
        default=None,
        max_length=50,
    )


class EnquiryResponse(EnquiryBase):
    id: int
    enquiry_number: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)