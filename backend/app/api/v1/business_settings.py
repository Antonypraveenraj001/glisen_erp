from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)
from app.dependencies.permissions import (
    require_permission,
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


# ================================================================
# GET BUSINESS SETTINGS
#
# Permission:
#     settings.view
#
# Reading these values is allowed to users who can open Settings.
# Modification remains Boss-only.
# ================================================================

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
        require_permission(
            "settings.view"
        )
    ),
):

    return (
        BusinessSettingsService
        .get_or_create(
            db=db
        )
    )


# ================================================================
# UPDATE BUSINESS SETTINGS
#
# Permission:
#     settings.business.manage
#
# This permission is marked boss_only in the permission catalogue.
# It cannot be assigned to normal roles through the permission
# matrix.
# ================================================================

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
        require_permission(
            "settings.business.manage"
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