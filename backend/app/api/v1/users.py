from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
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
from app.models.user import (
    User,
)
from app.schemas.user import (
    CreateUser,
    RoleResponse,
    UpdateUser,
    UserResponse,
    UserStatusUpdate,
)
from app.services.user_management_service import (
    UserManagementService,
)


router = APIRouter(
    prefix="/users",
    tags=[
        "Users",
    ],
)


# ================================================================
# CURRENT USER
#
# Every authenticated user must be able to retrieve their own
# profile. This endpoint is not tied to Settings permissions.
# ================================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user_profile(
    current_user: User = Depends(
        get_current_user
    ),
):

    return current_user


# ================================================================
# ROLES
#
# Permission:
#     users.view
#
# The role list is needed by Users & Access when displaying
# existing users and assigning roles.
# ================================================================

@router.get(
    "/roles",
    response_model=list[
        RoleResponse
    ],
)
def list_roles(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "users.view"
        )
    ),
):

    return (
        UserManagementService
        .list_roles(
            db=db
        )
    )


# ================================================================
# LIST USERS
#
# Permission:
#     users.view
# ================================================================

@router.get(
    "",
    response_model=list[
        UserResponse
    ],
)
@router.get(
    "/",
    response_model=list[
        UserResponse
    ],
    include_in_schema=False,
)
def list_users(
    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "users.view"
        )
    ),
):

    return (
        UserManagementService
        .list_users(
            db=db
        )
    )


# ================================================================
# CREATE USER
#
# Permission:
#     users.manage
#
# Additional account protections are enforced inside
# UserManagementService.
# ================================================================

@router.post(
    "",
    response_model=UserResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_user(
    data: CreateUser,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "users.manage"
        )
    ),
):

    try:

        return (
            UserManagementService
            .create_user(
                db=db,
                data=data,
                actor=current_user,
            )
        )

    except PermissionError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=str(
                exc
            ),
        ) from exc

    except LookupError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc

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
# UPDATE USER
#
# Permission:
#     users.manage
#
# UserManagementService continues to protect:
#     - Boss accounts
#     - the final active Boss
#     - self-role changes
#     - other restricted account operations
# ================================================================

@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
def update_user(
    user_id: int,
    data: UpdateUser,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "users.manage"
        )
    ),
):

    try:

        return (
            UserManagementService
            .update_user(
                db=db,
                user_id=user_id,
                data=data,
                actor=current_user,
            )
        )

    except PermissionError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=str(
                exc
            ),
        ) from exc

    except LookupError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc

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
# ACTIVATE / DEACTIVATE USER
#
# Permission:
#     users.manage
#
# Service-level protections remain authoritative for protected
# accounts and self-deactivation.
# ================================================================

@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "users.manage"
        )
    ),
):

    try:

        return (
            UserManagementService
            .set_user_status(
                db=db,
                user_id=user_id,
                is_active=(
                    data.is_active
                ),
                actor=current_user,
            )
        )

    except PermissionError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=str(
                exc
            ),
        ) from exc

    except LookupError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc