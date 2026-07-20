from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class SupplierBase(BaseModel):
    supplier_code: str
    company_name: str
    contact_person: str
    email: EmailStr
    phone: str
    gst_number: str
    address: str
    city: str
    state: str
    pincode: str
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )