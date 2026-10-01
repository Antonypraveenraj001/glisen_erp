from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
)


class AISupplierResponse(BaseModel):
    company_name: str = ""
    contact_person: str = ""
    email: str = ""
    phone: str = ""
    gst_number: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""

    existing_supplier: bool = False
    supplier_id: int | None = None
    match_type: str | None = None


class AIPurchaseBillResponse(BaseModel):
    bill_number: str = ""
    bill_date: str = ""

    credit_days: int = 0

    subtotal: float = 0
    total_gst: float = 0
    grand_total: float = 0

    remarks: str = ""


class AIProductResponse(BaseModel):
    product_name: str = ""
    description: str = ""
    hsn_code: str = ""
    unit: str = ""

    quantity: float = 0
    purchase_price: float = 0
    gst_percentage: float = 0
    line_total: float = 0

    existing_product: bool = False
    product_id: int | None = None
    match_type: str | None = None


class PurchaseBillAIDataResponse(BaseModel):
    supplier: AISupplierResponse
    purchase_bill: AIPurchaseBillResponse
    products: list[AIProductResponse]


# ================================================================
# OLD SINGLE-FILE EXTRACTION RESPONSE
#
# Retained temporarily so the current frontend continues working.
# ================================================================

class PurchaseBillAIResponse(BaseModel):
    status: str
    filename: str

    data: PurchaseBillAIDataResponse

    model_config = ConfigDict(
        from_attributes=True,
    )


# ================================================================
# BATCH START RESPONSE
# ================================================================

class PurchaseBillAIBatchStartResponse(
    BaseModel
):
    batch_id: int
    total_files: int
    queued: int
    message: str


# ================================================================
# DRAFT SUMMARY
# ================================================================

class PurchaseBillAIDraftSummaryResponse(
    BaseModel
):
    id: int
    batch_id: int
    sequence_number: int

    original_filename: str

    status: str

    supplier_name: str = ""
    bill_number: str = ""
    bill_date: str = ""
    grand_total: float = 0

    error_message: str | None = None

    confirmed_purchase_bill_id: (
        int | None
    ) = None

    processing_started_at: (
        datetime | None
    ) = None

    processing_completed_at: (
        datetime | None
    ) = None

    confirmed_at: (
        datetime | None
    ) = None

    cancelled_at: (
        datetime | None
    ) = None

    created_at: datetime
    updated_at: datetime


# ================================================================
# DRAFT DETAIL
# ================================================================

class PurchaseBillAIDraftDetailResponse(
    PurchaseBillAIDraftSummaryResponse
):
    extracted_data: (
        PurchaseBillAIDataResponse
        |
        None
    ) = None


# ================================================================
# BATCH STATUS
# ================================================================

class PurchaseBillAIBatchResponse(
    BaseModel
):
    batch_id: int
    total_files: int

    queued: int
    processing: int
    ready: int
    failed: int
    confirmed: int
    cancelled: int

    created_at: datetime

    drafts: list[
        PurchaseBillAIDraftSummaryResponse
    ]