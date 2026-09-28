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
        get_current_user
    ),
):
    return (
        DocumentSettingsService
        .get_or_create(
            db=db
        )
    )


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
        require_role(
            "Boss",
            "Admin",
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