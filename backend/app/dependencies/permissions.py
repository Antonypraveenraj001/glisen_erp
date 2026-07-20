from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.repositories.permission_repository import PermissionRepository


def require_permission(permission_name: str):

    def permission_checker(
        current_user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):

        # Boss always has full access
        if current_user.role.name == "Boss":
            return current_user

        has_permission = PermissionRepository.role_has_permission(
            db=db,
            role_id=current_user.role_id,
            permission_name=permission_name,
        )

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied.",
            )

        return current_user

    return permission_checker