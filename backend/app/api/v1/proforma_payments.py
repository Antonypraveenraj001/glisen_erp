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
    require_permission,
)

from app.models.user import (
    User,
)

from app.schemas.proforma_payment import (
    ProformaPaymentCreate,
    ProformaPaymentRefundCreate,
    ProformaPaymentRefundResponse,
    ProformaPaymentResponse,
    ProformaPaymentSummaryResponse,
)

from app.services.proforma_payment_service import (
    ProformaPaymentService,
)


router = APIRouter(
    prefix="/proformas",
    tags=[
        "Proforma Advance Payments",
    ],
)


# ================================================================
# GET ADVANCE / REFUND SUMMARY
# ================================================================

@router.get(
    "/{proforma_id}/advance-summary",
    response_model=(
        ProformaPaymentSummaryResponse
    ),
)
def get_proforma_advance_summary(
    proforma_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "proformas.view"
        )
    ),
):

    summary = (
        ProformaPaymentService
        .get_summary(
            db=db,
            proforma_id=(
                proforma_id
            ),
        )
    )

    if (
        summary
        is None
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),

            detail=(
                "Proforma not found."
            ),
        )

    return summary


# ================================================================
# RECORD CUSTOMER ADVANCE
# ================================================================

@router.post(
    "/{proforma_id}/advance-payments",
    response_model=(
        ProformaPaymentResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_proforma_advance_payment(
    proforma_id: int,

    payment:
        ProformaPaymentCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "proformas.confirm"
        )
    ),
):

    try:

        return (
            ProformaPaymentService
            .create_payment(
                db=db,

                proforma_id=(
                    proforma_id
                ),

                payment=payment,

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
# RECORD ADVANCE REFUND
#
# Refund is available only after the Proforma is Cancelled.
#
# The refund never deletes or edits the original advance.
# ================================================================

@router.post(
    "/{proforma_id}/advance-refunds",
    response_model=(
        ProformaPaymentRefundResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_proforma_advance_refund(
    proforma_id: int,

    refund:
        ProformaPaymentRefundCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "proformas.cancel"
        )
    ),
):

    try:

        return (
            ProformaPaymentService
            .create_refund(
                db=db,

                proforma_id=(
                    proforma_id
                ),

                refund=refund,

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