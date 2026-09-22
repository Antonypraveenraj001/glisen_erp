from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class FinishedGoodsReceiptCreate(BaseModel):
    """
    Optional information supplied when completed
    Production is moved into Finished Products.

    Quantity and manufactured product identity come
    from the Production Order.
    """

    remarks: str | None = Field(
        default=None,
        max_length=1000,
    )


class FinishedGoodsReceiptResponse(BaseModel):

    id: int

    receipt_number: str

    production_order_id: int

    # Legacy purchased Product reference only.
    # New manufactured products normally use NULL.
    product_id: int | None = None

    quantity_received: Decimal

    stock_before: Decimal
    stock_after: Decimal

    received_by: int
    received_at: datetime

    remarks: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )