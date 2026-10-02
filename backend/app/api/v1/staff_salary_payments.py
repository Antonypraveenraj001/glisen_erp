from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from pydantic import (
    BaseModel,
    Field,
    field_validator,
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
    RepeatPaymentBatchResponse,
    RepeatPaymentPreview,
)
from app.services.staff_salary_payment_service import (
    StaffSalaryPaymentService,
)


router = APIRouter(
    prefix="/staff-salary-payments",
    tags=[
        "Staff Salary Payments"
    ],
)


class StaffSalaryPaymentCreate(
    BaseModel
):

    period_start: date

    payment_date: date

    staff_ids: list[int] = Field(
        min_length=1,
    )

    payment_mode: str | None = Field(
        default=None,
        max_length=50,
    )

    reference_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


    @field_validator(
        "payment_mode",
        "reference_number",
        "notes",
        mode="before",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value,
    ):

        if isinstance(
            value,
            str,
        ):

            value = value.strip()

            if not value:
                return None

        return value


@router.get(
    "/preview",
    response_model=RepeatPaymentPreview,
)
def preview_staff_salary_payments_by_month(
    period_start: date = Query(
        ...,
        description=(
            "First day of the salary month."
        ),
    ),

    payment_date: date = Query(
        ...,
        description=(
            "Actual debit/payment date."
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

    try:

        return (
            StaffSalaryPaymentService
            .preview(
                db=db,
                period_start=period_start,
                payment_date=payment_date,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc


@router.post(
    "",
    response_model=RepeatPaymentBatchResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def record_staff_salary_payments_by_month(
    data: StaffSalaryPaymentCreate,

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
            StaffSalaryPaymentService
            .record_batch(
                db=db,
                period_start=(
                    data.period_start
                ),
                payment_date=(
                    data.payment_date
                ),
                staff_ids=(
                    data.staff_ids
                ),
                payment_mode=(
                    data.payment_mode
                ),
                reference_number=(
                    data.reference_number
                ),
                notes=(
                    data.notes
                ),
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
            detail=str(exc),
        ) from exc
