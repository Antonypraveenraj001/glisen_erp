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
from app.schemas.enquiry import (
    EnquiryCreate,
    EnquiryResponse,
    EnquiryUpdate,
)
from app.services.enquiry_service import (
    EnquiryService,
)


router = APIRouter(
    prefix="/enquiries",
    tags=[
        "Enquiries",
    ],
)


# ================================================================
# CREATE
# ================================================================

@router.post(
    "",
    response_model=EnquiryResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_enquiry(
    enquiry: EnquiryCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "enquiries.create"
        )
    ),
):

    created_enquiry, error = (
        EnquiryService.create(
            db,
            enquiry,
        )
    )

    if error:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=error,
        )

    return created_enquiry


# ================================================================
# LIST
# ================================================================

@router.get(
    "",
    response_model=list[
        EnquiryResponse
    ],
)
def get_enquiries(
    search: str | None = Query(
        default=None,
        description=(
            "Search by enquiry number, "
            "company, contact, phone or machine"
        ),
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description=(
            "Filter enquiries by status"
        ),
    ),
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "enquiries.view"
        )
    ),
):

    return (
        EnquiryService.get_all(
            db,
            search,
            status_filter,
        )
    )


# ================================================================
# GET ONE
# ================================================================

@router.get(
    "/{enquiry_id}",
    response_model=EnquiryResponse,
)
def get_enquiry(
    enquiry_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "enquiries.view"
        )
    ),
):

    enquiry = (
        EnquiryService.get_by_id(
            db,
            enquiry_id,
        )
    )

    if enquiry is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Enquiry not found"
            ),
        )

    return enquiry


# ================================================================
# UPDATE
# ================================================================

@router.put(
    "/{enquiry_id}",
    response_model=EnquiryResponse,
)
def update_enquiry(
    enquiry_id: int,
    enquiry: EnquiryUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "enquiries.edit"
        )
    ),
):

    existing_enquiry = (
        EnquiryService.get_by_id(
            db,
            enquiry_id,
        )
    )

    if existing_enquiry is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Enquiry not found"
            ),
        )

    # ------------------------------------------------------------
    # CANCELLATION IS A SEPARATE PERMISSION
    #
    # Because the existing UI changes status inside Edit Enquiry,
    # cancellation currently requires:
    #
    # enquiries.edit
    # +
    # enquiries.cancel
    #
    # Normal edits require only enquiries.edit.
    # ------------------------------------------------------------

    requested_status = (
        enquiry.status
        or ""
    ).strip().lower()

    existing_status = (
        existing_enquiry.status
        or ""
    ).strip().lower()

    is_new_cancellation = (
        requested_status
        == "cancelled"
        and
        existing_status
        != "cancelled"
    )

    if (
        is_new_cancellation
        and
        current_user.role.name
        != "Boss"
    ):

        can_cancel = (
            PermissionRepository
            .role_has_permission(
                db=db,
                role_id=(
                    current_user.role_id
                ),
                permission_name=(
                    "enquiries.cancel"
                ),
            )
        )

        if not can_cancel:

            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "You do not have permission "
                    "to cancel Enquiries."
                ),
            )

    updated_enquiry, error = (
        EnquiryService.update(
            db=db,
            enquiry_id=enquiry_id,
            enquiry_data=enquiry,
        )
    )

    if error:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
                if error
                == "Enquiry not found"
                else
                status.HTTP_400_BAD_REQUEST
            ),
            detail=error,
        )

    return updated_enquiry


# ================================================================
# DELETE
# ================================================================

@router.delete(
    "/{enquiry_id}",
)
def delete_enquiry(
    enquiry_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "enquiries.delete"
        )
    ),
):

    enquiry = (
        EnquiryService.delete(
            db,
            enquiry_id,
        )
    )

    if enquiry is None:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Enquiry not found"
            ),
        )

    return {
        "message":
            "Enquiry deleted successfully."
    }