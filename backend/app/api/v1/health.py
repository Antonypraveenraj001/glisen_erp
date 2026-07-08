from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/db")
def database_health():
    return {
        "database": "connected"
    }