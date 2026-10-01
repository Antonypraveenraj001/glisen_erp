from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)

from app.dependencies.permissions import (
    require_any_permission,
    require_permission,
)

from app.models.user import (
    User,
)

from app.schemas.document_settings import (
    DocumentSettingsResponse,
    DocumentSettingsUpdate,
)

from app.services.document_settings_service import (
    DocumentSettingsService,
)


router = APIRouter(
    prefix="/document-settings",
    tags=[
        "Document Settings",
    ],
)


# ================================================================
# GET DOCUMENT SETTINGS
#
# These settings are operational document-output settings.
#
# They may be read by:
#
# - Settings module
# - Proformas module for Print / Download
# - Final Billing module for Print / Download
#
# Editing remains protected separately.
# ================================================================

@router.get(
    "",
    response_model=(
        DocumentSettingsResponse
    ),
)
def get_document_settings(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_any_permission(
            "settings.view",
            "proformas.view",
            "final_billing.view",
        )
    ),
):

    return (
        DocumentSettingsService
        .get_or_create(
            db=db
        )
    )


# ================================================================
# UPDATE DOCUMENT SETTINGS
#
# Boss / authorized Settings users only.
# ================================================================

@router.put(
    "",
    response_model=(
        DocumentSettingsResponse
    ),
)
def update_document_settings(
    data:
        DocumentSettingsUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "settings.documents.manage"
        )
    ),
):

    return (
        DocumentSettingsService
        .update(
            db=db,
            data=data,
        )
    )