from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.models.role_permission import RolePermission


class PermissionRepository:

    # ============================================================
    # CHECK ONE PERMISSION
    # ============================================================

    @staticmethod
    def role_has_permission(
        db: Session,
        role_id: int,
        permission_name: str,
    ) -> bool:

        permission = (
            db.query(
                Permission
            )
            .filter(
                Permission.name
                == permission_name
            )
            .first()
        )

        if permission is None:
            return False

        role_permission = (
            db.query(
                RolePermission
            )
            .filter(
                RolePermission.role_id
                == role_id,
                RolePermission.permission_id
                == permission.id,
            )
            .first()
        )

        return (
            role_permission
            is not None
        )

    # ============================================================
    # GET ROLE PERMISSION NAMES
    # ============================================================

    @staticmethod
    def get_role_permission_names(
        db: Session,
        role_id: int,
    ) -> list[str]:

        rows = (
            db.query(
                Permission.name
            )
            .join(
                RolePermission,
                RolePermission.permission_id
                == Permission.id,
            )
            .filter(
                RolePermission.role_id
                == role_id
            )
            .order_by(
                Permission.name.asc()
            )
            .all()
        )

        return [
            row[0]
            for row in rows
        ]

    # ============================================================
    # GET ALL PERMISSION NAMES
    #
    # Used for Boss frontend display.
    # Backend Boss access still bypasses permission lookup.
    # ============================================================

    @staticmethod
    def get_all_permission_names(
        db: Session,
    ) -> list[str]:

        rows = (
            db.query(
                Permission.name
            )
            .order_by(
                Permission.name.asc()
            )
            .all()
        )

        return [
            row[0]
            for row in rows
        ]