from pydantic import BaseModel, ConfigDict


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
    match_type: str |None = None


class PurchaseBillAIDataResponse(BaseModel):
    supplier: AISupplierResponse
    purchase_bill: AIPurchaseBillResponse
    products: list[AIProductResponse]


class PurchaseBillAIResponse(BaseModel):
    status: str
    filename: str
    data: PurchaseBillAIDataResponse

    model_config = ConfigDict(
        from_attributes=True,
    )