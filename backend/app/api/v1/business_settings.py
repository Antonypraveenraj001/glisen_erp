from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
)
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
# All authenticated ERP users may read these defaults.
#
# This allows normal module pages to use shared settings such as:
#
# - default_page_size
# - currency
# - timezone
# - GST defaults
# - document prefixes
#
# Reading does NOT allow the user to edit Settings.
# Modification remains protected separately.
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
        get_current_user
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
# Boss-only.
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