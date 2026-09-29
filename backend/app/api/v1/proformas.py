from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)
from app.dependencies.permissions import (
    require_permission,
)
from app.models.user import User
from app.repositories.permission_repository import (
    PermissionRepository,
)
from app.schemas.proforma import (
    ProformaCreate,
    ProformaResponse,
    ProformaUpdate,
)
from app.services.proforma_service import (
    ProformaService,
)


router = APIRouter(
    prefix="/proformas",
    tags=[
        "Proformas",
    ],
)


# ================================================================
# STATUS PERMISSION HELPER
#
# Draft / Sent / Rejected
#     -> proformas.edit
#
# Confirmed / Order Confirmed
#     -> proformas.confirm
#
# Cancelled
#     -> proformas.cancel
#
# Boss bypasses permission lookup.
# ================================================================

def require_status_permission(
    db: Session,
    current_user: User,
    status_value: str,
) -> None:

    if (
        current_user.role.name
        == "Boss"
    ):
        return

    normalized_status = (
        status_value
        or ""
    ).strip().lower()

    if normalized_status in {
        "confirmed",
        "order confirmed",
    }:

        permission_name = (
            "proformas.confirm"
        )

        denied_message = (
            "You do not have permission "
            "to confirm Proformas."
        )

    elif (
        normalized_status
        == "cancelled"
    ):

        permission_name = (
            "proformas.cancel"
        )

        denied_message = (
            "You do not have permission "
            "to cancel Proformas."
        )

    else:

        permission_name = (
            "proformas.edit"
        )

        denied_message = (
            "You do not have permission "
            "to change Proforma status."
        )

    has_permission = (
        PermissionRepository
        .role_has_permission(
            db=db,
            role_id=(
                current_user.role_id
            ),
            permission_name=(
                permission_name
            ),
        )
    )

    if not has_permission:

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                denied_message
            ),
        )


# ================================================================
# CREATE PROFORMA
#
# Normal creation starts as Draft.
#
# If a caller attempts to create directly in another status,
# the matching status permission is also required.
# ================================================================

@router.post(
    "",
    response_model=ProformaResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_proforma(
    proforma: ProformaCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.create"
        )
    ),
):

    requested_status = (
        proforma.status
        or "Draft"
    ).strip()

    if (
        requested_status.lower()
        != "draft"
    ):

        require_status_permission(
            db=db,
            current_user=current_user,
            status_value=requested_status,
        )

    service = (
        ProformaService(
            db
        )
    )

    try:

        return (
            service.create(
                proforma
            )
        )

    except ValueError as error:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                error
            ),
        ) from error


# ================================================================
# GET ALL PROFORMAS
# ================================================================

@router.get(
    "",
    response_model=list[
        ProformaResponse
    ],
)
def get_proformas(
    search: str | None = Query(
        default=None,
        description=(
            "Search by proforma number, "
            "company, contact, phone or email"
        ),
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description=(
            "Filter proformas by status"
        ),
    ),
    customer_id: int | None = Query(
        default=None,
        description=(
            "Filter by customer ID"
        ),
    ),
    enquiry_id: int | None = Query(
        default=None,
        description=(
            "Filter by enquiry ID"
        ),
    ),
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.view"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    return (
        service.get_all(
            search=search,
            status=status_filter,
            customer_id=customer_id,
            enquiry_id=enquiry_id,
        )
    )


# ================================================================
# GET PROFORMA BY ID
# ================================================================

@router.get(
    "/{proforma_id}",
    response_model=ProformaResponse,
)
def get_proforma(
    proforma_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.view"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    proforma = (
        service.get_by_id(
            proforma_id
        )
    )

    if proforma is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    return proforma


# ================================================================
# GET PROFORMA BY NUMBER
# ================================================================

@router.get(
    "/number/{proforma_number}",
    response_model=ProformaResponse,
)
def get_proforma_by_number(
    proforma_number: str,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.view"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    proforma = (
        service.get_by_number(
            proforma_number
        )
    )

    if proforma is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    return proforma


# ================================================================
# GET PROFORMAS BY ENQUIRY
# ================================================================

@router.get(
    "/enquiry/{enquiry_id}",
    response_model=list[
        ProformaResponse
    ],
)
def get_proformas_by_enquiry(
    enquiry_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.view"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    return (
        service.get_by_enquiry(
            enquiry_id
        )
    )


# ================================================================
# UPDATE PROFORMA
#
# General editing requires proformas.edit.
#
# If the request also attempts to change status, the matching
# status permission is additionally checked so PUT cannot be used
# to bypass Confirm or Cancel permissions.
# ================================================================

@router.put(
    "/{proforma_id}",
    response_model=ProformaResponse,
)
def update_proforma(
    proforma_id: int,
    proforma: ProformaUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.edit"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    existing_proforma = (
        service.get_by_id(
            proforma_id
        )
    )

    if existing_proforma is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    update_data = (
        proforma.model_dump(
            exclude_unset=True
        )
    )

    requested_status = (
        update_data.get(
            "status"
        )
    )

    if (
        requested_status
        is not None
    ):

        current_status = (
            existing_proforma.status
            or ""
        ).strip().lower()

        normalized_requested_status = (
            requested_status
            or ""
        ).strip().lower()

        if (
            normalized_requested_status
            != current_status
        ):

            require_status_permission(
                db=db,
                current_user=current_user,
                status_value=(
                    requested_status
                ),
            )

    try:

        updated_proforma = (
            service.update(
                proforma_id,
                proforma,
            )
        )

    except ValueError as error:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                error
            ),
        ) from error

    if updated_proforma is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    return updated_proforma


# ================================================================
# UPDATE PROFORMA STATUS
#
# The user must first have View permission because the status action
# belongs to a Proforma they are allowed to access.
#
# Specific action:
#
# Draft / Sent / Rejected -> proformas.edit
# Confirmed               -> proformas.confirm
# Cancelled               -> proformas.cancel
# ================================================================

@router.patch(
    "/{proforma_id}/status",
    response_model=ProformaResponse,
)
def update_proforma_status(
    proforma_id: int,
    status_value: str = Query(
        ...,
        alias="status",
        description=(
            "New Proforma status"
        ),
    ),
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.view"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    existing_proforma = (
        service.get_by_id(
            proforma_id
        )
    )

    if existing_proforma is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    current_status = (
        existing_proforma.status
        or ""
    ).strip().lower()

    requested_status = (
        status_value
        or ""
    ).strip().lower()

    if (
        requested_status
        != current_status
    ):

        require_status_permission(
            db=db,
            current_user=current_user,
            status_value=status_value,
        )

    try:

        proforma = (
            service.update_status(
                proforma_id,
                status_value,
            )
        )

    except ValueError as error:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                error
            ),
        ) from error

    if proforma is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    return proforma


# ================================================================
# DELETE PROFORMA
# ================================================================

@router.delete(
    "/{proforma_id}",
)
def delete_proforma(
    proforma_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "proformas.delete"
        )
    ),
):

    service = (
        ProformaService(
            db
        )
    )

    deleted = (
        service.delete(
            proforma_id
        )
    )

    if not deleted:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Proforma not found"
            ),
        )

    return {
        "message":
            "Proforma deleted successfully."
    }