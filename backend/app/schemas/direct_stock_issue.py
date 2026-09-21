from decimal import Decimal

from pydantic import (
    BaseModel,
    Field,
)


class DirectStockIssueCreate(BaseModel):
    """
    Material is selected directly from Store stock.

    No Production Material requirement needs to be
    created beforehand in the Production module.
    """

    product_id: int = Field(
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