from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FinancialYearResponse(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    status: str
    opened_at: datetime
    opened_by: int | None
    closed_at: datetime | None
    closed_by: int | None
    notes: str | None

    model_config = ConfigDict(
        from_attributes=True
    )


class FinancialYearTransitionHistoryItem(BaseModel):
    id: int
    from_financial_year: str
    to_financial_year: str | None
    backup_filename: str | None
    status: str
    started_at: datetime
    completed_at: datetime | None
    error_message: str | None


class FinancialYearValidationResponse(BaseModel):
    current_financial_year: FinancialYearResponse
    today: date
    transition_available_from: date

    next_financial_year_name: str
    next_financial_year_start_date: date
    next_financial_year_end_date: date

    calendar_ready: bool
    backup_infrastructure_ready: bool
    latest_verified_backup_at: datetime | None

    fy_final_backup_verified: bool
    fy_final_backup_filename: str | None
    fy_final_backup_verified_at: datetime | None

    stock_items_to_carry: int
    total_stock_quantity: float
    live_production_orders: int

    current_fy_purchase_bills: int
    current_fy_issued_invoices: int

    conflicting_active_financial_years: int

    blockers: list[str]
    carry_forward_notes: list[str]

    required_confirmation: str
    can_start_transition: bool


class FinancialYearOverviewResponse(BaseModel):
    validation: FinancialYearValidationResponse
    history: list[FinancialYearResponse]
    transition_history: list[
        FinancialYearTransitionHistoryItem
    ]


class FinancialYearTransitionRequest(BaseModel):
    confirmation: str


class FinancialYearTransitionResponse(BaseModel):
    success: bool
    message: str

    transition_log_id: int

    from_financial_year: FinancialYearResponse
    to_financial_year: FinancialYearResponse

    backup_filename: str

    opening_stock_items: int
    opening_stock_value: float

    opening_wip_orders: int
    opening_wip_value: float
