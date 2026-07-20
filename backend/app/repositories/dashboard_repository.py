from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User


class DashboardRepository:

    @staticmethod
    def get_summary(db: Session):

        total_users = db.query(func.count(User.id)).scalar()

        active_users = (
            db.query(func.count(User.id))
            .filter(User.is_active == True)
            .scalar()
        )

        inactive_users = (
            db.query(func.count(User.id))
            .filter(User.is_active == False)
            .scalar()
        )

        total_roles = db.query(func.count(Role.id)).scalar()

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "total_roles": total_roles,
        }