from datetime import date

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
from app.schemas.recurring_payment import (
    OverheadRepeatPaymentCreate,
    RecurringPaymentListResponse,
    RepeatPaymentBatchResponse,
    RepeatPaymentPreview,
    StaffRepeatPaymentCreate,
)
from app.services.recurring_payment_service import (
    RecurringPaymentService,
)


router = APIRouter(
    prefix="/recurring-payments",
    tags=[
        "Recurring Payments"
    ],
)


# ================================================================
# STAFF SALARY PREVIEW
# ================================================================

@router.get(
    "/staff/preview",
    response_model=RepeatPaymentPreview,
)
def preview_staff_salary_payments(

    payment_date: date = Query(
        ...,
        description=(
            "Actual salary payment date."
        ),
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.view"
        )
    ),
):

    return (
        RecurringPaymentService
        .preview_staff(
            db=db,
            payment_date=(
                payment_date
            ),
        )
    )


# ================================================================
# RECORD STAFF SALARY BATCH
# ================================================================

@router.post(
    "/staff",
    response_model=RepeatPaymentBatchResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def record_staff_salary_payments(
    data: StaffRepeatPaymentCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.manage"
        )
    ),
):

    try:

        return (
            RecurringPaymentService
            .record_staff_batch(
                db=db,
                data=data,
                created_by=(
                    current_user.id
                ),
            )
        )


    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# OVERHEAD PREVIEW
# ================================================================

@router.get(
    "/overheads/preview",
    response_model=RepeatPaymentPreview,
)
def preview_overhead_payments(

    payment_date: date = Query(
        ...,
        description=(
            "Actual overhead payment date."
        ),
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.view"
        )
    ),
):

    return (
        RecurringPaymentService
        .preview_overheads(
            db=db,
            payment_date=(
                payment_date
            ),
        )
    )


# ================================================================
# RECORD OVERHEAD BATCH
# ================================================================

@router.post(
    "/overheads",
    response_model=RepeatPaymentBatchResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def record_overhead_payments(
    data: OverheadRepeatPaymentCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.create"
        )
    ),
):

    try:

        return (
            RecurringPaymentService
            .record_overhead_batch(
                db=db,
                data=data,
                created_by=(
                    current_user.id
                ),
            )
        )


    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# PAYMENT HISTORY
# ================================================================

@router.get(
    "",
    response_model=(
        RecurringPaymentListResponse
    ),
)
def get_recurring_payment_history(

    payment_kind: str | None = Query(
        None,
        description=(
            "STAFF_SALARY or OVERHEAD"
        ),
    ),

    start_date: date | None = Query(
        None
    ),

    end_date: date | None = Query(
        None
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.view"
        )
    ),
):

    try:

        items = (
            RecurringPaymentService
            .get_history(
                db=db,
                payment_kind=(
                    payment_kind
                ),
                start_date=(
                    start_date
                ),
                end_date=(
                    end_date
                ),
            )
        )


        return {
            "total":
                len(
                    items
                ),

            "items":
                items,
        }


    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc