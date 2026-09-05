from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class FinalBillItemBase(BaseModel):
    product_id: int | None = None
    description: str | None = None
    hsn_code: str | None = None
    quantity: Decimal = Field(gt=0)
    unit: str | None = None
    unit_price: Decimal = Field(ge=0)
    discount_percent: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    discount_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    taxable_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    gst_percent: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    cgst_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    sgst_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    igst_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    tax_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    line_total: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )


class FinalBillItemResponse(
    FinalBillItemBase
):
    id: int
    final_bill_id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class FinalBillCreateFromProforma(
    BaseModel
):
    invoice_date: date | None = None
    notes: str | None = None


class FinalBillUpdate(BaseModel):
    invoice_date: date | None = None
    company_name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    gst_number: str | None = None
    billing_address: str | None = None
    shipping_address: str | None = None
    payment_terms: str | None = None
    delivery_terms: str | None = None
    notes: str | None = None


class FinalBillResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_date: date

    proforma_id: int
    customer_id: int

    company_name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    gst_number: str | None = None

    billing_address: str | None = None
    shipping_address: str | None = None

    payment_terms: str | None = None
    delivery_terms: str | None = None
    notes: str | None = None

    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal

    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    tax_amount: Decimal

    grand_total: Decimal

    invoice_type: str
    status: str
    revision_number: int
    parent_invoice_id: int | None = None

    created_by: int

    created_at: datetime
    updated_at: datetime

    items: list[FinalBillItemResponse]

    model_config = ConfigDict(
        from_attributes=True
    )