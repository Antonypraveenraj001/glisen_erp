from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# PRODUCTION ORDER
# ============================================================


class ProductionOrderBase(BaseModel):
    proforma_id: int
    product_id: int
    quantity: int = Field(gt=0)

    status: str = "Pending"

    planned_start_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None

    notes: str | None = None


class ProductionOrderCreate(ProductionOrderBase):
    pass


class ProductionOrderUpdate(BaseModel):
    product_id: int | None = None
    quantity: int | None = Field(
        default=None,
        gt=0,
    )

    status: str | None = None

    planned_start_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None

    notes: str | None = None


class ProductionOrderResponse(ProductionOrderBase):
    id: int
    production_number: str

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# PRODUCTION MATERIAL
# ============================================================


class ProductionMaterialCreate(BaseModel):
    """
    Defines a material requirement for a Production Order.

    quantity_issued is intentionally NOT accepted here.
    Actual material issue will be handled later through the
    Shop Floor Issue workflow so stock movement remains controlled.
    """

    product_id: int | None = None

    material_name: str = Field(
        min_length=1,
        max_length=200,
    )

    unit: str | None = Field(
        default=None,
        max_length=30,
    )

    quantity_required: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    unit_cost: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        max_digits=14,
        decimal_places=2,
    )


class ProductionMaterialUpdate(BaseModel):
    """
    Updates material planning data only.

    quantity_issued and material_cost are intentionally excluded.
    They must not be manually changed through the planning API.
    """

    product_id: int | None = None

    material_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    unit: str | None = Field(
        default=None,
        max_length=30,
    )

    quantity_required: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    unit_cost: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=14,
        decimal_places=2,
    )


class ProductionMaterialResponse(BaseModel):
    id: int
    production_order_id: int

    product_id: int | None = None

    material_name: str
    unit: str | None = None

    quantity_required: Decimal
    quantity_issued: Decimal

    unit_cost: Decimal
    material_cost: Decimal

    model_config = ConfigDict(
        from_attributes=True,
    )


class ProductionMaterialSummaryResponse(BaseModel):
    production_order_id: int

    total_materials: int

    total_quantity_required: Decimal
    total_quantity_issued: Decimal
    total_quantity_remaining: Decimal

    total_material_cost: Decimal


# ============================================================
# PRODUCTION OPERATION
# ============================================================


class ProductionOperationBase(BaseModel):
    operation_name: str
    machine_name: str | None = None

    hourly_rate: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    planned_hours: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    actual_hours: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    operation_cost: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    status: str = "Pending"

    started_at: datetime | None = None
    completed_at: datetime | None = None


class ProductionOperationCreate(ProductionOperationBase):
    pass


class ProductionOperationUpdate(BaseModel):
    operation_name: str | None = None
    machine_name: str | None = None

    hourly_rate: Decimal | None = Field(
        default=None,
        ge=0,
    )

    planned_hours: Decimal | None = Field(
        default=None,
        ge=0,
    )

    actual_hours: Decimal | None = Field(
        default=None,
        ge=0,
    )

    operation_cost: Decimal | None = Field(
        default=None,
        ge=0,
    )

    status: str | None = None

    started_at: datetime | None = None
    completed_at: datetime | None = None


class ProductionOperationResponse(ProductionOperationBase):
    id: int
    production_order_id: int

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# PRODUCTION ORDER DETAIL
# ============================================================


class ProductionOrderDetailResponse(ProductionOrderResponse):
    materials: list[ProductionMaterialResponse] = Field(
        default_factory=list
    )

    operations: list[ProductionOperationResponse] = Field(
        default_factory=list
    )