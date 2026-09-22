from datetime import (
    date,
    datetime,
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


# ============================================================
# COMMON ENQUIRY FIELDS
# ============================================================


class EnquiryCommon(BaseModel):

    enquiry_date: date

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


# ============================================================
# CREATE
#
# GSTIN is required for every NEW enquiry.
# customer_id is NOT supplied by the frontend.
# Backend creates/reuses Customer automatically.
# ============================================================


class EnquiryCreate(
    EnquiryCommon
):

    gst_number: str = Field(
        min_length=1,
        max_length=50,
    )


# ============================================================
# UPDATE
# ============================================================


class EnquiryUpdate(BaseModel):

    enquiry_date: date | None = None

    company_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    gst_number: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
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


# ============================================================
# RESPONSE
#
# GSTIN remains optional here ONLY because old enquiries
# already exist in the database without GST details.
#
# New enquiries still require GSTIN through EnquiryCreate.
# ============================================================


class EnquiryResponse(
    EnquiryCommon
):

    id: int

    enquiry_number: str

    # Internal relationship only.
    # Never needs to be shown to the ERP user.
    customer_id: int

    gst_number: str | None = None

    created_at: datetime

    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )