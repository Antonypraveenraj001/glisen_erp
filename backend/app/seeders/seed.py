from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User


def seed_database(db: Session):
    roles = [
        "Boss",
        "Admin",
        "Purchase",
        "Sales",
        "Accounts",
        "Production",
        "Store",
    ]

    for role_name in roles:
        role = db.query(Role).filter(Role.name == role_name).first()

        if not role:
            db.add(
                Role(
                    name=role_name,
                    description=f"{role_name} Role",
                )
            )

    db.commit()

    admin_role = (
        db.query(Role)
        .filter(Role.name == "Boss")
        .first()
    )

    admin = (
        db.query(User)
        .filter(User.email == "admin@glisen.com")
        .first()
    )

    if not admin:
        db.add(
            User(
                full_name="System Administrator",
                username="admin",
                email="admin@glisen.com",
                password_hash=hash_password("Admin@123"),
                role_id=admin_role.id,
                is_active=True,
            )
        )

        db.commit()

    print("Database seeded successfully.")