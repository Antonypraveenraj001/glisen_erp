from datetime import date, datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from app.schemas.final_bill import (
    FinalBillResponse,
)
from app.schemas.finished_goods_receipt import (
    FinishedGoodsReceiptResponse,
)
from app.schemas.production import (
    ProductionMaterialResponse,
    ProductionOperationResponse,
)
from app.schemas.shop_floor_issue import (
    ShopFloorIssueResponse,
)


# ============================================================
# BASIC FINISHED PRODUCT
# ============================================================


class FinishedProductResponse(BaseModel):
    id: int

    finished_product_number: str

    # Manufactured output source of truth.
    product_name: str

    unit: str

    # Legacy purchased Product relationship.
    product_master_id: int | None = None

    production_order_id: int

    finished_goods_receipt_id: int

    created_by: int

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# LEGACY PRODUCT MASTER
# ============================================================


class FinishedProductMasterResponse(BaseModel):
    id: int

    product_code: str

    product_name: str

    description: str | None = None

    category: str

    unit: str

    hsn_code: str

    gst_percentage: Decimal

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# CUSTOMER
# ============================================================


class FinishedProductCustomerResponse(BaseModel):
    id: int

    customer_code: str

    company_name: str

    contact_person: str | None = None

    email: str | None = None

    phone: str | None = None

    gst_number: str | None = None

    address: str | None = None

    city: str | None = None

    state: str | None = None

    pincode: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# ENQUIRY
# ============================================================


class FinishedProductEnquiryResponse(BaseModel):
    id: int

    enquiry_number: str

    enquiry_date: date

    customer_id: int

    company_name: str

    contact_person: str | None = None

    phone: str | None = None

    email: str | None = None

    gst_number: str | None = None

    address: str | None = None

    city: str | None = None

    state: str | None = None

    pincode: str | None = None

    machine_name: str | None = None

    machine_model: str | None = None

    application: str | None = None

    quantity: int | None = None

    requirements: str | None = None

    remarks: str | None = None

    status: str

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# PROFORMA
# ============================================================


class FinishedProductProformaResponse(BaseModel):
    id: int

    proforma_number: str

    proforma_date: date

    enquiry_id: int

    customer_id: int

    company_name: str

    subtotal: Decimal

    discount_amount: Decimal

    taxable_amount: Decimal

    tax_amount: Decimal

    grand_total: Decimal

    status: str

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# PRODUCTION ORDER
# ============================================================


class FinishedProductProductionResponse(BaseModel):
    id: int

    production_number: str

    proforma_id: int

    proforma_item_id: int | None = None

    product_name: str

    unit: str

    # Legacy purchased Product relationship.
    product_id: int | None = None

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
# COST SUMMARY
# ============================================================


class FinishedProductCostSummaryResponse(BaseModel):
    actual_material_cost: Decimal = Field(
        default=Decimal("0.00"),
    )

    actual_operation_cost: Decimal = Field(
        default=Decimal("0.00"),
    )

    actual_production_cost: Decimal = Field(
        default=Decimal("0.00"),
    )

    finished_quantity: Decimal = Field(
        default=Decimal("0.00"),
    )

    cost_per_unit: Decimal = Field(
        default=Decimal("0.00"),
    )


# ============================================================
# BILLING TRACEABILITY
# ============================================================


class FinishedProductBillingResponse(BaseModel):
    original_invoice: FinalBillResponse | None = None

    effective_invoice: FinalBillResponse | None = None

    revisions: list[FinalBillResponse] = Field(
        default_factory=list,
    )

    credit_notes: list[FinalBillResponse] = Field(
        default_factory=list,
    )


# ============================================================
# COMPLETE TRACEABILITY
# ============================================================


class FinishedProductTraceabilityResponse(BaseModel):
    finished_product: FinishedProductResponse

    # Legacy finished products may have Product Master data.
    # New manufactured products normally do not.
    product_master: FinishedProductMasterResponse | None = None

    customer: FinishedProductCustomerResponse

    enquiry: FinishedProductEnquiryResponse

    proforma: FinishedProductProformaResponse

    production_order: FinishedProductProductionResponse

    production_materials: list[ProductionMaterialResponse] = Field(
        default_factory=list,
    )

    shop_floor_issues: list[ShopFloorIssueResponse] = Field(
        default_factory=list,
    )

    production_operations: list[ProductionOperationResponse] = Field(
        default_factory=list,
    )

    finished_goods_receipt: FinishedGoodsReceiptResponse

    cost_summary: FinishedProductCostSummaryResponse

    billing: FinishedProductBillingResponse = Field(
        default_factory=FinishedProductBillingResponse,
    )