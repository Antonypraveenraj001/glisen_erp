from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
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
    StaffResponse,
)
from app.services.staff_lifecycle_service import (
    StaffLifecycleService,
)


router = APIRouter(
    prefix="/staff-lifecycle",
    tags=[
        "Staff Lifecycle"
    ],
)


@router.post(
    "/{staff_id}/reactivate",
    response_model=StaffResponse,
)
def reactivate_staff(
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
            StaffLifecycleService
            .reactivate(
                db=db,
                staff_id=staff_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc


@router.delete(
    "/{staff_id}/master",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_staff_from_master(
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

        (
            StaffLifecycleService
            .delete_from_master(
                db=db,
                staff_id=staff_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc
