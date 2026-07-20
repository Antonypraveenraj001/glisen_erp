from pydantic import BaseModel


class SupplierExtraction(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    gst_number: str
    address: str
    city: str
    state: str
    pincode: str


class PurchaseBillExtraction(BaseModel):
    bill_number: str
    bill_date: str
    subtotal: float
    total_gst: float
    grand_total: float
    remarks: str


class ProductExtraction(BaseModel):
    product_name: str
    description: str
    hsn_code: str
    unit: str
    quantity: float
    purchase_price: float
    gst_percentage: float
    line_total: float


class PurchaseBillExtractionResponse(BaseModel):
    supplier: SupplierExtraction
    purchase_bill: PurchaseBillExtraction
    products: list[ProductExtraction]