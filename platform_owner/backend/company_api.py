"""Step 180J: company *registry*, not customer provisioning or ERP access.

No imported company ERP modules, DB credentials, network clients, or shell calls.
No activation/suspension may pretend to affect ERP access: fail closed until
Step 180L establishes and tests enforceable, per-instance licensing.
"""

import re

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.security import now_utc


_RESERVED = {
    "admin", "api", "assets", "auth", "castle", "erp", "login",
    "mail", "owner", "platform", "root", "static", "support", "www",
}
_GSTIN = re.compile(r"^[0-9]{2}[A-Z0-9]{10}[1-9A-Z]Z[0-9A-Z]$")
_SLUG = re.compile(r"^[a-z][a-z0-9-]{2,39}$")


class CompanyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(min_length=3, max_length=40)
    legal_name: str = Field(min_length=3, max_length=200)
    gstin: str | None = Field(default=None, max_length=15)
    boss_email: EmailStr
    recovery_email: EmailStr | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        value = value.strip().lower()
        if not _SLUG.fullmatch(value) or "--" in value or value.endswith("-") or value in _RESERVED:
            raise ValueError("Company code: 3-40 characters, lowercase letters, digits or single hyphens; must start with a letter and not use a reserved name")
        return value

    @field_validator("legal_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 3 or any(ord(c) < 32 for c in value):
            raise ValueError("Company legal name is invalid")
        return value

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, value: str | None) -> str | None:
        value = (value or "").strip().upper()
        if value and not _GSTIN.fullmatch(value):
            raise ValueError("GSTIN must use the 15-character Indian GSTIN format")
        return value or None

    @field_validator("boss_email", "recovery_email")
    @classmethod
    def normalized_email(cls, value: str | None) -> str | None:
        return str(value).strip().lower() if value is not None else None


class CompanyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    legal_name: str = Field(min_length=3, max_length=200)
    gstin: str | None = Field(default=None, max_length=15)
    boss_email: EmailStr
    recovery_email: EmailStr | None = None

    _validate_name = field_validator("legal_name")(CompanyCreate.validate_name.__func__)
    _validate_gstin = field_validator("gstin")(CompanyCreate.validate_gstin.__func__)
    _normalize_email = field_validator("boss_email", "recovery_email")(CompanyCreate.normalized_email.__func__)


def _view(company: OwnerCompany) -> dict:
    return {
        "id": company.id,
        "slug": company.slug,
        "legal_name": company.legal_name,
        "gstin": company.gstin,
        "boss_email": company.boss_email,
        "recovery_email": company.recovery_email,
        "status": company.status,
        "created_at": company.created_at.isoformat() + "Z",
        "updated_at": company.updated_at.isoformat() + "Z",
        "operational_access_enforced": False,
    }


def _event(db, company: OwnerCompany, owner_id: int, event_type: str, message: str):
    db.add(OwnerCompanyEvent(
        company_id=company.id,
        owner_id=owner_id,
        event_type=event_type,
        message=message,
        created_at=now_utc(),
    ))


def _company_or_404(db, company_id: int) -> OwnerCompany:
    company = db.get(OwnerCompany, company_id)
    if company is None:
        raise HTTPException(404, "Company record not found")
    return company


def install_company_routes(app, Db, Auth, Protected):
    @app.get("/api/owner/companies")
    def list_companies(auth: Auth, db: Db, offset: int = 0, limit: int = 20):
        if offset < 0 or not 1 <= limit <= 100:
            raise HTTPException(422, "Invalid pagination")
        total = db.query(func.count(OwnerCompany.id)).scalar() or 0
        entries = (
            db.query(OwnerCompany)
            .order_by(OwnerCompany.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return {"items": [_view(c) for c in entries], "total": total, "offset": offset, "limit": limit}

    @app.get("/api/owner/companies/{company_id}")
    def get_company(company_id: int, auth: Auth, db: Db):
        return _view(_company_or_404(db, company_id))

    @app.post("/api/owner/companies", status_code=201)
    def create_company(payload: CompanyCreate, protected: Protected, db: Db):
        owner, _session = protected
        when = now_utc()
        company = OwnerCompany(
            slug=payload.slug,
            legal_name=payload.legal_name,
            gstin=payload.gstin,
            boss_email=str(payload.boss_email),
            recovery_email=str(payload.recovery_email) if payload.recovery_email else None,
            status="PENDING_SETUP", created_at=when, updated_at=when,
            created_by_id=owner.id,
        )
        try:
            db.add(company)
            db.flush()
            _event(db, company, owner.id, "REGISTERED", "Company registration created; ERP not provisioned")
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "Company code or GSTIN already registered") from exc
        db.refresh(company)
        return _view(company)

    @app.put("/api/owner/companies/{company_id}")
    def update_company(company_id: int, payload: CompanyUpdate, protected: Protected, db: Db):
        owner, _session = protected
        company = _company_or_404(db, company_id)
        if company.status not in {"PENDING_SETUP", "ON_HOLD"}:
            raise HTTPException(409, "Company identity changes require a verified recovery procedure")
        company.legal_name = payload.legal_name
        company.gstin = payload.gstin
        company.boss_email = str(payload.boss_email)
        company.recovery_email = str(payload.recovery_email) if payload.recovery_email else None
        company.updated_at = now_utc()
        _event(db, company, owner.id, "PROFILE_UPDATED", "Company registration details edited")
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "GSTIN already registered") from exc
        db.refresh(company)
        return _view(company)

    @app.post("/api/owner/companies/{company_id}/hold")
    def hold_company(company_id: int, protected: Protected, db: Db):
        owner, _session = protected
        company = _company_or_404(db, company_id)
        if company.status != "PENDING_SETUP":
            raise HTTPException(409, "Only pending company onboarding can be placed on hold")
        company.status = "ON_HOLD"
        company.updated_at = now_utc()
        _event(db, company, owner.id, "ONBOARDING_HELD", "Company onboarding placed on hold; no ERP access affected")
        db.commit()
        db.refresh(company)
        return _view(company)

    @app.post("/api/owner/companies/{company_id}/resume")
    def resume_company(company_id: int, protected: Protected, db: Db):
        owner, _session = protected
        company = _company_or_404(db, company_id)
        if company.status != "ON_HOLD":
            raise HTTPException(409, "Only on-hold company onboarding can be resumed")
        company.status = "PENDING_SETUP"
        company.updated_at = now_utc()
        _event(db, company, owner.id, "ONBOARDING_RESUMED", "Company onboarding resumed; no ERP access affected")
        db.commit()
        db.refresh(company)
        return _view(company)

    @app.post("/api/owner/companies/{company_id}/activate")
    def blocked_activation(company_id: int, protected: Protected, db: Db):
        _company_or_404(db, company_id)
        raise HTTPException(
            409,
            "Activation blocked until dedicated ERP provisioning, license verification and server-side enforcement are integrated and tested",
        )

    @app.post("/api/owner/companies/{company_id}/suspend")
    def blocked_suspension(company_id: int, protected: Protected, db: Db):
        _company_or_404(db, company_id)
        raise HTTPException(
            409,
            "ERP suspension blocked until reliable per-instance access enforcement is integrated and tested",
        )

    @app.get("/api/owner/companies/{company_id}/history")
    def company_history(company_id: int, auth: Auth, db: Db):
        _company_or_404(db, company_id)
        events = (
            db.query(OwnerCompanyEvent)
            .filter(OwnerCompanyEvent.company_id == company_id)
            .order_by(OwnerCompanyEvent.id.desc())
            .limit(50)
            .all()
        )
        return {"items": [{
            "id": event.id, "event_type": event.event_type,
            "message": event.message,
            "created_at": event.created_at.isoformat() + "Z",
        } for event in events]}
