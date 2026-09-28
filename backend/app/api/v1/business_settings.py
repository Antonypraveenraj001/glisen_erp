from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from app.dependencies.database import (
    get_db,
)
from app.models.user import User
from app.schemas.business_settings import (
    BusinessSettingsResponse,
    BusinessSettingsUpdate,
)
from app.services.business_settings_service import (
    BusinessSettingsService,
)


router = APIRouter(
    prefix="/business-settings",
    tags=[
        "Business Settings",
    ],
)


@router.get(
    "",
    response_model=(
        BusinessSettingsResponse
    ),
)
def get_business_settings(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    return (
        BusinessSettingsService
        .get_or_create(
            db=db
        )
    )


@router.put(
    "",
    response_model=(
        BusinessSettingsResponse
    ),
)
def update_business_settings(
    data: BusinessSettingsUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_role(
            "Boss",
        )
    ),
):
    return (
        BusinessSettingsService
        .update(
            db=db,
            data=data,
        )
    )