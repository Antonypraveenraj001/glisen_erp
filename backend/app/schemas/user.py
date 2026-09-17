from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    field_validator,
)


class CreateUser(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str
    role_id: int


class UserResponse(BaseModel):
    id: int

    full_name: str
    username: str
    email: EmailStr

    role_id: int

    # ------------------------------------------------------------
    # ROLE NAME
    #
    # Frontend expects:
    #
    # user.role === "Boss"
    #
    # SQLAlchemy gives us the Role relationship object,
    # so the validator converts it to the role name.
    # ------------------------------------------------------------

    role: str

    is_active: bool
    created_at: datetime

    @field_validator(
        "role",
        mode="before",
    )
    @classmethod
    def extract_role_name(
        cls,
        value,
    ) -> str:

        if isinstance(
            value,
            str,
        ):
            return value

        if value is None:
            return ""

        return getattr(
            value,
            "name",
            str(value),
        )

    class Config:
        from_attributes = True