from pydantic import BaseModel


class PermissionBase(BaseModel):
    name: str
    module: str
    description: str | None = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: int

    model_config = {
        "from_attributes": True
    }