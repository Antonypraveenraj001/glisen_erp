from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_roles: int

    class Config:
        from_attributes = True