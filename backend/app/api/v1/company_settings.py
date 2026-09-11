from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.company_settings import (
    CompanySettingsCreate,
    CompanySettingsResponse,
    CompanySettingsUpdate,
)
from app.services.company_settings_service import (
    CompanySettingsService,
)


router = APIRouter(
    prefix="/company-settings",
    tags=["Company Settings"],
)


@router.post(
    "",
    response_model=CompanySettingsResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company_settings(
    data: CompanySettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
        )
    ),
):
    try:
        return CompanySettingsService.create(
            db=db,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=CompanySettingsResponse,
)
def get_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    company_settings = (
        CompanySettingsService.get(
            db=db,
        )
    )

    if company_settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Company settings have not "
                "been created yet."
            ),
        )

    return company_settings


@router.put(
    "",
    response_model=CompanySettingsResponse,
)
def update_company_settings(
    data: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
        )
    ),
):
    try:
        return CompanySettingsService.update(
            db=db,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc