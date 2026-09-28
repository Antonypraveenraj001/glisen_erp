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
from app.dependencies.database import (
    get_db,
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
        require_role(
            "Boss",
            "Admin",
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
        require_role(
            "Boss",
            "Admin",
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
        require_role(
            "Boss",
            "Admin",
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
        require_role(
            "Boss",
            "Admin",
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
# ACTIVATE / DEACTIVATE
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
        require_role(
            "Boss",
            "Admin",
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