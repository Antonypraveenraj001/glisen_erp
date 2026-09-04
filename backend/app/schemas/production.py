from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# PRODUCTION ORDER
# ============================================================


class ProductionOrderCreate(BaseModel):
    """
    Create Production Order planning data.

    Runtime status and actual dates are controlled by the
    production workflow and cannot be supplied manually.
    """

    proforma_id: int = Field(
        gt=0,
    )

    product_id: int = Field(
        gt=0,
    )

    quantity: int = Field(
        gt=0,
    )

    planned_start_date: date | None = None

    notes: str | None = None


class ProductionOrderUpdate(BaseModel):
    """
    Update Production Order planning data only.

    status, actual_start_date and actual_end_date are
    intentionally excluded from this schema.
    """

    product_id: int | None = Field(
        default=None,
        gt=0,
    )

    quantity: int | None = Field(
        default=None,
        gt=0,
    )

    planned_start_date: date | None = None

    notes: str | None = None


class ProductionOrderResponse(BaseModel):
    id: int
    production_number: str

    proforma_id: int
    product_id: int
    quantity: int

    status: str

    planned_start_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None

    notes: str | None = None

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
    Actual material issue is handled through Shop Floor Issue
    so stock movement remains controlled and auditable.
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
    Updates material planning information only.

    quantity_issued and material_cost are intentionally excluded.
    Those values are controlled by Shop Floor Issue.
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


class ProductionOperationCreate(BaseModel):
    """
    Create the planned definition of a Production Operation.

    Runtime values such as actual hours, operation cost,
    status and timestamps are controlled by workflow endpoints.
    """

    operation_name: str = Field(
        min_length=1,
        max_length=100,
    )

    machine_name: str | None = Field(
        default=None,
        max_length=150,
    )

    hourly_rate: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    planned_hours: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        max_digits=10,
        decimal_places=2,
    )


class ProductionOperationUpdate(BaseModel):
    """
    Update planning information only.

    actual_hours, operation_cost, status, started_at and
    completed_at cannot be manually changed here.
    """

    operation_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    machine_name: str | None = Field(
        default=None,
        max_length=150,
    )

    hourly_rate: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    planned_hours: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    )


class ProductionOperationComplete(BaseModel):
    actual_hours: Decimal = Field(
        gt=0,
        max_digits=10,
        decimal_places=2,
    )


class ProductionOperationResponse(BaseModel):
    id: int
    production_order_id: int

    operation_name: str
    machine_name: str | None = None

    hourly_rate: Decimal
    planned_hours: Decimal
    actual_hours: Decimal

    operation_cost: Decimal

    status: str

    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class ProductionOperationSummaryResponse(BaseModel):
    production_order_id: int

    total_operations: int

    pending_operations: int
    in_progress_operations: int
    completed_operations: int

    total_planned_hours: Decimal
    total_actual_hours: Decimal

    total_operation_cost: Decimal


# ============================================================
# PRODUCTION ORDER DETAIL
# ============================================================


class ProductionOrderDetailResponse(ProductionOrderResponse):
    materials: list[ProductionMaterialResponse] = Field(
        default_factory=list,
    )

    operations: list[ProductionOperationResponse] = Field(
        default_factory=list,
    )