from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
)
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.finished_product import (
    FinishedProductResponse,
    FinishedProductTraceabilityResponse,
)
from app.services.finished_product import (
    FinishedProductService,
)


router = APIRouter(
    prefix="/finished-products",
    tags=["Finished Products"],
)


# ============================================================
# GET ALL FINISHED PRODUCTS
# ============================================================


@router.get(
    "",
    response_model=list[
        FinishedProductResponse
    ],
)
def get_all_finished_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedProductService(
        db
    )

    return (
        service.get_all_finished_products()
    )


# ============================================================
# GET FINISHED PRODUCT BY NUMBER
# ============================================================


@router.get(
    "/number/{finished_product_number}",
    response_model=FinishedProductResponse,
)
def get_finished_product_by_number(
    finished_product_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedProductService(
        db
    )

    finished_product = (
        service.get_finished_product_by_number(
            finished_product_number
        )
    )

    if finished_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Finished Product not found."
            ),
        )

    return finished_product


# ============================================================
# GET FINISHED PRODUCT BY PRODUCTION ORDER
# ============================================================


@router.get(
    "/production-orders/{production_order_id}",
    response_model=FinishedProductResponse,
)
def get_finished_product_by_production_order(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedProductService(
        db
    )

    finished_product = (
        service.get_by_production_order(
            production_order_id
        )
    )

    if finished_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Finished Product not found "
                "for this Production Order."
            ),
        )

    return finished_product


# ============================================================
# TRACEABILITY BY NUMBER
# ============================================================


@router.get(
    "/number/{finished_product_number}/traceability",
    response_model=(
        FinishedProductTraceabilityResponse
    ),
)
def get_finished_product_traceability_by_number(
    finished_product_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedProductService(
        db
    )

    try:
        traceability = (
            service.get_traceability_by_number(
                finished_product_number
            )
        )

        if traceability is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Finished Product not found."
                ),
            )

        return traceability

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        )


# ============================================================
# TRACEABILITY BY ID
# ============================================================


@router.get(
    "/{finished_product_id}/traceability",
    response_model=(
        FinishedProductTraceabilityResponse
    ),
)
def get_finished_product_traceability(
    finished_product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedProductService(
        db
    )

    try:
        traceability = (
            service.get_traceability(
                finished_product_id
            )
        )

        if traceability is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Finished Product not found."
                ),
            )

        return traceability

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        )


# ============================================================
# GET FINISHED PRODUCT BY ID
# ============================================================


@router.get(
    "/{finished_product_id}",
    response_model=FinishedProductResponse,
)
def get_finished_product(
    finished_product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedProductService(
        db
    )

    finished_product = (
        service.get_finished_product(
            finished_product_id
        )
    )

    if finished_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Finished Product not found."
            ),
        )

    return finished_product