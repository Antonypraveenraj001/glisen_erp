from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import require_role
from app.dependencies.database import get_db
from app.models.user import User

from app.schemas.purchase_bill_ai import (
    PurchaseBillAIResponse,
)

from app.schemas.purchase_bill_ai_confirm import (
    PurchaseBillAIConfirmRequest,
)

from app.services.purchase_bill_ai_confirm_service import (
    PurchaseBillAIConfirmService,
)

from app.services.purchase_bill_ai_service import (
    PurchaseBillAIService,
)


router = APIRouter(
    prefix="/purchase-bills",
    tags=["Purchase Bill Processing"],
)


# ============================================================
# AI EXTRACTION
# ============================================================

@router.post(
    "/extract",
    response_model=PurchaseBillAIResponse,
)
async def extract_purchase_bill(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Purchase",
        )
    ),
):
    """
    Extract purchase bill information using AI.

    The uploaded purchase bill is processed by the
    PurchaseBillAIService.

    The extracted information is returned to the frontend
    for review/editing before confirmation.
    """

    file_bytes = await file.read()

    return await PurchaseBillAIService.extract(
        db=db,
        file_bytes=file_bytes,
        filename=file.filename,
    )


# ============================================================
# CONFIRM PURCHASE BILL
# ============================================================

@router.post(
    "/confirm",
)
def confirm_purchase_bill(
    request: PurchaseBillAIConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Purchase",
        )
    ),
):
    """
    Confirm an AI-extracted purchase bill.

    The frontend sends the reviewed/edited purchase bill data.

    The confirmation service:

    1. Validates the bill date
    2. Finds or creates the supplier
    3. Prevents duplicate bills
    4. Creates the purchase bill
    5. Finds or creates products
    6. Creates purchase bill items
    7. Commits everything to the database

    PurchaseBillAIConfirmService.confirm() returns a dictionary,
    so this endpoint returns that dictionary directly.
    """

    result = (
        PurchaseBillAIConfirmService.confirm(
            db=db,
            data=request,
            current_user_id=current_user.id,
        )
    )

    return result