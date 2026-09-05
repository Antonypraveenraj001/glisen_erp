from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class StockMovementItem(BaseModel):
    movement_type: str
    reference_id: int
    reference_number: str
    product_id: int
    product_code: str
    product_name: str
    quantity_in: Decimal
    quantity_out: Decimal
    stock_before: Decimal | None = None
    stock_after: Decimal | None = None
    unit_cost: Decimal
    movement_value: Decimal
    movement_date: datetime
    remarks: str | None = None


class StockMovementResponse(BaseModel):
    total_movements: int
    total_quantity_in: Decimal
    total_quantity_out: Decimal
    total_in_value: Decimal
    total_out_value: Decimal
    items: list[StockMovementItem]