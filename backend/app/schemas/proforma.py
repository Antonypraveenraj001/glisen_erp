from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# PROFORMA ITEM SCHEMAS
# ============================================================


class ProformaItemBase(BaseModel):
    product_id: Optional[int] = None

    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
    )

    quantity: Decimal = Field(
        ...,
        gt=0,
    )

    unit: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    unit_price: Decimal = Field(
        ...,
        ge=0,
    )

    discount_percent: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        le=100,
    )

    tax_percent: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        le=100,
    )


class ProformaItemCreate(ProformaItemBase):
    pass


class ProformaItemUpdate(BaseModel):
    product_id: Optional[int] = None

    description: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=500,
    )

    quantity: Optional[Decimal] = Field(
        default=None,
        gt=0,
    )

    unit: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    unit_price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    discount_percent: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=100,
    )

    tax_percent: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=100,
    )


class ProformaItemResponse(ProformaItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proforma_id: int

    taxable_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal


# ============================================================
# PROFORMA BASE SCHEMA
# ============================================================


class ProformaBase(BaseModel):
    proforma_date: date

    enquiry_id: Optional[int] = None

    customer_id: int = Field(
        ...,
        gt=0,
    )

    company_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    contact_person: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    email: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    billing_address: Optional[str] = None

    shipping_address: Optional[str] = None

    payment_terms: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    delivery_terms: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    validity_days: Optional[int] = Field(
        default=30,
        ge=1,
    )

    notes: Optional[str] = None

    terms_and_conditions: Optional[str] = None

    status: str = Field(
        default="Draft",
        max_length=50,
    )


# ============================================================
# PROFORMA CREATE
# ============================================================


class ProformaCreate(ProformaBase):
    items: List[ProformaItemCreate] = Field(
        ...,
        min_length=1,
    )


# ============================================================
# PROFORMA UPDATE
# ============================================================


class ProformaUpdate(BaseModel):
    proforma_date: Optional[date] = None

    enquiry_id: Optional[int] = None

    customer_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    company_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    contact_person: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    email: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    billing_address: Optional[str] = None

    shipping_address: Optional[str] = None

    payment_terms: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    delivery_terms: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    validity_days: Optional[int] = Field(
        default=None,
        ge=1,
    )

    notes: Optional[str] = None

    terms_and_conditions: Optional[str] = None

    status: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    items: Optional[List[ProformaItemCreate]] = None


# ============================================================
# PROFORMA RESPONSE
# ============================================================


class ProformaResponse(ProformaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

    proforma_number: str

    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    grand_total: Decimal

    created_at: datetime
    updated_at: Optional[datetime] = None

    items: List[ProformaItemResponse] = []


# ============================================================
# PROFORMA LIST RESPONSE
# ============================================================


class ProformaListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proforma_number: str
    proforma_date: date

    enquiry_id: Optional[int] = None
    customer_id: int

    company_name: str

    contact_person: Optional[str] = None

    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    grand_total: Decimal

    status: str

    created_at: datetime
    updated_at: Optional[datetime] = None


# ============================================================
# STATUS UPDATE
# ============================================================


class ProformaStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )