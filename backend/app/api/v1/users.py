from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.permissions import require_permission
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user_profile(
    current_user: User = Depends(require_permission("users.view")),
):
    return current_user


@router.get(
    "/protected",
)
def protected_endpoint(
    current_user: User = Depends(require_permission("users.view")),
):
    return {
        "message": "Permission granted.",
        "user": current_user.full_name,
        "role": current_user.role.name,
    }


@router.get(
    "/",
    response_model=list[UserResponse],
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users.view")),
):
    return UserRepository.get_all(db)