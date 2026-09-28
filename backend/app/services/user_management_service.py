from sqlalchemy import (
    func,
)
from sqlalchemy.orm import (
    Session,
    joinedload,
)

from app.core.security import (
    hash_password,
)
from app.models.role import (
    Role,
)
from app.models.user import (
    User,
)
from app.schemas.user import (
    CreateUser,
    UpdateUser,
)


class UserManagementService:

    # ============================================================
    # HELPERS
    # ============================================================

    @staticmethod
    def get_role(
        db: Session,
        role_id: int,
    ) -> Role:

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

        if not role.is_active:
            raise ValueError(
                "The selected role is inactive."
            )

        return role


    @staticmethod
    def get_user(
        db: Session,
        user_id: int,
    ) -> User:

        user = (
            db.query(
                User
            )
            .options(
                joinedload(
                    User.role
                )
            )
            .filter(
                User.id
                == user_id
            )
            .first()
        )

        if user is None:
            raise LookupError(
                "User not found."
            )

        return user


    @staticmethod
    def get_active_boss_count(
        db: Session,
    ) -> int:

        return (
            db.query(
                func.count(
                    User.id
                )
            )
            .join(
                Role,
                User.role_id
                == Role.id,
            )
            .filter(
                Role.name
                == "Boss",

                User.is_active
                == True,
            )
            .scalar()
            or 0
        )


    @staticmethod
    def validate_unique_identity(
        db: Session,
        username: str,
        email: str,
        exclude_user_id:
            int | None = None,
    ) -> None:

        username_query = (
            db.query(
                User
            )
            .filter(
                func.lower(
                    User.username
                )
                ==
                username
                .strip()
                .lower()
            )
        )


        email_query = (
            db.query(
                User
            )
            .filter(
                func.lower(
                    User.email
                )
                ==
                email
                .strip()
                .lower()
            )
        )


        if (
            exclude_user_id
            is not None
        ):

            username_query = (
                username_query
                .filter(
                    User.id
                    != exclude_user_id
                )
            )

            email_query = (
                email_query
                .filter(
                    User.id
                    != exclude_user_id
                )
            )


        if (
            username_query
            .first()
            is not None
        ):
            raise ValueError(
                "Username is already in use."
            )


        if (
            email_query
            .first()
            is not None
        ):
            raise ValueError(
                "Email address is already in use."
            )


    @staticmethod
    def validate_actor_can_manage_role(
        actor: User,
        target_role: Role,
    ) -> None:

        actor_role = (
            actor.role.name
        )

        if (
            actor_role
            == "Admin"
            and
            target_role.name
            == "Boss"
        ):
            raise PermissionError(
                "Admin users cannot assign the Boss role."
            )


    @staticmethod
    def validate_actor_can_manage_user(
        actor: User,
        target_user: User,
    ) -> None:

        actor_role = (
            actor.role.name
        )

        target_role = (
            target_user.role.name
        )


        if (
            actor_role
            == "Admin"
            and
            target_role
            == "Boss"
        ):
            raise PermissionError(
                "Admin users cannot modify a Boss account."
            )


    # ============================================================
    # LIST
    # ============================================================

    @staticmethod
    def list_users(
        db: Session,
    ) -> list[User]:

        return (
            db.query(
                User
            )
            .options(
                joinedload(
                    User.role
                )
            )
            .order_by(
                User.is_active.desc(),
                User.full_name.asc(),
                User.id.asc(),
            )
            .all()
        )


    @staticmethod
    def list_roles(
        db: Session,
    ) -> list[Role]:

        return (
            db.query(
                Role
            )
            .filter(
                Role.is_active
                == True
            )
            .order_by(
                Role.id.asc()
            )
            .all()
        )


    # ============================================================
    # CREATE USER
    # ============================================================

    @staticmethod
    def create_user(
        db: Session,
        data: CreateUser,
        actor: User,
    ) -> User:

        try:

            role = (
                UserManagementService
                .get_role(
                    db=db,
                    role_id=(
                        data.role_id
                    ),
                )
            )


            (
                UserManagementService
                .validate_actor_can_manage_role(
                    actor=actor,
                    target_role=role,
                )
            )


            (
                UserManagementService
                .validate_unique_identity(
                    db=db,
                    username=(
                        data.username
                    ),
                    email=(
                        str(
                            data.email
                        )
                    ),
                )
            )


            user = User(
                full_name=(
                    data.full_name
                    .strip()
                ),

                username=(
                    data.username
                    .strip()
                    .lower()
                ),

                email=(
                    str(
                        data.email
                    )
                    .strip()
                    .lower()
                ),

                password_hash=(
                    hash_password(
                        data.password
                    )
                ),

                role_id=(
                    role.id
                ),

                is_active=True,

                created_by=(
                    actor.id
                ),
            )


            db.add(
                user
            )

            db.commit()

            db.refresh(
                user
            )


            return (
                UserManagementService
                .get_user(
                    db=db,
                    user_id=(
                        user.id
                    ),
                )
            )

        except Exception:

            db.rollback()

            raise


    # ============================================================
    # UPDATE USER
    # ============================================================

    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        data: UpdateUser,
        actor: User,
    ) -> User:

        try:

            user = (
                UserManagementService
                .get_user(
                    db=db,
                    user_id=user_id,
                )
            )


            (
                UserManagementService
                .validate_actor_can_manage_user(
                    actor=actor,
                    target_user=user,
                )
            )


            role = (
                UserManagementService
                .get_role(
                    db=db,
                    role_id=(
                        data.role_id
                    ),
                )
            )


            (
                UserManagementService
                .validate_actor_can_manage_role(
                    actor=actor,
                    target_role=role,
                )
            )


            # ----------------------------------------------------
            # Do not allow a user to change their own role while
            # logged in. Another Boss may change it if required.
            # ----------------------------------------------------

            if (
                actor.id
                == user.id
                and
                role.id
                != user.role_id
            ):
                raise PermissionError(
                    "You cannot change your own role."
                )


            # ----------------------------------------------------
            # Protect final active Boss
            # ----------------------------------------------------

            current_role_name = (
                user.role.name
            )


            if (
                current_role_name
                == "Boss"
                and
                role.name
                != "Boss"
                and
                user.is_active
                and
                (
                    UserManagementService
                    .get_active_boss_count(
                        db=db
                    )
                    <= 1
                )
            ):
                raise ValueError(
                    "The final active Boss account cannot be demoted."
                )


            (
                UserManagementService
                .validate_unique_identity(
                    db=db,
                    username=(
                        data.username
                    ),
                    email=(
                        str(
                            data.email
                        )
                    ),
                    exclude_user_id=(
                        user.id
                    ),
                )
            )


            user.full_name = (
                data.full_name
                .strip()
            )

            user.username = (
                data.username
                .strip()
                .lower()
            )

            user.email = (
                str(
                    data.email
                )
                .strip()
                .lower()
            )

            user.role_id = (
                role.id
            )


            db.commit()


            return (
                UserManagementService
                .get_user(
                    db=db,
                    user_id=(
                        user.id
                    ),
                )
            )

        except Exception:

            db.rollback()

            raise


    # ============================================================
    # ACTIVE / INACTIVE
    # ============================================================

    @staticmethod
    def set_user_status(
        db: Session,
        user_id: int,
        is_active: bool,
        actor: User,
    ) -> User:

        try:

            user = (
                UserManagementService
                .get_user(
                    db=db,
                    user_id=user_id,
                )
            )


            (
                UserManagementService
                .validate_actor_can_manage_user(
                    actor=actor,
                    target_user=user,
                )
            )


            if (
                actor.id
                == user.id
                and
                not is_active
            ):
                raise PermissionError(
                    "You cannot deactivate your own account."
                )


            if (
                user.role.name
                == "Boss"
                and
                user.is_active
                and
                not is_active
                and
                (
                    UserManagementService
                    .get_active_boss_count(
                        db=db
                    )
                    <= 1
                )
            ):
                raise ValueError(
                    "The final active Boss account cannot be deactivated."
                )


            user.is_active = (
                is_active
            )


            db.commit()


            return (
                UserManagementService
                .get_user(
                    db=db,
                    user_id=(
                        user.id
                    ),
                )
            )

        except Exception:

            db.rollback()

            raise