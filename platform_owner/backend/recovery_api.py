"""Step 180H: independent emergency Boss recovery CASE MANAGEMENT ONLY.

This service never connects to a customer ERP, resets credentials, changes
mailbox/OTP settings, impersonates a Boss, or issues a password-reset token.
A READY_PENDING_CONNECTOR decision is administrative, NOT executed recovery.
Identity, corporate authority, consent, and target account must be revalidated
by a future separately tested, narrowly-scoped company-instance connector.
"""

import re

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import func

from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.recovery_models import (
    OwnerBossRecoveryCase, OwnerBossRecoveryEvent,
)
from platform_owner.backend.security import now_utc

REASONS = {
    "LOST_PASSWORD", "LOST_EMAIL_OR_OTP", "BOSS_UNAVAILABLE", "BOSS_REPLACEMENT",
}
ROLES = {"BOSS", "RECOVERY_CONTACT", "LEGAL_REPRESENTATIVE"}
METHODS = {"SIGNED_COMPANY_AUTHORIZATION", "INDEPENDENT_CONTACT_AND_RECORD_CHECK"}
DECISIONS = {"INSUFFICIENT_PROOF", "CONTACT_MISMATCH", "REQUEST_WITHDRAWN", "FRAUD_RISK", "OTHER"}
ACTIVE = {"OPEN", "VERIFIED", "READY_PENDING_CONNECTOR"}
# A reference identifies a record held OUTSIDE this app. NEVER store legal IDs,
# uploaded documents, passcodes, email contents, passwords, or sensitive evidence.
REFERENCE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{5,79}$")


class StartRecovery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str
    requester_role: str
    requester_email: EmailStr

    @field_validator("reason")
    @classmethod
    def valid_reason(cls, value):
        if value not in REASONS:
            raise ValueError("Unsupported recovery reason")
        return value

    @field_validator("requester_role")
    @classmethod
    def valid_role(cls, value):
        if value not in ROLES:
            raise ValueError("Unsupported requester role")
        return value


class VerifyRecovery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    method: str
    evidence_reference: str = Field(min_length=6, max_length=80)
    independent_identity_checked: bool
    legal_company_authority_checked: bool
    company_contact_checked: bool

    @field_validator("method")
    @classmethod
    def valid_method(cls, value):
        if value not in METHODS:
            raise ValueError("Unsupported verification method")
        return value

    @field_validator("evidence_reference")
    @classmethod
    def valid_reference(cls, value):
        if not REFERENCE.fullmatch(value):
            raise ValueError("Use only a nonsensitive external case reference (6–80 characters)")
        return value


class ApproveRecovery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    review_completed: bool
    understand_no_customer_account_is_changed: bool


class RejectRecovery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision_code: str

    @field_validator("decision_code")
    @classmethod
    def valid_decision(cls, value):
        if value not in DECISIONS:
            raise ValueError("Unsupported rejection reason")
        return value


def _company(db, company_id, lock=False):
    query = db.query(OwnerCompany).filter(OwnerCompany.id == company_id)
    entry = (query.with_for_update() if lock else query).first()
    if entry is None:
        raise HTTPException(404, "Company not registered")
    return entry


def _case(db, company_id, case_id, lock=False):
    query = db.query(OwnerBossRecoveryCase).filter(
        OwnerBossRecoveryCase.company_id == company_id,
        OwnerBossRecoveryCase.id == case_id,
    )
    entry = (query.with_for_update() if lock else query).first()
    if entry is None:
        raise HTTPException(404, "Recovery case not found for this company")
    return entry


def _view(case):
    return {
        "id": case.id, "company_id": case.company_id, "reason": case.reason,
        "requester_role": case.requester_role, "requester_email": case.requester_email,
        "status": case.status, "verification_method": case.verification_method,
        "evidence_reference": case.evidence_reference,
        "opened_at": case.opened_at.isoformat() + "Z",
        "verified_at": case.verified_at.isoformat() + "Z" if case.verified_at else None,
        "reviewed_at": case.reviewed_at.isoformat() + "Z" if case.reviewed_at else None,
        "decision_code": case.decision_code,
        "account_access_changed": False, "reset_token_issued": False,
        "requires_secure_instance_connector": True,
    }


def _event(db, case, company, owner_id, event_type):
    db.add(OwnerBossRecoveryEvent(
        case_id=case.id, owner_id=owner_id,
        event_type=event_type, occurred_at=now_utc(),
    ))
    db.add(OwnerCompanyEvent(
        company_id=company.id, owner_id=owner_id,
        event_type="BOSS_RECOVERY", message=f"Recovery case #{case.id}: {event_type}; no ERP account changed",
        created_at=now_utc(),
    ))


def install_recovery_routes(app, Db, Auth, Protected):
    root = "/api/owner/companies/{company_id}/boss-recovery"

    @app.get(root)
    def list_cases(company_id: int, auth: Auth, db: Db, limit: int = 20, offset: int = 0):
        _company(db, company_id)
        if not 1 <= limit <= 50 or offset < 0:
            raise HTTPException(422, "Invalid pagination")
        query = db.query(OwnerBossRecoveryCase).filter(OwnerBossRecoveryCase.company_id == company_id)
        count = query.with_entities(func.count(OwnerBossRecoveryCase.id)).scalar() or 0
        entries = query.order_by(OwnerBossRecoveryCase.id.desc()).limit(limit).offset(offset).all()
        return {"items": [_view(c) for c in entries], "total": count,
                "customer_erp_connected": False}

    @app.post(root, status_code=201)
    def open_case(company_id: int, payload: StartRecovery, protected: Protected, db: Db):
        owner, _ = protected
        company = _company(db, company_id, lock=True)
        email = str(payload.requester_email).strip().lower()
        if payload.requester_role == "BOSS" and email != company.boss_email.lower():
            raise HTTPException(422, "Boss requester must match registered Boss contact")
        if payload.requester_role == "RECOVERY_CONTACT" and (
            not company.recovery_email or email != company.recovery_email.lower()
        ):
            raise HTTPException(422, "Recovery requester must match registered recovery contact")
        existing = db.query(OwnerBossRecoveryCase).filter(
            OwnerBossRecoveryCase.company_id == company_id,
            OwnerBossRecoveryCase.status.in_(ACTIVE),
        ).first()
        if existing:
            raise HTTPException(409, "An unresolved recovery case already exists for this company")
        case = OwnerBossRecoveryCase(
            company_id=company_id, reason=payload.reason,
            requester_role=payload.requester_role, requester_email=email,
            status="OPEN", opened_at=now_utc(), opened_by_id=owner.id,
        )
        db.add(case)
        db.flush()
        _event(db, case, company, owner.id, "OPENED_UNVERIFIED")
        db.commit()
        db.refresh(case)
        return _view(case)

    @app.get(root + "/{case_id}")
    def get_case(company_id: int, case_id: int, auth: Auth, db: Db):
        _company(db, company_id)
        return _view(_case(db, company_id, case_id))

    @app.get(root + "/{case_id}/history")
    def case_history(company_id: int, case_id: int, auth: Auth, db: Db):
        _case(db, company_id, case_id)
        events = db.query(OwnerBossRecoveryEvent).filter(
            OwnerBossRecoveryEvent.case_id == case_id
        ).order_by(OwnerBossRecoveryEvent.id.asc()).limit(100).all()
        return {"items": [{"type": e.event_type, "at": e.occurred_at.isoformat() + "Z",
                           "owner_id": e.owner_id} for e in events]}

    @app.post(root + "/{case_id}/verify")
    def verify_case(company_id: int, case_id: int, payload: VerifyRecovery,
                    protected: Protected, db: Db):
        owner, _ = protected
        company = _company(db, company_id)
        case = _case(db, company_id, case_id, lock=True)
        if case.status != "OPEN":
            raise HTTPException(409, "Only an open recovery case may be verified")
        if not (payload.independent_identity_checked and payload.legal_company_authority_checked
                and payload.company_contact_checked):
            raise HTTPException(422, "All three independent verification attestations are required")
        if (case.requester_role == "LEGAL_REPRESENTATIVE" or case.reason in
                {"LOST_EMAIL_OR_OTP", "BOSS_UNAVAILABLE", "BOSS_REPLACEMENT"}) and (
                    payload.method != "SIGNED_COMPANY_AUTHORIZATION"):
            raise HTTPException(422, "Signed company authorization is required for this recovery scenario")
        case.status = "VERIFIED"
        case.verification_method = payload.method
        case.evidence_reference = payload.evidence_reference
        case.verified_at = now_utc()
        case.verified_by_id = owner.id
        _event(db, case, company, owner.id, "OWNER_RECORDED_VERIFICATION")
        db.commit()
        return _view(case)

    @app.post(root + "/{case_id}/approve")
    def approve_case(company_id: int, case_id: int, payload: ApproveRecovery,
                     protected: Protected, db: Db):
        owner, _ = protected
        company = _company(db, company_id)
        case = _case(db, company_id, case_id, lock=True)
        if case.status != "VERIFIED":
            raise HTTPException(409, "Case must be independently verified before review")
        if not payload.review_completed or not payload.understand_no_customer_account_is_changed:
            raise HTTPException(422, "Explicit owner review and non-execution acknowledgement are required")
        case.status = "READY_PENDING_CONNECTOR"
        case.reviewed_at = now_utc()
        case.reviewed_by_id = owner.id
        _event(db, case, company, owner.id, "APPROVED_FOR_FUTURE_SECURE_EXECUTION_ONLY")
        db.commit()
        return _view(case)

    @app.post(root + "/{case_id}/reject")
    def reject_case(company_id: int, case_id: int, payload: RejectRecovery,
                    protected: Protected, db: Db):
        owner, _ = protected
        company = _company(db, company_id)
        case = _case(db, company_id, case_id, lock=True)
        if case.status not in ACTIVE:
            raise HTTPException(409, "This case is already closed")
        case.status = "REJECTED"
        case.reviewed_at = now_utc()
        case.reviewed_by_id = owner.id
        case.decision_code = payload.decision_code
        _event(db, case, company, owner.id, "REJECTED_" + payload.decision_code)
        db.commit()
        return _view(case)
