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
# GET PERMISSION MATRIX
#
# Permission:
#     permissions.manage
#
# This permission is Boss-only in the permission catalogue.
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
        require_permission(
            "permissions.manage"
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
# UPDATE ROLE PERMISSIONS
#
# Permission:
#     permissions.manage
#
# This permission is Boss-only in the permission catalogue.
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
        require_permission(
            "permissions.manage"
        )
    ),
):

    try:

        return (
            RolePermissionService
            .update_role_permissions(
                db=db,
                role_id=(
                    role_id
                ),
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