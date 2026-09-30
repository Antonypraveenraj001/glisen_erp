from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)

from app.dependencies.permissions import (
    require_permission,
)

from app.models.user import User

from app.schemas.supplier import (
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)

from app.services.supplier_service import (
    SupplierService,
)


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
)


# ================================================================
# CREATE SUPPLIER
#
# Permission:
#     suppliers.create
# ================================================================

@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "suppliers.create"
        )
    ),
):
    return SupplierService.create(
        db=db,
        supplier=supplier,
        created_by=current_user.id,
    )


# ================================================================
# LIST SUPPLIERS
#
# Permission:
#     suppliers.view
# ================================================================

@router.get(
    "",
    response_model=list[
        SupplierResponse
    ],
)
def get_suppliers(
    search: str | None = Query(
        default=None,
        description=(
            "Search by code, company, "
            "contact or phone"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "suppliers.view"
        )
    ),
):
    return SupplierService.get_all(
        db,
        search,
    )


# ================================================================
# GET SUPPLIER
#
# Permission:
#     suppliers.view
# ================================================================

@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "suppliers.view"
        )
    ),
):
    supplier = SupplierService.get_by_id(
        db,
        supplier_id,
    )

    if supplier is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Supplier not found",
        )

    return supplier


# ================================================================
# UPDATE SUPPLIER
#
# Permission:
#     suppliers.edit
# ================================================================

@router.put(
    "/{supplier_id}",
    response_model=SupplierResponse,
)
def update_supplier(
    supplier_id: int,
    supplier: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "suppliers.edit"
        )
    ),
):
    updated_supplier = (
        SupplierService.update(
            db=db,
            supplier_id=supplier_id,
            supplier_data=supplier,
        )
    )

    if updated_supplier is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Supplier not found",
        )

    return updated_supplier


# ================================================================
# DEACTIVATE SUPPLIER
#
# Permission:
#     suppliers.deactivate
# ================================================================

@router.delete(
    "/{supplier_id}",
)
def deactivate_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "suppliers.deactivate"
        )
    ),
):
    supplier = (
        SupplierService.deactivate(
            db,
            supplier_id,
        )
    )

    if supplier is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Supplier not found",
        )

    return {
        "message": (
            "Supplier deactivated successfully."
        )
    }