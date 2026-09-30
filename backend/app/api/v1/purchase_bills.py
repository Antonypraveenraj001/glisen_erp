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
from app.repositories.purchase_bill_repository import (
    PurchaseBillRepository,
)
from app.schemas.purchase_bill import (
    PurchaseBillCreate,
    PurchaseBillItemStatisticsResponse,
    PurchaseBillResponse,
    PurchaseBillUpdate,
)
from app.schemas.purchase_bill_payment import (
    PurchaseBillPaymentCreate,
    PurchaseBillPaymentResponse,
    PurchaseBillPaymentSummaryResponse,
    PurchaseBillUnpaidAgingResponse,
)
from app.services.purchase_bill_payment_service import (
    PurchaseBillPaymentService,
)
from app.services.purchase_bill_service import (
    PurchaseBillService,
)


router = APIRouter(
    prefix="/purchase-bills",
    tags=["Purchase Bill Processing"],
)


# ================================================================
# CREATE PURCHASE BILL
#
# Permission:
#     purchase_bills.create
# ================================================================

@router.post(
    "",
    response_model=PurchaseBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_bill(
    purchase_bill: PurchaseBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.create"
        )
    ),
):
    return PurchaseBillService.create(
        db=db,
        purchase_bill=purchase_bill,
        created_by=current_user.id,
    )


# ================================================================
# STATISTICS
#
# Permission:
#     purchase_bills.view
# ================================================================

@router.get(
    "/statistics",
    response_model=PurchaseBillItemStatisticsResponse,
)
def get_purchase_bill_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.view"
        )
    ),
):
    return (
        PurchaseBillRepository
        .get_statistics(
            db,
        )
    )


# ================================================================
# LIST PURCHASE BILLS
#
# Permission:
#     purchase_bills.view
# ================================================================

@router.get(
    "",
    response_model=list[
        PurchaseBillResponse
    ],
)
def get_purchase_bills(
    search: str | None = Query(
        default=None,
        description=(
            "Search by Purchase Bill Number "
            "or Supplier Name"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.view"
        )
    ),
):
    return (
        PurchaseBillRepository
        .get_all(
            db,
            search,
        )
    )


# ================================================================
# UNPAID PURCHASE BILL AGING
#
# Permission:
#     purchase_bills.view
# ================================================================

@router.get(
    "/unpaid-aging",
    response_model=list[
        PurchaseBillUnpaidAgingResponse
    ],
)
def get_unpaid_purchase_bill_aging(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.view"
        )
    ),
):
    """
    Return tracked active Purchase Bills that still
    have an outstanding supplier balance.

    Legacy bills with no due date are excluded.

    Results are sorted by highest days unpaid first.
    """

    return (
        PurchaseBillPaymentService
        .get_unpaid_aging(
            db=db,
        )
    )


# ================================================================
# PAYMENT SUMMARY
#
# Permission:
#     purchase_bills.view
# ================================================================

@router.get(
    "/{purchase_bill_id}/payment-summary",
    response_model=(
        PurchaseBillPaymentSummaryResponse
    ),
)
def get_purchase_bill_payment_summary(
    purchase_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.view"
        )
    ),
):
    summary = (
        PurchaseBillPaymentService
        .get_summary(
            db=db,
            purchase_bill_id=(
                purchase_bill_id
            ),
        )
    )

    if summary is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Purchase Bill not found."
            ),
        )

    return summary


# ================================================================
# RECORD SUPPLIER PAYMENT
#
# Permission:
#     purchase_bills.payment
# ================================================================

@router.post(
    "/{purchase_bill_id}/payments",
    response_model=(
        PurchaseBillPaymentResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_purchase_bill_payment(
    purchase_bill_id: int,
    payment: PurchaseBillPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.payment"
        )
    ),
):
    return (
        PurchaseBillPaymentService
        .create_payment(
            db=db,
            purchase_bill_id=(
                purchase_bill_id
            ),
            payment=payment,
            created_by=(
                current_user.id
            ),
        )
    )


# ================================================================
# GET PURCHASE BILL
#
# Permission:
#     purchase_bills.view
# ================================================================

@router.get(
    "/{purchase_bill_id}",
    response_model=PurchaseBillResponse,
)
def get_purchase_bill(
    purchase_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.view"
        )
    ),
):

    purchase_bill = (
        PurchaseBillRepository
        .get_by_id(
            db,
            purchase_bill_id,
        )
    )

    if purchase_bill is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Purchase Bill not found"
            ),
        )

    return purchase_bill


# ================================================================
# UPDATE PURCHASE BILL
#
# Permission:
#     purchase_bills.edit
# ================================================================

@router.put(
    "/{purchase_bill_id}",
    response_model=PurchaseBillResponse,
)
def update_purchase_bill(
    purchase_bill_id: int,
    purchase_bill: PurchaseBillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.edit"
        )
    ),
):

    updated_purchase_bill = (
        PurchaseBillService
        .update(
            db=db,
            purchase_bill_id=(
                purchase_bill_id
            ),
            purchase_bill=(
                purchase_bill
            ),
        )
    )

    if updated_purchase_bill is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Purchase Bill not found"
            ),
        )

    return updated_purchase_bill


# ================================================================
# CANCEL PURCHASE BILL
#
# Permission:
#     purchase_bills.cancel
# ================================================================

@router.delete(
    "/{purchase_bill_id}",
)
def deactivate_purchase_bill(
    purchase_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "purchase_bills.cancel"
        )
    ),
):

    purchase_bill = (
        PurchaseBillService
        .deactivate(
            db=db,
            purchase_bill_id=(
                purchase_bill_id
            ),
            cancelled_by=(
                current_user.id
            ),
        )
    )

    if purchase_bill is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Purchase Bill not found"
            ),
        )

    return {
        "message": (
            "Purchase Bill cancelled successfully."
        )
    }