from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class FinishedGoodsReceiptCreate(BaseModel):
    """
    Optional information supplied by the Store/Production user.

    Quantity, product, stock values and user are all controlled
    by the backend from the completed Production Order.
    """

    remarks: str | None = Field(
        default=None,
        max_length=1000,
    )


class FinishedGoodsReceiptResponse(BaseModel):
    id: int
    receipt_number: str

    production_order_id: int
    product_id: int

    quantity_received: Decimal

    stock_before: Decimal
    stock_after: Decimal

    received_by: int
    received_at: datetime

    remarks: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )