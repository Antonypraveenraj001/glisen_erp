from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.models.role_permission import RolePermission


class PermissionRepository:

    @staticmethod
    def role_has_permission(
        db: Session,
        role_id: int,
        permission_name: str,
    ) -> bool:

        permission = (
            db.query(Permission)
            .filter(Permission.name == permission_name)
            .first()
        )

        if permission is None:
            return False

        role_permission = (
            db.query(RolePermission)
            .filter(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission.id,
            )
            .first()
        )

        return role_permission is not None