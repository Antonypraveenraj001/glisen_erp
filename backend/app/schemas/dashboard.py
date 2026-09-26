from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.purchase_bill_payment import (
    PurchaseBillUnpaidAgingResponse,
)


# ================================================================
# LIVE PRODUCTION
# ================================================================

class DashboardLiveProductionItem(BaseModel):

    production_order_id: int

    production_number: str

    proforma_id: int

    proforma_number: str

    company_name: str

    # ------------------------------------------------------------
    # OPTIONAL LEGACY PRODUCT MASTER LINK
    #
    # New manufactured output does not need to exist in the
    # purchased Product / Stock master.
    # ------------------------------------------------------------

    product_id: int | None = None

    product_code: str | None = None

    # ------------------------------------------------------------
    # MANUFACTURED PRODUCT SOURCE OF TRUTH
    # ------------------------------------------------------------

    product_name: str

    quantity: int

    status: str

    planned_start_date: date | None = None

    actual_start_date: date | None = None

    actual_end_date: date | None = None

    current_operation: str | None = None

    machine_name: str | None = None

    operation_status: str | None = None


# ================================================================
# QUARTER PERFORMANCE
# ================================================================

class DashboardQuarterPerformance(BaseModel):

    label: str

    start_date: date

    end_date: date

    net_sales: Decimal

    production_cost: Decimal

    company_expenses: Decimal

    net_profit: Decimal


# ================================================================
# MONTHLY SALES
# ================================================================

class DashboardMonthlySalesItem(BaseModel):

    month_key: str

    month_label: str

    start_date: date

    end_date: date

    net_sales: Decimal

    is_future: bool


# ================================================================
# DASHBOARD SUMMARY
# ================================================================

class DashboardSummary(BaseModel):

    # ------------------------------------------------------------
    # DASHBOARD TIME
    # ------------------------------------------------------------

    as_of: datetime

    # ------------------------------------------------------------
    # CURRENT FINANCIAL YEAR
    # ------------------------------------------------------------

    financial_year_label: str

    financial_year_start: date

    financial_year_end: date

    # ------------------------------------------------------------
    # BOSS-ONLY KPI
    #
    # Open means:
    #
    # New
    # Contacted
    # Quotation
    #
    # None for non-Boss users.
    # ------------------------------------------------------------

    open_enquiries: int | None = None

    # ------------------------------------------------------------
    # BOSS-ONLY FINANCIAL KPI
    # ------------------------------------------------------------

    current_fy_net_profit: Decimal | None = None

    # ------------------------------------------------------------
    # LIVE PRODUCTION
    # ------------------------------------------------------------

    live_production: list[
        DashboardLiveProductionItem
    ]

    # ------------------------------------------------------------
    # BOSS-ONLY QUARTER FINANCIAL PERFORMANCE
    # ------------------------------------------------------------

    current_quarter: (
        DashboardQuarterPerformance
        | None
    ) = None

    previous_quarter: (
        DashboardQuarterPerformance
        | None
    ) = None

    # ------------------------------------------------------------
    # BOSS-ONLY FY MONTHLY SALES
    # ------------------------------------------------------------

    monthly_sales: list[
        DashboardMonthlySalesItem
    ]

    # ------------------------------------------------------------
    # PURCHASE BILL PAYMENT WATCH
    #
    # Boss / Accounts / Purchase.
    # ------------------------------------------------------------

    unpaid_purchase_bills: list[
        PurchaseBillUnpaidAgingResponse
    ]