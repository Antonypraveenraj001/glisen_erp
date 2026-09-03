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
    quantity: int | None = Field(default=None, gt=0)

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


class ProductionMaterialBase(BaseModel):
    product_id: int | None = None
    material_name: str
    unit: str | None = None

    quantity_required: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    quantity_issued: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    unit_cost: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    material_cost: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )


class ProductionMaterialCreate(ProductionMaterialBase):
    pass


class ProductionMaterialUpdate(BaseModel):
    product_id: int | None = None
    material_name: str | None = None
    unit: str | None = None

    quantity_required: Decimal | None = Field(
        default=None,
        ge=0,
    )

    quantity_issued: Decimal | None = Field(
        default=None,
        ge=0,
    )

    unit_cost: Decimal | None = Field(
        default=None,
        ge=0,
    )

    material_cost: Decimal | None = Field(
        default=None,
        ge=0,
    )


class ProductionMaterialResponse(ProductionMaterialBase):
    id: int
    production_order_id: int

    model_config = ConfigDict(
        from_attributes=True,
    )


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
    materials: list[ProductionMaterialResponse] = []
    operations: list[ProductionOperationResponse] = []