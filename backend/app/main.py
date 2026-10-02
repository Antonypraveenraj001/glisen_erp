from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.services.backup_service import BackupService
from app.services.backup_scheduler import (
    start_backup_scheduler,
    stop_backup_scheduler,
)

logger = setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

# ========================================
# CORS
# ========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# RESTORE MAINTENANCE GUARD
# ========================================

@app.middleware("http")
async def restore_maintenance_guard(
    request,
    call_next,
):
    if (
        BackupService.RESTORE_IN_PROGRESS
    ):
        return JSONResponse(
            status_code=503,
            content={
                "detail":
                    "Glisen ERP database restore is in progress. "
                    "Please retry after recovery completes."
            },
        )

    return await call_next(
        request
    )


# ========================================
# API ROUTES
# ========================================

app.include_router(api_router)


# ========================================
# STARTUP
# ========================================

@app.on_event("startup")
async def startup_event():
    logger.info("Glisen ERP Backend Started")



# ========================================
# AUTOMATIC BACKUP SCHEDULER
# ========================================

@app.on_event("startup")
async def backup_scheduler_startup_event():
    start_backup_scheduler()


@app.on_event("shutdown")
async def backup_scheduler_shutdown_event():
    await stop_backup_scheduler()


# ========================================
# ROOT
# ========================================

@app.get("/")
def root():
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "Running",
    }