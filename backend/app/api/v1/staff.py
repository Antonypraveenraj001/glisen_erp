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
from app.schemas.staff import (
    StaffCreate,
    StaffListResponse,
    StaffResponse,
    StaffUpdate,
)
from app.services.staff_service import (
    StaffService,
)


router = APIRouter(
    prefix="/staff",
    tags=[
        "Staff"
    ],
)


# ================================================================
# CREATE STAFF
#
# Permission:
#     staff.manage
# ================================================================

@router.post(
    "",
    response_model=StaffResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_staff(
    data: StaffCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.manage"
        )
    ),
):

    try:

        return (
            StaffService
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
# LIST STAFF
#
# Permission:
#     staff.view
# ================================================================

@router.get(
    "",
    response_model=StaffListResponse,
)
def get_staff(
    active_only: bool = Query(
        False,
        description=(
            "Return only active staff."
        ),
    ),

    search: str | None = Query(
        None,
        description=(
            "Search staff name, "
            "designation or notes."
        ),
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.view"
        )
    ),
):

    staff_members = (
        StaffService
        .get_all(
            db=db,
            active_only=(
                active_only
            ),
            search=(
                search
            ),
        )
    )

    return {
        "total":
            len(
                staff_members
            ),

        "items":
            staff_members,
    }


# ================================================================
# GET STAFF
#
# Permission:
#     staff.view
# ================================================================

@router.get(
    "/{staff_id}",
    response_model=StaffResponse,
)
def get_staff_member(
    staff_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.view"
        )
    ),
):

    try:

        return (
            StaffService
            .get_by_id(
                db=db,
                staff_id=(
                    staff_id
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# UPDATE STAFF
#
# Permission:
#     staff.manage
# ================================================================

@router.put(
    "/{staff_id}",
    response_model=StaffResponse,
)
def update_staff(
    staff_id: int,
    data: StaffUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.manage"
        )
    ),
):

    try:

        return (
            StaffService
            .update(
                db=db,
                staff_id=(
                    staff_id
                ),
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
# DEACTIVATE STAFF
#
# Permission:
#     staff.manage
#
# We do not hard-delete staff because historical production
# overhead costing must remain traceable.
# ================================================================

@router.delete(
    "/{staff_id}",
    response_model=StaffResponse,
)
def deactivate_staff(
    staff_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "staff.manage"
        )
    ),
):

    try:

        return (
            StaffService
            .deactivate(
                db=db,
                staff_id=(
                    staff_id
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc