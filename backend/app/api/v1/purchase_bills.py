from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from app.dependencies.database import get_db
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
from app.services.purchase_bill_service import (
    PurchaseBillService,
)


router = APIRouter(
    prefix="/purchase-bills",
    tags=["Purchase Bill Processing"],
)


@router.post(
    "",
    response_model=PurchaseBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_bill(
    purchase_bill: PurchaseBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Purchase",
        )
    ),
):
    return PurchaseBillService.create(
        db=db,
        purchase_bill=purchase_bill,
        created_by=current_user.id,
    )


@router.get(
    "/statistics",
    response_model=PurchaseBillItemStatisticsResponse,
)
def get_purchase_bill_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return PurchaseBillRepository.get_statistics(
        db,
    )


@router.get(
    "",
    response_model=list[PurchaseBillResponse],
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
        get_current_user
    ),
):
    return PurchaseBillRepository.get_all(
        db,
        search,
    )


@router.get(
    "/{purchase_bill_id}",
    response_model=PurchaseBillResponse,
)
def get_purchase_bill(
    purchase_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    purchase_bill = (
        PurchaseBillRepository.get_by_id(
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


@router.put(
    "/{purchase_bill_id}",
    response_model=PurchaseBillResponse,
)
def update_purchase_bill(
    purchase_bill_id: int,
    purchase_bill: PurchaseBillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Purchase",
        )
    ),
):

    updated_purchase_bill = (
        PurchaseBillService.update(
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


@router.delete(
    "/{purchase_bill_id}",
)
def deactivate_purchase_bill(
    purchase_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Purchase",
        )
    ),
):

    purchase_bill = (
        PurchaseBillService.deactivate(
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