from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    product_code: str
    product_name: str
    description: str | None = None
    category: str
    unit: str
    hsn_code: str
    gst_percentage: Decimal
    purchase_price: Decimal
    selling_price: Decimal
    minimum_stock: int = 0
    maximum_stock: int = 0
    current_stock: int = 0
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )