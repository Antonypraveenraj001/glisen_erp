from sqlalchemy.orm import Session

from app.constants.permission_catalog import (
    BOSS_ONLY_PERMISSION_NAMES,
    PERMISSION_CATALOG,
    PERMISSION_METADATA,
    PERMISSION_NAMES,
)
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission


class RolePermissionService:

    # ============================================================
    # CATALOG PERMISSIONS
    # ============================================================

    @staticmethod
    def get_catalog_permissions(
        db: Session,
    ) -> list[Permission]:

        permissions = (
            db.query(
                Permission
            )
            .filter(
                Permission.name.in_(
                    PERMISSION_NAMES
                )
            )
            .all()
        )

        by_name = {
            permission.name:
                permission
            for permission
            in permissions
        }

        ordered = []

        for item in PERMISSION_CATALOG:

            permission = by_name.get(
                item["name"]
            )

            if permission is not None:
                ordered.append(
                    permission
                )

        return ordered

    # ============================================================
    # ROLES
    # ============================================================

    @staticmethod
    def get_roles(
        db: Session,
    ) -> list[Role]:

        return (
            db.query(
                Role
            )
            .order_by(
                Role.id.asc()
            )
            .all()
        )

    # ============================================================
    # MATRIX
    # ============================================================

    @staticmethod
    def build_matrix(
        db: Session,
    ) -> dict:

        roles = (
            RolePermissionService
            .get_roles(
                db=db
            )
        )

        permissions = (
            RolePermissionService
            .get_catalog_permissions(
                db=db
            )
        )

        permission_ids = {
            permission.name:
                permission.id
            for permission
            in permissions
        }

        catalog_ids = set(
            permission_ids.values()
        )

        assignments = (
            db.query(
                RolePermission
            )
            .filter(
                RolePermission.permission_id.in_(
                    catalog_ids
                )
            )
            .all()
            if catalog_ids
            else []
        )

        assignments_by_role: dict[
            int,
            list[int],
        ] = {}

        for assignment in assignments:

            assignments_by_role.setdefault(
                assignment.role_id,
                [],
            ).append(
                assignment.permission_id
            )

        role_items = []

        assignment_items = []

        for role in roles:

            protected = (
                role.name
                == "Boss"
            )

            role_items.append({
                "id":
                    role.id,

                "name":
                    role.name,

                "description":
                    role.description,

                "is_active":
                    role.is_active,

                "protected":
                    protected,
            })

            if protected:

                effective_ids = sorted(
                    catalog_ids
                )

            else:

                effective_ids = sorted(
                    assignments_by_role.get(
                        role.id,
                        [],
                    )
                )

            assignment_items.append({
                "role_id":
                    role.id,

                "permission_ids":
                    effective_ids,
            })

        permission_items = []

        for permission in permissions:

            metadata = (
                PERMISSION_METADATA[
                    permission.name
                ]
            )

            permission_items.append({
                "id":
                    permission.id,

                "name":
                    permission.name,

                "module":
                    metadata["module"],

                "label":
                    metadata["label"],

                "description":
                    metadata[
                        "description"
                    ],

                "depends_on":
                    metadata[
                        "depends_on"
                    ],

                "boss_only":
                    metadata[
                        "boss_only"
                    ],
            })

        return {
            "roles":
                role_items,

            "permissions":
                permission_items,

            "assignments":
                assignment_items,
        }

    # ============================================================
    # VALIDATE DEPENDENCIES
    # ============================================================

    @staticmethod
    def validate_dependencies(
        selected_names: set[str],
    ) -> None:

        for permission_name in (
            selected_names
        ):

            metadata = (
                PERMISSION_METADATA[
                    permission_name
                ]
            )

            parent_name = (
                metadata[
                    "depends_on"
                ]
            )

            if (
                parent_name
                and
                parent_name
                not in selected_names
            ):

                raise ValueError(
                    f"{permission_name} requires "
                    f"{parent_name}."
                )

    # ============================================================
    # UPDATE ROLE
    # ============================================================

    @staticmethod
    def update_role_permissions(
        db: Session,
        role_id: int,
        permission_ids: list[int],
    ) -> dict:

        try:

            role = (
                db.query(
                    Role
                )
                .filter(
                    Role.id
                    == role_id
                )
                .first()
            )

            if role is None:
                raise LookupError(
                    "Role not found."
                )

            if role.name == "Boss":
                raise ValueError(
                    "Boss permissions are protected "
                    "and cannot be changed."
                )

            catalog_permissions = (
                RolePermissionService
                .get_catalog_permissions(
                    db=db
                )
            )

            catalog_by_id = {
                permission.id:
                    permission
                for permission
                in catalog_permissions
            }

            catalog_ids = set(
                catalog_by_id.keys()
            )

            requested_ids = set(
                permission_ids
            )

            invalid_ids = (
                requested_ids
                -
                catalog_ids
            )

            if invalid_ids:
                raise ValueError(
                    "One or more selected permissions "
                    "are not part of the Glisen permission catalogue."
                )

            selected_names = {
                catalog_by_id[
                    permission_id
                ].name
                for permission_id
                in requested_ids
            }

            forbidden = (
                selected_names
                &
                BOSS_ONLY_PERMISSION_NAMES
            )

            if forbidden:

                raise ValueError(
                    "Boss-only permissions cannot be "
                    "assigned to another role: "
                    +
                    ", ".join(
                        sorted(
                            forbidden
                        )
                    )
                )

            (
                RolePermissionService
                .validate_dependencies(
                    selected_names
                )
            )

            # ----------------------------------------------------
            # Remove only Glisen catalogue assignments.
            #
            # Any unknown legacy/custom permission outside this
            # catalogue remains untouched.
            # ----------------------------------------------------

            if catalog_ids:

                (
                    db.query(
                        RolePermission
                    )
                    .filter(
                        RolePermission.role_id
                        == role.id
                    )
                    .filter(
                        RolePermission.permission_id.in_(
                            catalog_ids
                        )
                    )
                    .delete(
                        synchronize_session=False
                    )
                )

            for permission_id in sorted(
                requested_ids
            ):

                db.add(
                    RolePermission(
                        role_id=role.id,
                        permission_id=(
                            permission_id
                        ),
                    )
                )

            db.commit()

            return {
                "role_id":
                    role.id,

                "role_name":
                    role.name,

                "permission_ids":
                    sorted(
                        requested_ids
                    ),

                "message":
                    "Role permissions updated successfully.",
            }

        except Exception:

            db.rollback()

            raise