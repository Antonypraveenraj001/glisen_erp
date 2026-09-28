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
from app.schemas.security import (
    ChangePasswordRequest,
    PasswordActionResponse,
    ResetPasswordRequest,
)
from app.services.security_service import (
    SecurityService,
)


router = APIRouter(
    prefix="/security",
    tags=[
        "Security",
    ],
)


# ================================================================
# CHANGE MY PASSWORD
# ================================================================

@router.post(
    "/change-password",
    response_model=(
        PasswordActionResponse
    ),
)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):

    try:

        (
            SecurityService
            .change_own_password(
                db=db,
                user=current_user,
                current_password=(
                    data.current_password
                ),
                new_password=(
                    data.new_password
                ),
            )
        )


        return (
            PasswordActionResponse(
                message=(
                    "Password changed successfully."
                )
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
# RESET ANOTHER USER PASSWORD
# ================================================================

@router.post(
    "/users/{user_id}/reset-password",
    response_model=(
        PasswordActionResponse
    ),
)
def reset_user_password(
    user_id: int,
    data: ResetPasswordRequest,
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

        (
            SecurityService
            .reset_user_password(
                db=db,
                target_user_id=(
                    user_id
                ),
                new_password=(
                    data.new_password
                ),
                actor=current_user,
            )
        )


        return (
            PasswordActionResponse(
                message=(
                    "Password reset successfully."
                )
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