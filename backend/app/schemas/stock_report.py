from decimal import Decimal

from pydantic import BaseModel


class StockSummaryItem(BaseModel):
    product_id: int
    product_code: str
    product_name: str
    category: str | None
    unit: str
    current_stock: Decimal
    minimum_stock: Decimal
    maximum_stock: Decimal
    purchase_price: Decimal
    stock_value: Decimal
    stock_status: str


class StockSummaryResponse(BaseModel):
    total_products: int
    total_stock_quantity: Decimal
    total_stock_value: Decimal
    low_stock_products: int
    out_of_stock_products: int
    items: list[StockSummaryItem]