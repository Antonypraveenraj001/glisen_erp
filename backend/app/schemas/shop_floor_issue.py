from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class ShopFloorIssueCreate(BaseModel):
    production_material_id: int = Field(
        gt=0,
    )

    quantity: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    remarks: str | None = Field(
        default=None,
        max_length=1000,
    )


class ShopFloorIssueResponse(BaseModel):
    id: int

    issue_number: str

    production_order_id: int
    production_material_id: int
    product_id: int

    quantity_issued: Decimal

    unit_cost: Decimal
    total_cost: Decimal

    stock_before: Decimal
    stock_after: Decimal

    issued_by: int
    issued_at: datetime

    remarks: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class ShopFloorIssueSummaryResponse(BaseModel):
    production_order_id: int

    total_issues: int

    total_quantity_issued: Decimal
    total_issue_cost: Decimal