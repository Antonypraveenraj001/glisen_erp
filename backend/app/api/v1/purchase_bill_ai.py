from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    require_role,
)
from app.dependencies.database import (
    get_db,
)
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

    file_bytes = await file.read()

    return await PurchaseBillAIService.extract(
        db=db,
        file_bytes=file_bytes,
        filename=file.filename,
    )


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

    purchase_bill = (
        PurchaseBillAIConfirmService.confirm(
            db=db,
            request=request,
            created_by=current_user.id,
        )
    )

    return {
        "message": (
            "Purchase Bill created successfully."
        ),
        "purchase_bill_id": purchase_bill.id,
    }