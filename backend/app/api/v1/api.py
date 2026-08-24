from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.customers import router as customers_router
from app.api.v1.enquiries import router as enquiries_router
from app.api.v1.health import router as health_router
from app.api.v1.products import router as products_router
from app.api.v1.purchase_bill_ai import (
    router as purchase_bill_ai_router,
)
from app.api.v1.purchase_bills import (
    router as purchase_bills_router,
)
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.users import router as users_router


api_router = APIRouter(prefix="/api/v1")


api_router.include_router(auth_router)
api_router.include_router(health_router)
api_router.include_router(users_router)
api_router.include_router(customers_router)
api_router.include_router(enquiries_router)
api_router.include_router(suppliers_router)
api_router.include_router(products_router)
api_router.include_router(purchase_bills_router)
api_router.include_router(purchase_bill_ai_router)