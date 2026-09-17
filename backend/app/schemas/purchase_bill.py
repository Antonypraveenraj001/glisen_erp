from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class PurchaseBillItemBase(BaseModel):
    product_id: int
    quantity: Decimal
    purchase_price: Decimal
    gst_percentage: Decimal
    line_total: Decimal


class PurchaseBillItemCreate(
    PurchaseBillItemBase
):
    pass


class PurchaseBillItemResponse(
    PurchaseBillItemBase
):
    id: int

    model_config = ConfigDict(
        from_attributes=True,
    )


class PurchaseBillBase(BaseModel):
    bill_number: str
    supplier_id: int
    bill_date: datetime

    # Supplier credit period.
    # 0 means payment is due immediately.
    credit_days: int = Field(
        default=0,
        ge=0,
    )

    subtotal: Decimal
    total_gst: Decimal
    grand_total: Decimal

    remarks: str | None = None


class PurchaseBillCreate(
    PurchaseBillBase
):
    items: list[
        PurchaseBillItemCreate
    ]


class PurchaseBillUpdate(BaseModel):
    bill_date: datetime

    # None means preserve the existing
    # credit terms during an old-style update.
    credit_days: int | None = Field(
        default=None,
        ge=0,
    )

    subtotal: Decimal
    total_gst: Decimal
    grand_total: Decimal

    remarks: str | None = None


class PurchaseBillItemStatisticsResponse(
    BaseModel
):
    total_purchase_bills: int
    active_purchase_bills: int
    total_purchase_value: Decimal
    total_quantity_purchased: Decimal


class PurchaseBillResponse(
    PurchaseBillBase
):
    id: int

    due_date: datetime | None = None

    created_by: int
    created_at: datetime

    items: list[
        PurchaseBillItemResponse
    ]

    model_config = ConfigDict(
        from_attributes=True,
    )