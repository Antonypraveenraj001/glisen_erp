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
from app.schemas.final_bill import (
    FinalBillCreateFromProforma,
    FinalBillResponse,
)
from app.services.final_bill_service import (
    FinalBillService,
)


router = APIRouter(
    prefix="/final-bills",
    tags=["Final Billing"],
)


FINAL_BILL_WRITE_ROLES = (
    "Boss",
    "Admin",
    "Sales",
    "Accounts",
)


# ============================================================
# CREATE FINAL BILL FROM PROFORMA
# ============================================================


@router.post(
    "/from-proforma/{proforma_id}",
    response_model=FinalBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_final_bill_from_proforma(
    proforma_id: int,
    data: FinalBillCreateFromProforma,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            *FINAL_BILL_WRITE_ROLES
        )
    ),
):
    try:
        return (
            FinalBillService
            .create_from_proforma(
                db=db,
                proforma_id=proforma_id,
                created_by=current_user.id,
                invoice_date=data.invoice_date,
                notes=data.notes,
            )
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        )


# ============================================================
# GET ALL FINAL BILLS
# ============================================================


@router.get(
    "",
    response_model=list[
        FinalBillResponse
    ],
)
def get_all_final_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return (
        FinalBillService
        .get_all(
            db
        )
    )


# ============================================================
# GET FINAL BILL BY ID
# ============================================================


@router.get(
    "/{final_bill_id}",
    response_model=FinalBillResponse,
)
def get_final_bill(
    final_bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    final_bill = (
        FinalBillService
        .get_by_id(
            db=db,
            final_bill_id=final_bill_id,
        )
    )

    if final_bill is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Final Bill not found."
            ),
        )

    return final_bill