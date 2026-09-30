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
# Permission:
#     settings.view
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
        require_permission(
            "settings.view"
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
# Permission:
#     settings.documents.manage
# ================================================================

@router.put(
    "",
    response_model=(
        DocumentSettingsResponse
    ),
)
def update_document_settings(
    data: DocumentSettingsUpdate,

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