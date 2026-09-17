from pydantic import (
    BaseModel,
    Field,
)


class ConfirmSupplier(BaseModel):
    supplier_id: int | None = None

    company_name: str
    contact_person: str
    email: str
    phone: str
    gst_number: str
    address: str
    city: str
    state: str
    pincode: str


class ConfirmPurchaseBill(BaseModel):
    bill_number: str
    bill_date: str

    # Supplier credit period.
    # 0 means payment is due immediately.
    credit_days: int = Field(
        default=0,
        ge=0,
    )

    subtotal: float
    total_gst: float
    grand_total: float

    remarks: str


class ConfirmProduct(BaseModel):
    product_id: int | None = None

    product_name: str
    description: str
    hsn_code: str
    unit: str

    quantity: float
    purchase_price: float
    gst_percentage: float
    line_total: float


class PurchaseBillAIConfirmRequest(BaseModel):
    supplier: ConfirmSupplier
    purchase_bill: ConfirmPurchaseBill
    products: list[ConfirmProduct]