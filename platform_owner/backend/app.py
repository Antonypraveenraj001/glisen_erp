"""CASTLE owner API. Independent service, database, and browser origin."""


from datetime import timedelta
from pathlib import Path
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette.middleware.trustedhost import TrustedHostMiddleware

from platform_owner.backend.database import make_owner_engine, make_session_factory
from platform_owner.backend.dashboard_api import install_dashboard_routes
from platform_owner.backend.company_api import install_company_routes
from platform_owner.backend.audit_api import install_audit_routes
from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent  # owner-only metadata
from platform_owner.backend.license_api import install_license_routes
from platform_owner.backend.license_models import OwnerLicensePlan, OwnerLicenseTerm  # owner-only metadata
from platform_owner.backend.recovery_api import install_recovery_routes
from platform_owner.backend.recovery_models import OwnerBossRecoveryCase, OwnerBossRecoveryEvent  # owner-only metadata
from platform_owner.backend.models import OwnerAccount, OwnerLoginThrottle, OwnerSession
from platform_owner.backend.security import (
    digest, hash_password, new_secret, now_utc, verify_password,
)
from platform_owner.backend.settings import OwnerSettings, load_settings

STATIC = Path(__file__).resolve().parent / "static"


class LoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=1, max_length=256)


def create_app(
    settings: OwnerSettings | None = None,
    *,
    session_factory=None,
) -> FastAPI:
    settings = settings or load_settings()
    settings.validate()
    app = FastAPI(title="CASTLE Platform Owner", docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[settings.allowed_host])
    app.state.owner_settings = settings
    if session_factory is None:
        engine = make_owner_engine(settings)
        session_factory = make_session_factory(engine)
    app.state.owner_sessions = session_factory

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; script-src 'self'; style-src 'self'; "
            "connect-src 'self'; img-src 'self'; base-uri 'none'; "
            "form-action 'self'; frame-ancestors 'none'"
        )
        if settings.secure_cookies:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    def db_session():
        db = app.state.owner_sessions()
        try:
            yield db
        finally:
            db.close()

    Db = Annotated[Session, Depends(db_session)]

    def require_origin(request: Request):
        # Browser mutating requests MUST prove same origin, including login.
        if request.headers.get("origin") != settings.origin:
            raise HTTPException(403, "Same-origin request required")

    def current_session(request: Request, db: Db) -> tuple[OwnerAccount, OwnerSession]:
        raw = request.cookies.get(settings.session_cookie)
        if not raw:
            raise HTTPException(401, "Authentication required")
        record = (
            db.query(OwnerSession)
            .filter(OwnerSession.token_hash == digest(raw), OwnerSession.expires_at > now_utc())
            .first()
        )
        if record is None:
            raise HTTPException(401, "Invalid or expired session")
        user = db.query(OwnerAccount).filter(OwnerAccount.id == record.owner_id).first()
        if user is None or user.email != settings.owner_email:
            raise HTTPException(401, "Unauthorized owner session")
        return user, record

    Auth = Annotated[tuple[OwnerAccount, OwnerSession], Depends(current_session)]

    def require_csrf(request: Request, auth: Auth) -> tuple[OwnerAccount, OwnerSession]:
        require_origin(request)
        _user, record = auth
        header = request.headers.get("x-csrf-token") or ""
        cookie = request.cookies.get(settings.csrf_cookie) or ""
        if (
            len(header) < 32 or len(cookie) < 32
            or not secrets.compare_digest(header, cookie)
            or not secrets.compare_digest(digest(header), record.csrf_hash)
        ):
            raise HTTPException(403, "Invalid CSRF token")
        return auth

    Protected = Annotated[tuple[OwnerAccount, OwnerSession], Depends(require_csrf)]

    def write_cookies(response: Response, session: str, csrf: str):
        options = dict(
            max_age=settings.session_minutes * 60,
            secure=settings.secure_cookies,
            samesite="strict",
            path="/",
        )
        response.set_cookie(settings.session_cookie, session, httponly=True, **options)
        response.set_cookie(settings.csrf_cookie, csrf, httponly=False, **options)

    def clear_cookies(response: Response):
        response.delete_cookie(settings.session_cookie, path="/", secure=settings.secure_cookies, httponly=True, samesite="strict")
        response.delete_cookie(settings.csrf_cookie, path="/", secure=settings.secure_cookies, samesite="strict")

    @app.get("/")
    def page():
        return FileResponse(STATIC / "index.html", media_type="text/html")

    @app.get("/app.css")
    def styles():
        return FileResponse(STATIC / "app.css", media_type="text/css")

    @app.get("/app.js")
    def script():
        return FileResponse(STATIC / "app.js", media_type="application/javascript")

    @app.get("/api/owner/health")
    def health():
        return {"status": "running", "service": "castle-platform-owner"}

    @app.post("/api/owner/auth/login")
    def login(payload: LoginPayload, request: Request, response: Response, db: Db):
        require_origin(request)
        email = payload.email.strip().lower()
        if len(email) > 254:
            raise HTTPException(401, "Invalid credentials")
        ip = request.client.host if request.client else "unknown"
        throttle_key = digest(f"{ip}|{email}")
        throttle = db.get(OwnerLoginThrottle, throttle_key)
        now = now_utc()
        if throttle is not None and throttle.locked_until and throttle.locked_until > now:
            raise HTTPException(429, "Too many attempts; try again later")
        owner = db.query(OwnerAccount).filter(OwnerAccount.email == email).first()
        # Every rejected login uses the same generic response.
        if owner is None or email != settings.owner_email or not verify_password(payload.password, owner.password_hash):
            if throttle is None:
                throttle = OwnerLoginThrottle(key_hash=throttle_key, attempts=0, updated_at=now)
                db.add(throttle)
            throttle.attempts += 1
            throttle.updated_at = now
            if throttle.attempts >= 5:
                throttle.locked_until = now + timedelta(minutes=15)
            db.commit()
            raise HTTPException(401, "Invalid credentials")
        if throttle is not None:
            db.delete(throttle)
        # No preexisting client-supplied session is reused: avoids session fixation.
        token = new_secret()
        csrf = new_secret()
        db.add(OwnerSession(
            owner_id=owner.id,
            token_hash=digest(token),
            csrf_hash=digest(csrf),
            created_at=now,
            expires_at=now + timedelta(minutes=settings.session_minutes),
        ))
        db.commit()
        write_cookies(response, token, csrf)
        return {"authenticated": True, "email": owner.email}

    @app.get("/api/owner/auth/me")
    def me(auth: Auth):
        user, record = auth
        return {"authenticated": True, "email": user.email, "expires_at": record.expires_at.isoformat() + "Z"}

    @app.post("/api/owner/auth/logout")
    def logout(response: Response, auth: Protected, db: Db):
        _user, record = auth
        db.delete(record)
        db.commit()
        clear_cookies(response)
        return {"authenticated": False}

    @app.post("/api/owner/auth/change-password")
    def change_password(payload: ChangePasswordPayload, response: Response, auth: Protected, db: Db):
        owner, _record = auth
        if not verify_password(payload.current_password, owner.password_hash):
            raise HTTPException(401, "Current password is incorrect")
        try:
            updated = hash_password(payload.new_password)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        if verify_password(payload.new_password, owner.password_hash):
            raise HTTPException(422, "New password must differ from old password")
        owner.password_hash = updated
        owner.password_changed_at = now_utc()
        db.query(OwnerSession).filter(OwnerSession.owner_id == owner.id).delete(synchronize_session=False)
        db.commit()
        clear_cookies(response)
        return {"authenticated": False, "message": "Password changed; sign in again"}

    install_dashboard_routes(app, Db, Auth)
    install_audit_routes(app, Db, Auth)
    install_company_routes(app, Db, Auth, Protected)
    install_license_routes(app, Db, Auth, Protected)
    install_recovery_routes(app, Db, Auth, Protected)
    return app
