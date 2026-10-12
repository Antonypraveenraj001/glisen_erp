"""Only self-contained international-bill data; no domestic document IDs."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class InternationalBillItemCreate(BaseModel):
    finished_product_id: int | None = Field(default=None, gt=0)
    description: str = Field(min_length=1, max_length=500)
    unit: str = Field(default="Nos", min_length=1, max_length=50)
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    unit_price: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, decimal_places=2)
    # Only used for a manual line. Product cost ALWAYS comes from FinishedProduct.
    manual_unit_cost: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=2)

    @field_validator("description", "unit", mode="after")
    @classmethod
    def trim_required(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @model_validator(mode="after")
    def prohibit_cost_override(self):
        if self.finished_product_id is not None and self.manual_unit_cost is not None:
            raise ValueError("A finished product's recorded cost cannot be overridden.")
        return self


class InternationalBillCreate(BaseModel):
    bill_date: date
    seller_name: str = Field(min_length=1, max_length=200)
    seller_address: str | None = Field(default=None, max_length=3000)
    seller_contact: str | None = Field(default=None, max_length=200)
    customer_name: str = Field(min_length=1, max_length=200)
    customer_country: str = Field(min_length=1, max_length=120)
    customer_address: str | None = Field(default=None, max_length=3000)
    customer_contact: str | None = Field(default=None, max_length=200)
    currency_code: str = Field(min_length=3, max_length=3)
    cost_currency_code: str = Field(min_length=3, max_length=3)
    exchange_rate: Decimal = Field(gt=0, max_digits=18, decimal_places=6)
    tax_label: str = Field(default="Tax", max_length=60)
    payment_terms: str | None = Field(default=None, max_length=3000)
    notes: str | None = Field(default=None, max_length=3000)
    items: list[InternationalBillItemCreate] = Field(min_length=1, max_length=100)

    @field_validator("seller_name", "customer_name", "customer_country")
    @classmethod
    def trim_names(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("currency_code", "cost_currency_code", mode="before")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        value = str(value or "").strip().upper()
        if len(value) != 3 or not value.isascii() or not value.isalpha():
            raise ValueError("Use a 3-letter currency code (such as USD or INR).")
        return value

    @field_validator("tax_label")
    @classmethod
    def normalize_tax_label(cls, value: str) -> str:
        return value.strip() or "Tax"

    @model_validator(mode="after")
    def require_unit_rate_if_same_currency(self):
        if self.currency_code == self.cost_currency_code and self.exchange_rate != 1:
            raise ValueError("Exchange rate must be 1 when invoice and cost currencies match.")
        return self


class InternationalBillItemResponse(BaseModel):
    id: int
    finished_product_id: int | None
    finished_product_number: str | None
    description: str
    unit: str
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    tax_percent: Decimal
    line_subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal
    unit_cost: Decimal | None
    cost_amount: Decimal | None
    cost_source: str

    model_config = ConfigDict(from_attributes=True)


class InternationalBillSummary(BaseModel):
    id: int
    bill_number: str
    bill_date: date
    customer_name: str
    customer_country: str
    currency_code: str
    cost_currency_code: str
    grand_total: Decimal
    gross_profit: Decimal | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InternationalBillResponse(InternationalBillSummary):
    seller_name: str
    seller_address: str | None
    seller_contact: str | None
    customer_address: str | None
    customer_contact: str | None
    exchange_rate: Decimal
    tax_label: str
    payment_terms: str | None
    notes: str | None
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    sales_cost_currency: Decimal
    cost_amount: Decimal | None
    created_by: int
    items: list[InternationalBillItemResponse]


class InternationalBillPage(BaseModel):
    items: list[InternationalBillSummary]
    total: int
    page: int
    page_size: int


class InternationalFinishedProductOption(BaseModel):
    id: int
    finished_product_number: str
    product_name: str
    unit: str
    quantity_produced: Decimal
    unit_cost: Decimal
    has_cost_snapshot: bool
