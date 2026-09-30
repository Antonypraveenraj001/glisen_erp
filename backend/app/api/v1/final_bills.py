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

from app.schemas.final_bill import (
    FinalBillCreateFromProforma,
    FinalBillCreditNoteCreate,
    FinalBillItemUpdate,
    FinalBillResponse,
    FinalBillRevisionCreate,
    FinalBillUpdate,
)

from app.schemas.final_bill_payment import (
    FinalBillPaymentCreate,
    FinalBillPaymentResponse,
    FinalBillPaymentSummaryResponse,
)

from app.services.final_bill_service import (
    FinalBillService,
)

from app.services.final_bill_payment_service import (
    FinalBillPaymentService,
)


router = APIRouter(
    prefix="/final-bills",
    tags=["Final Billing"],
)


# ============================================================
# CREATE FINAL BILL FROM PROFORMA
#
# Permission:
#     final_billing.create_edit
# ============================================================

@router.post(
    "/from-proforma/{proforma_id}",
    response_model=FinalBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_final_bill_from_proforma(
    proforma_id: int,
    data: FinalBillCreateFromProforma,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.create_edit"
        )
    ),
):
    try:

        return (
            FinalBillService
            .create_from_proforma(
                db=db,
                proforma_id=proforma_id,
                created_by=(
                    current_user.id
                ),
                invoice_date=(
                    data.invoice_date
                ),
                notes=data.notes,
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
        )


# ============================================================
# GET ALL FINAL BILLS
#
# Shared endpoint:
#
# Final Billing:
#     final_billing.view
#
# Finished Products:
#     finished_products.view
#
# Finished Products uses this list only to resolve the billing
# status linked to each manufactured output. That must continue
# working even when the Final Billing module itself is OFF.
# ============================================================

@router.get(
    "",
    response_model=list[
        FinalBillResponse
    ],
)
def get_all_final_bills(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_any_permission(
            "final_billing.view",
            "finished_products.view",
        )
    ),
):

    return (
        FinalBillService
        .get_all(
            db
        )
    )


# ============================================================
# CREATE REVISED FINAL BILL
#
# Permission:
#     final_billing.revision
# ============================================================

@router.post(
    "/{final_bill_id}/revise",
    response_model=FinalBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_revised_final_bill(
    final_bill_id: int,
    data: FinalBillRevisionCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.revision"
        )
    ),
):
    try:

        return (
            FinalBillService
            .create_revision(
                db=db,
                final_bill_id=(
                    final_bill_id
                ),
                created_by=(
                    current_user.id
                ),
                invoice_date=(
                    data.invoice_date
                ),
                notes=data.notes,
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
        )


# ============================================================
# CREATE CREDIT NOTE
#
# Permission:
#     final_billing.credit_note
# ============================================================

@router.post(
    "/{final_bill_id}/credit-note",
    response_model=FinalBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_credit_note(
    final_bill_id: int,
    data: FinalBillCreditNoteCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.credit_note"
        )
    ),
):
    try:

        return (
            FinalBillService
            .create_credit_note(
                db=db,
                final_bill_id=(
                    final_bill_id
                ),
                created_by=(
                    current_user.id
                ),
                invoice_date=(
                    data.invoice_date
                ),
                notes=data.notes,
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
        )


# ============================================================
# PAYMENT SUMMARY
#
# Permission:
#     final_billing.view
# ============================================================

@router.get(
    "/{final_bill_id}/payment-summary",
    response_model=(
        FinalBillPaymentSummaryResponse
    ),
)
def get_final_bill_payment_summary(
    final_bill_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.view"
        )
    ),
):

    summary = (
        FinalBillPaymentService
        .get_summary(
            db=db,
            final_bill_id=(
                final_bill_id
            ),
        )
    )

    if summary is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Final Bill not found."
            ),
        )

    return summary


# ============================================================
# RECORD CUSTOMER PAYMENT
#
# Permission:
#     final_billing.payment
# ============================================================

@router.post(
    "/{final_bill_id}/payments",
    response_model=(
        FinalBillPaymentResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_final_bill_payment(
    final_bill_id: int,
    payment: FinalBillPaymentCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.payment"
        )
    ),
):

    try:

        return (
            FinalBillPaymentService
            .create_payment(
                db=db,
                final_bill_id=(
                    final_bill_id
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
        )


# ============================================================
# UPDATE DRAFT FINAL BILL ITEM
#
# Permission:
#     final_billing.create_edit
# ============================================================

@router.put(
    "/{final_bill_id}/items/{item_id}",
    response_model=FinalBillResponse,
)
def update_final_bill_item(
    final_bill_id: int,
    item_id: int,
    data: FinalBillItemUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.create_edit"
        )
    ),
):
    try:

        return (
            FinalBillService
            .update_draft_item(
                db=db,
                final_bill_id=(
                    final_bill_id
                ),
                item_id=item_id,
                data=data,
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
        )


# ============================================================
# ISSUE FINAL BILL
#
# Permission:
#     final_billing.issue
# ============================================================

@router.patch(
    "/{final_bill_id}/issue",
    response_model=FinalBillResponse,
)
def issue_final_bill(
    final_bill_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.issue"
        )
    ),
):
    try:

        return (
            FinalBillService
            .issue_final_bill(
                db=db,
                final_bill_id=(
                    final_bill_id
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
        )


# ============================================================
# UPDATE DRAFT FINAL BILL HEADER
#
# Permission:
#     final_billing.create_edit
# ============================================================

@router.put(
    "/{final_bill_id}",
    response_model=FinalBillResponse,
)
def update_final_bill(
    final_bill_id: int,
    data: FinalBillUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.create_edit"
        )
    ),
):
    try:

        return (
            FinalBillService
            .update_draft(
                db=db,
                final_bill_id=(
                    final_bill_id
                ),
                data=data,
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
        )


# ============================================================
# GET FINAL BILL BY ID
#
# Permission:
#     final_billing.view
# ============================================================

@router.get(
    "/{final_bill_id}",
    response_model=FinalBillResponse,
)
def get_final_bill(
    final_bill_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "final_billing.view"
        )
    ),
):

    final_bill = (
        FinalBillService
        .get_by_id(
            db=db,
            final_bill_id=(
                final_bill_id
            ),
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