from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
)
from app.models.user import (
    User,
)
from app.services.user_management_service import (
    UserManagementService,
)


class SecurityService:

    # ============================================================
    # CHANGE OWN PASSWORD
    # ============================================================

    @staticmethod
    def change_own_password(
        db: Session,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:

        try:

            if not verify_password(
                current_password,
                user.password_hash,
            ):
                raise ValueError(
                    "Current password is incorrect."
                )


            if verify_password(
                new_password,
                user.password_hash,
            ):
                raise ValueError(
                    "New password must be different from the current password."
                )


            user.password_hash = (
                hash_password(
                    new_password
                )
            )


            db.commit()

        except Exception:

            db.rollback()

            raise


    # ============================================================
    # RESET ANOTHER USER PASSWORD
    # ============================================================

    @staticmethod
    def reset_user_password(
        db: Session,
        target_user_id: int,
        new_password: str,
        actor: User,
    ) -> None:

        try:

            target_user = (
                UserManagementService
                .get_user(
                    db=db,
                    user_id=(
                        target_user_id
                    ),
                )
            )


            if (
                target_user.id
                == actor.id
            ):
                raise PermissionError(
                    "Use Change My Password to update your own password."
                )


            (
                UserManagementService
                .validate_actor_can_manage_user(
                    actor=actor,
                    target_user=(
                        target_user
                    ),
                )
            )


            target_user.password_hash = (
                hash_password(
                    new_password
                )
            )


            db.commit()

        except Exception:

            db.rollback()

            raise