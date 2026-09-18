from datetime import datetime
from decimal import Decimal

from pydantic import (
    AliasPath,
    BaseModel,
    ConfigDict,
    Field,
)


# ================================================================
# PURCHASE BILL ITEM
# ================================================================

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

    # Friendly Product information for the frontend.
    # The database still stores product_id as the relationship key.
    product_name: str = Field(
        validation_alias=AliasPath(
            "product",
            "product_name",
        )
    )

    description: str | None = Field(
        default=None,
        validation_alias=AliasPath(
            "product",
            "description",
        ),
    )

    hsn_code: str = Field(
        validation_alias=AliasPath(
            "product",
            "hsn_code",
        )
    )

    unit: str = Field(
        validation_alias=AliasPath(
            "product",
            "unit",
        )
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


# ================================================================
# PURCHASE BILL
# ================================================================

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

    # None preserves existing credit terms.
    credit_days: int | None = Field(
        default=None,
        ge=0,
    )

    subtotal: Decimal
    total_gst: Decimal
    grand_total: Decimal

    remarks: str | None = None


# ================================================================
# STATISTICS
# ================================================================

class PurchaseBillItemStatisticsResponse(
    BaseModel
):
    total_purchase_bills: int
    active_purchase_bills: int
    total_purchase_value: Decimal
    total_quantity_purchased: Decimal


# ================================================================
# RESPONSE
# ================================================================

class PurchaseBillResponse(
    PurchaseBillBase
):
    id: int

    # Friendly Supplier name for the frontend.
    supplier_name: str = Field(
        validation_alias=AliasPath(
            "supplier",
            "company_name",
        )
    )

    due_date: datetime | None = None

    created_by: int
    created_at: datetime

    items: list[
        PurchaseBillItemResponse
    ]

    model_config = ConfigDict(
        from_attributes=True,
    )