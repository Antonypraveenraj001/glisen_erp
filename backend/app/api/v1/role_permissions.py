from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    require_role,
)
from app.dependencies.database import (
    get_db,
)
from app.models.user import User
from app.schemas.role_permissions import (
    RolePermissionMatrixResponse,
    UpdateRolePermissionsRequest,
    UpdateRolePermissionsResponse,
)
from app.services.role_permission_service import (
    RolePermissionService,
)


router = APIRouter(
    prefix="/role-permissions",
    tags=[
        "Role Permissions",
    ],
)


# ================================================================
# GET MATRIX
#
# Boss only.
# ================================================================

@router.get(
    "/matrix",
    response_model=(
        RolePermissionMatrixResponse
    ),
)
def get_permission_matrix(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_role(
            "Boss",
        )
    ),
):

    return (
        RolePermissionService
        .build_matrix(
            db=db
        )
    )


# ================================================================
# UPDATE ONE ROLE
#
# Boss only.
# ================================================================

@router.put(
    "/roles/{role_id}",
    response_model=(
        UpdateRolePermissionsResponse
    ),
)
def update_role_permissions(
    role_id: int,
    data:
        UpdateRolePermissionsRequest,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_role(
            "Boss",
        )
    ),
):

    try:

        return (
            RolePermissionService
            .update_role_permissions(
                db=db,
                role_id=role_id,
                permission_ids=(
                    data.permission_ids
                ),
            )
        )

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