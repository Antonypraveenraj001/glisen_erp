from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)
from app.dependencies.permissions import (
    require_any_permission,
    require_permission,
)
from app.models.user import User
from app.schemas.finished_goods_receipt import (
    FinishedGoodsReceiptCreate,
    FinishedGoodsReceiptResponse,
)
from app.services.finished_goods_receipt import (
    FinishedGoodsReceiptService,
)


router = APIRouter(
    prefix="/finished-goods-receipts",
    tags=["Finished Goods Receipts"],
)


# ============================================================
# RECEIVE COMPLETED PRODUCTION INTO FINISHED PRODUCTS
#
# Shared workflow:
#
# finished_products.receive
#     -> direct Finished Products receiving permission
#
# production.complete
#     -> Production's "Production Completed" workflow
#
# ProductionPage completes the Production Order first and then
# immediately calls this endpoint to create the Finished Product.
# Therefore Production completion must remain functional even if
# the Finished Products module itself is not enabled.
# ============================================================

@router.post(
    "/production-orders/{production_order_id}/receive-stock",
    response_model=FinishedGoodsReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_finished_goods(
    production_order_id: int,
    data: FinishedGoodsReceiptCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_any_permission(
            "finished_products.receive",
            "production.complete",
        )
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    try:
        return service.receive_finished_goods(
            production_order_id=(
                production_order_id
            ),
            data=data,
            received_by=(
                current_user.id
            ),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        )


# ============================================================
# GET ALL RECEIPTS
#
# Permission:
#     finished_products.view
# ============================================================

@router.get(
    "",
    response_model=list[
        FinishedGoodsReceiptResponse
    ],
)
def get_all_finished_goods_receipts(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "finished_products.view"
        )
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    return (
        service.get_all_receipts()
    )


# ============================================================
# GET RECEIPT BY PRODUCTION ORDER
#
# Permission:
#     finished_products.view
# ============================================================

@router.get(
    "/production-orders/{production_order_id}",
    response_model=FinishedGoodsReceiptResponse,
)
def get_receipt_by_production_order(
    production_order_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "finished_products.view"
        )
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    receipt = (
        service.get_receipt_by_production_order(
            production_order_id
        )
    )

    if receipt is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Finished goods receipt not found "
                "for this Production Order."
            ),
        )

    return receipt


# ============================================================
# GET RECEIPT BY NUMBER
#
# Permission:
#     finished_products.view
# ============================================================

@router.get(
    "/number/{receipt_number}",
    response_model=FinishedGoodsReceiptResponse,
)
def get_receipt_by_number(
    receipt_number: str,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "finished_products.view"
        )
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    receipt = (
        service.get_receipt_by_number(
            receipt_number
        )
    )

    if receipt is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Finished goods receipt not found."
            ),
        )

    return receipt


# ============================================================
# GET RECEIPT BY ID
#
# Permission:
#     finished_products.view
# ============================================================

@router.get(
    "/{receipt_id}",
    response_model=FinishedGoodsReceiptResponse,
)
def get_finished_goods_receipt(
    receipt_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "finished_products.view"
        )
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    receipt = (
        service.get_receipt(
            receipt_id
        )
    )

    if receipt is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Finished goods receipt not found."
            ),
        )

    return receipt