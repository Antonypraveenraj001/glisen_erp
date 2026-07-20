from pydantic import BaseModel


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