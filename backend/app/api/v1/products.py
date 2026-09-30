from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.permissions import require_permission
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.product_service import ProductService


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


# ================================================================
# CREATE PRODUCT
#
# Permission:
#     products.create
# ================================================================

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "products.create"
        )
    ),
):
    return ProductService.create(
        db,
        product,
    )


# ================================================================
# LIST PRODUCTS
#
# Permission:
#     products.view
# ================================================================

@router.get(
    "",
    response_model=list[
        ProductResponse
    ],
)
def get_products(
    search: str | None = Query(
        default=None,
        description=(
            "Search by product code, "
            "name, category or HSN"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "products.view"
        )
    ),
):
    return ProductService.get_all(
        db,
        search,
    )


# ================================================================
# GET PRODUCT
#
# Permission:
#     products.view
# ================================================================

@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "products.view"
        )
    ),
):
    product = ProductService.get_by_id(
        db,
        product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Product not found",
        )

    return product


# ================================================================
# UPDATE PRODUCT
#
# Permission:
#     products.edit
# ================================================================

@router.put(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "products.edit"
        )
    ),
):
    updated_product = (
        ProductService.update(
            db=db,
            product_id=product_id,
            product_data=product,
        )
    )

    if updated_product is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Product not found",
        )

    return updated_product


# ================================================================
# DEACTIVATE PRODUCT
#
# Permission:
#     products.deactivate
# ================================================================

@router.delete(
    "/{product_id}",
)
def deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "products.deactivate"
        )
    ),
):
    product = ProductService.deactivate(
        db,
        product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Product not found",
        )

    return {
        "message": (
            "Product deactivated successfully."
        )
    }