from fastapi import (
    APIRouter,
    Depends,
    status,
)

from app.database.session import get_db
from app.dependencies.auth import require_role
from app.models.user import User
from app.schemas.purchase_bill_ai_confirm import (
    PurchaseBillAIConfirmRequest,
)
from app.schemas.purchase_bill import (
    PurchaseBillResponse,
)
from app.services.purchase_bill_ai_confirm_service import (
    PurchaseBillAIConfirmService,
)

router = APIRouter(
    prefix="/purchase-bills",
    tags=["Purchase Bill Processing"],
)


@router.post(
    "/confirm",
    response_model=PurchaseBillResponse,
    status_code=status.HTTP_201_CREATED,
)
def confirm_purchase_bill(
    request: PurchaseBillAIConfirmRequest,
    db=Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Purchase",
        )
    ),
):

    return PurchaseBillAIConfirmService.confirm(
        db=db,
        request=request,
        created_by=current_user.id,
    )