from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository


class UserService:

    @staticmethod
    def create_user(
        db: Session,
        full_name: str,
        username: str,
        email: str,
        password: str,
        role_id: int,
    ):

        if UserRepository.get_by_email(db, email):
            raise ValueError("Email already exists")

        if UserRepository.get_by_username(db, username):
            raise ValueError("Username already exists")

        user = User(
            full_name=full_name,
            username=username,
            email=email,
            password_hash=hash_password(password),
            role_id=role_id,
            is_active=True,
        )

        return UserRepository.create(db, user)