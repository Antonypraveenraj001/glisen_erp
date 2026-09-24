from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class CustomerUpdate(BaseModel):

    company_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    contact_person: str | None = Field(
        default=None,
        max_length=150,
    )

    email: str | None = Field(
        default=None,
        max_length=150,
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    address: str | None = Field(
        default=None,
        max_length=500,
    )

    city: str | None = Field(
        default=None,
        max_length=100,
    )

    state: str | None = Field(
        default=None,
        max_length=100,
    )

    pincode: str | None = Field(
        default=None,
        max_length=20,
    )


class CustomerResponse(BaseModel):

    id: int

    customer_code: str

    company_name: str

    contact_person: str | None = None

    email: str | None = None

    phone: str | None = None

    gst_number: str | None = None

    address: str | None = None

    city: str | None = None

    state: str | None = None

    pincode: str | None = None

    # Legacy/internal field.
    # Not exposed as a business control in the frontend.
    is_active: bool

    created_at: datetime

    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )