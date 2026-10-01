import mimetypes

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from fastapi.responses import (
    FileResponse,
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
    tags=[
        "Company Settings",
    ],
)


# ================================================================
# CREATE COMPANY SETTINGS
# ================================================================

@router.post(
    "",
    response_model=(
        CompanySettingsResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_company_settings(
    data:
        CompanySettingsCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "settings.company.manage"
        )
    ),
):

    try:

        return (
            CompanySettingsService
            .create(
                db=db,
                data=data,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# GET COMPANY SETTINGS
#
# Company identity is required by generated Proformas and
# Final Billing documents.
# ================================================================

@router.get(
    "",
    response_model=(
        CompanySettingsResponse
    ),
)
def get_company_settings(
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

    company_settings = (
        CompanySettingsService
        .get(
            db=db
        )
    )


    if (
        company_settings
        is
        None
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Company settings have not "
                "been created yet."
            ),
        )


    return company_settings


# ================================================================
# UPDATE COMPANY SETTINGS
# ================================================================

@router.put(
    "",
    response_model=(
        CompanySettingsResponse
    ),
)
def update_company_settings(
    data:
        CompanySettingsUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "settings.company.manage"
        )
    ),
):

    try:

        return (
            CompanySettingsService
            .update(
                db=db,
                data=data,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# UPLOAD COMPANY LOGO
# ================================================================

@router.post(
    "/logo",
    response_model=(
        CompanySettingsResponse
    ),
)
async def upload_company_logo(
    file:
        UploadFile = File(...),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "settings.company.manage"
        )
    ),
):

    try:

        content = await file.read(
            (
                CompanySettingsService
                .MAX_LOGO_SIZE_BYTES
            )
            + 1
        )


        return (
            CompanySettingsService
            .save_logo(
                db=db,

                original_filename=(
                    file.filename
                    or
                    ""
                ),

                content=content,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc

    finally:

        await file.close()


# ================================================================
# GET COMPANY LOGO
#
# Required for Proforma and Final Bill document generation.
# ================================================================

@router.get(
    "/logo",
)
def get_company_logo(
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

    company_settings = (
        CompanySettingsService
        .get(
            db=db
        )
    )


    if (
        company_settings
        is
        None
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Company settings have not "
                "been created yet."
            ),
        )


    logo_path = (
        CompanySettingsService
        .resolve_logo_path(
            company_settings
        )
    )


    if (
        logo_path
        is
        None
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Company logo has not been uploaded."
            ),
        )


    media_type = (
        mimetypes.guess_type(
            logo_path.name
        )[0]
        or
        "application/octet-stream"
    )


    return FileResponse(
        path=logo_path,
        media_type=media_type,
        filename=logo_path.name,
    )


# ================================================================
# DELETE COMPANY LOGO
# ================================================================

@router.delete(
    "/logo",
    response_model=(
        CompanySettingsResponse
    ),
)
def delete_company_logo(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "settings.company.manage"
        )
    ),
):

    try:

        return (
            CompanySettingsService
            .delete_logo(
                db=db
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc