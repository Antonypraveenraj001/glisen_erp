from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
)


# ================================================================
# SUPPLIER INPUT BASE
#
# Supplier Master create/edit continues to require a valid email.
# ================================================================

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


# ================================================================
# CREATE
# ================================================================

class SupplierCreate(
    SupplierBase
):
    pass


# ================================================================
# UPDATE
# ================================================================

class SupplierUpdate(
    SupplierBase
):
    pass


# ================================================================
# RESPONSE
#
# Important:
#
# Existing/AI-imported supplier records may contain an empty,
# legacy, or otherwise non-standard email value.
#
# The Supplier directory must still be able to display those
# records instead of failing the complete API response.
#
# Create/Edit validation remains strict because SupplierBase
# continues to use EmailStr.
# ================================================================

class SupplierResponse(
    SupplierBase
):
    id: int

    # Deliberately relaxed only for database responses.
    #
    # This protects the Supplier directory from legacy/imported
    # records while keeping normal Supplier create/edit validation
    # strict.
    email: str

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )