from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


# ================================================================
# PASSWORD VALIDATION
# ================================================================

def validate_password_strength(
    value: str,
) -> str:

    if len(value) < 8:
        raise ValueError(
            "Password must contain at least 8 characters."
        )

    if not any(
        character.islower()
        for character in value
    ):
        raise ValueError(
            "Password must contain at least one lowercase letter."
        )

    if not any(
        character.isupper()
        for character in value
    ):
        raise ValueError(
            "Password must contain at least one uppercase letter."
        )

    if not any(
        character.isdigit()
        for character in value
    ):
        raise ValueError(
            "Password must contain at least one number."
        )

    return value


# ================================================================
# ROLE RESPONSE
# ================================================================

class RoleResponse(BaseModel):

    id: int

    name: str

    description: str | None = None

    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


# ================================================================
# CREATE USER
# ================================================================

class CreateUser(BaseModel):

    full_name: str

    username: str

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    role_id: int

    @field_validator(
        "full_name",
        "username",
        mode="before",
    )
    @classmethod
    def normalize_required_text(
        cls,
        value,
    ) -> str:

        value = (
            str(
                value
                or ""
            )
            .strip()
        )

        if not value:
            raise ValueError(
                "This field cannot be empty."
            )

        return value

    @field_validator(
        "username",
    )
    @classmethod
    def normalize_username(
        cls,
        value: str,
    ) -> str:

        value = (
            value
            .strip()
            .lower()
        )

        if " " in value:
            raise ValueError(
                "Username cannot contain spaces."
            )

        if len(value) < 3:
            raise ValueError(
                "Username must contain at least 3 characters."
            )

        return value

    @field_validator(
        "password",
    )
    @classmethod
    def validate_password(
        cls,
        value: str,
    ) -> str:

        return (
            validate_password_strength(
                value
            )
        )


# ================================================================
# UPDATE USER
# ================================================================

class UpdateUser(BaseModel):

    full_name: str

    username: str

    email: EmailStr

    role_id: int

    @field_validator(
        "full_name",
        "username",
        mode="before",
    )
    @classmethod
    def normalize_required_text(
        cls,
        value,
    ) -> str:

        value = (
            str(
                value
                or ""
            )
            .strip()
        )

        if not value:
            raise ValueError(
                "This field cannot be empty."
            )

        return value

    @field_validator(
        "username",
    )
    @classmethod
    def normalize_username(
        cls,
        value: str,
    ) -> str:

        value = (
            value
            .strip()
            .lower()
        )

        if " " in value:
            raise ValueError(
                "Username cannot contain spaces."
            )

        if len(value) < 3:
            raise ValueError(
                "Username must contain at least 3 characters."
            )

        return value


# ================================================================
# USER STATUS
# ================================================================

class UserStatusUpdate(BaseModel):

    is_active: bool


# ================================================================
# USER RESPONSE
# ================================================================

class UserResponse(BaseModel):

    id: int

    full_name: str

    username: str

    email: EmailStr

    role_id: int

    role: str

    is_active: bool

    last_login: datetime | None = None

    created_at: datetime

    created_by: int | None = None

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

    model_config = ConfigDict(
        from_attributes=True
    )