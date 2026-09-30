from fastapi import (
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
from app.repositories.permission_repository import (
    PermissionRepository,
)


# ================================================================
# REQUIRE ONE PERMISSION
# ================================================================

def require_permission(
    permission_name: str
):

    def permission_checker(
        current_user=Depends(
            get_current_user
        ),
        db: Session = Depends(
            get_db
        ),
    ):

        # Boss always has full access.
        if (
            current_user.role.name
            ==
            "Boss"
        ):
            return current_user


        has_permission = (
            PermissionRepository
            .role_has_permission(
                db=db,
                role_id=current_user.role_id,
                permission_name=(
                    permission_name
                ),
            )
        )


        if (
            not has_permission
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Permission denied."
                ),
            )


        return current_user

    return permission_checker


# ================================================================
# REQUIRE ANY ONE OF MULTIPLE PERMISSIONS
#
# Used when one shared backend endpoint legitimately supports
# more than one ERP module/workflow.
#
# Example:
#
# GET /production/orders
#
# - Production module needs production.view
# - Stock Material Issue needs stock.issue so Store users can
#   choose the destination Production Order without being given
#   access to the Production module itself.
#
# This is OR logic, not AND logic.
# ================================================================

def require_any_permission(
    *permission_names: str
):

    def permission_checker(
        current_user=Depends(
            get_current_user
        ),
        db: Session = Depends(
            get_db
        ),
    ):

        # Boss always has full access.
        if (
            current_user.role.name
            ==
            "Boss"
        ):
            return current_user


        for permission_name in (
            permission_names
        ):

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


            if (
                has_permission
            ):
                return current_user


        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Permission denied."
            ),
        )

    return permission_checker