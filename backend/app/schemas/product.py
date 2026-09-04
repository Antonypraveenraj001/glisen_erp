from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class ProductBase(BaseModel):
    product_code: str
    product_name: str

    description: str | None = None

    category: str
    unit: str
    hsn_code: str

    gst_percentage: Decimal = Field(
        ge=0,
    )

    purchase_price: Decimal = Field(
        ge=0,
    )

    selling_price: Decimal = Field(
        ge=0,
    )

    minimum_stock: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    maximum_stock: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    current_stock: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

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