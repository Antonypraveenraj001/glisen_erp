from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from app.schemas.user import (
    validate_password_strength,
)


class ChangePasswordRequest(
    BaseModel
):

    current_password: str

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


    @field_validator(
        "new_password",
    )
    @classmethod
    def validate_new_password(
        cls,
        value: str,
    ) -> str:

        return (
            validate_password_strength(
                value
            )
        )


class ResetPasswordRequest(
    BaseModel
):

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


    @field_validator(
        "new_password",
    )
    @classmethod
    def validate_new_password(
        cls,
        value: str,
    ) -> str:

        return (
            validate_password_strength(
                value
            )
        )


class PasswordActionResponse(
    BaseModel
):

    message: str