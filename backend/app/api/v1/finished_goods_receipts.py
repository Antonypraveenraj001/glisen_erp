from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from app.dependencies.database import get_db
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


FINISHED_GOODS_RECEIPT_ROLES = (
    "Boss",
    "Admin",
    "Production",
    "Store",
)


# ============================================================
# RECEIVE COMPLETED PRODUCTION INTO STOCK
# ============================================================


@router.post(
    "/production-orders/{production_order_id}/receive-stock",
    response_model=FinishedGoodsReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_finished_goods(
    production_order_id: int,
    data: FinishedGoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            *FINISHED_GOODS_RECEIPT_ROLES
        )
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    try:
        return service.receive_finished_goods(
            production_order_id=production_order_id,
            data=data,
            received_by=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# ============================================================
# GET ALL RECEIPTS
# ============================================================


@router.get(
    "",
    response_model=list[
        FinishedGoodsReceiptResponse
    ],
)
def get_all_finished_goods_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    return service.get_all_receipts()


# ============================================================
# GET RECEIPT BY PRODUCTION ORDER
# ============================================================


@router.get(
    "/production-orders/{production_order_id}",
    response_model=FinishedGoodsReceiptResponse,
)
def get_receipt_by_production_order(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Finished goods receipt not found "
                "for this Production Order."
            ),
        )

    return receipt


# ============================================================
# GET RECEIPT BY NUMBER
# ============================================================


@router.get(
    "/number/{receipt_number}",
    response_model=FinishedGoodsReceiptResponse,
)
def get_receipt_by_number(
    receipt_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Finished goods receipt not found."
            ),
        )

    return receipt


# ============================================================
# GET RECEIPT BY ID
# ============================================================


@router.get(
    "/{receipt_id}",
    response_model=FinishedGoodsReceiptResponse,
)
def get_finished_goods_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = FinishedGoodsReceiptService(
        db
    )

    receipt = service.get_receipt(
        receipt_id
    )

    if receipt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Finished goods receipt not found."
            ),
        )

    return receipt