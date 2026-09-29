from pydantic import (
    BaseModel,
    Field,
)


class PermissionMatrixItem(BaseModel):

    id: int

    name: str

    module: str

    label: str

    description: str | None = None

    depends_on: str | None = None

    boss_only: bool = False


class PermissionMatrixRole(BaseModel):

    id: int

    name: str

    description: str | None = None

    is_active: bool

    protected: bool = False


class RolePermissionAssignment(BaseModel):

    role_id: int

    permission_ids: list[int]


class RolePermissionMatrixResponse(BaseModel):

    roles: list[
        PermissionMatrixRole
    ]

    permissions: list[
        PermissionMatrixItem
    ]

    assignments: list[
        RolePermissionAssignment
    ]


class UpdateRolePermissionsRequest(BaseModel):

    permission_ids: list[int] = Field(
        default_factory=list
    )


class UpdateRolePermissionsResponse(BaseModel):

    role_id: int

    role_name: str

    permission_ids: list[int]

    message: str