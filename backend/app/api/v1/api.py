from fastapi import APIRouter

from app.api.v1.auth import (
    router as auth_router,
)
from app.api.v1.company_settings import (
    router as company_settings_router,
)
from app.api.v1.customers import (
    router as customers_router,
)
from app.api.v1.dashboard import (
    router as dashboard_router,
)
from app.api.v1.direct_stock_issues import (
    router as direct_stock_issues_router,
)
from app.api.v1.enquiries import (
    router as enquiries_router,
)
from app.api.v1.expenses import (
    router as expenses_router,
)
from app.api.v1.final_bills import (
    router as final_bills_router,
)
from app.api.v1.financial_analyzer import (
    router as financial_analyzer_router,
)
from app.api.v1.finished_goods_receipts import (
    router as finished_goods_receipts_router,
)
from app.api.v1.finished_products import (
    router as finished_products_router,
)
from app.api.v1.gst_report import (
    router as gst_report_router,
)
from app.api.v1.health import (
    router as health_router,
)
from app.api.v1.products import (
    router as products_router,
)
from app.api.v1.production import (
    router as production_router,
)
from app.api.v1.proformas import (
    router as proformas_router,
)
from app.api.v1.purchase_bill_ai import (
    router as purchase_bill_ai_router,
)
from app.api.v1.purchase_bills import (
    router as purchase_bills_router,
)
from app.api.v1.shop_floor_issues import (
    router as shop_floor_issues_router,
)
from app.api.v1.stock_report import (
    router as stock_report_router,
)
from app.api.v1.suppliers import (
    router as suppliers_router,
)
from app.api.v1.users import (
    router as users_router,
)


api_router = APIRouter(
    prefix="/api/v1"
)


# ================================================================
# AUTH / CORE
# ================================================================

api_router.include_router(
    auth_router
)

api_router.include_router(
    health_router
)

api_router.include_router(
    dashboard_router
)

api_router.include_router(
    users_router
)

api_router.include_router(
    company_settings_router
)


# ================================================================
# CUSTOMER / SALES WORKFLOW
# ================================================================

api_router.include_router(
    customers_router
)

api_router.include_router(
    enquiries_router
)

api_router.include_router(
    proformas_router
)


# ================================================================
# SUPPLIER / PURCHASE
# ================================================================

api_router.include_router(
    suppliers_router
)

api_router.include_router(
    purchase_bills_router
)

api_router.include_router(
    purchase_bill_ai_router
)


# ================================================================
# PRODUCTS / STOCK
# ================================================================

api_router.include_router(
    products_router
)

api_router.include_router(
    stock_report_router
)

api_router.include_router(
    shop_floor_issues_router
)

api_router.include_router(
    direct_stock_issues_router
)


# ================================================================
# PRODUCTION
# ================================================================

api_router.include_router(
    production_router
)

api_router.include_router(
    finished_goods_receipts_router
)

api_router.include_router(
    finished_products_router
)


# ================================================================
# BILLING / REPORTING
# ================================================================

api_router.include_router(
    final_bills_router
)

api_router.include_router(
    gst_report_router
)

api_router.include_router(
    expenses_router
)

api_router.include_router(
    financial_analyzer_router
)