from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    OAuth2PasswordRequestForm,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
)
from app.dependencies.database import (
    get_db,
)
from app.models.user import User
from app.repositories.permission_repository import (
    PermissionRepository,
)
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import (
    AuthService,
)


router = APIRouter(
    prefix="/auth",
    tags=[
        "Authentication",
    ],
)


# ================================================================
# LOGIN
# ================================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    form_data:
        OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(
        get_db
    ),
):

    token = (
        AuthService.login(
            db=db,
            email=(
                form_data.username
            ),
            password=(
                form_data.password
            ),
        )
    )

    if token is None:

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid email or password"
            ),
        )

    return token


# ================================================================
# CURRENT USER + PERMISSIONS
# ================================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):

    if (
        current_user.role.name
        == "Boss"
    ):

        permissions = (
            PermissionRepository
            .get_all_permission_names(
                db=db
            )
        )

    else:

        permissions = (
            PermissionRepository
            .get_role_permission_names(
                db=db,
                role_id=(
                    current_user.role_id
                ),
            )
        )

    return {
        "id":
            current_user.id,

        "full_name":
            current_user.full_name,

        "username":
            current_user.username,

        "email":
            current_user.email,

        "role_id":
            current_user.role_id,

        "role":
            current_user.role.name,

        "is_active":
            current_user.is_active,

        "last_login":
            current_user.last_login,

        "created_at":
            current_user.created_at,

        "created_by":
            current_user.created_by,

        "permissions":
            permissions,
    }