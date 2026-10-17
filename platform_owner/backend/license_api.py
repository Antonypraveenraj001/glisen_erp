"""Step 180L: owner-only manual subscription ledger, no live ERP access.

All business periods are India-local calendar dates, start inclusive / end
exclusive. Monthly = one calendar month, annual = 12 calendar months.
Annual grace = the seven days starting at the exclusive expiry date.
There is NO monthly grace or overdue-credit pathway. No background jobs needed.
"""

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
import re
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError

from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.license_models import OwnerLicensePlan, OwnerLicenseTerm
from platform_owner.backend.security import now_utc

INDIA = ZoneInfo("Asia/Kolkata")
_REF = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$")


def business_today() -> date:
    return datetime.now(INDIA).date()


def advance_months(day: date, months: int) -> date:
    year = day.year + (day.month - 1 + months) // 12
    month = (day.month - 1 + months) % 12 + 1
    if not 1 <= year <= 9999:
        raise ValueError("Subscription expiry out of supported range")
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day.day, last_day))


class PlanPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan: str
    price_inr: Decimal = Field(gt=Decimal("0"), le=Decimal("999999999.99"))

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: str) -> str:
        if value not in {"MONTHLY", "ANNUAL"}:
            raise ValueError("Plan must be MONTHLY or ANNUAL")
        return value

    @field_validator("price_inr")
    @classmethod
    def validate_price(cls, value: Decimal) -> Decimal:
        if not value.is_finite() or value.as_tuple().exponent < -2:
            raise ValueError("Price must be a finite amount in INR with at most two decimal places")
        return value


class ConfirmPaymentPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payment_reference: str = Field(min_length=3, max_length=100)
    advance_received: bool

    @field_validator("payment_reference")
    @classmethod
    def validate_reference(cls, value: str) -> str:
        if not _REF.fullmatch(value):
            raise ValueError("Payment reference: 3-100 letters/digits with . _ : / - allowed")
        return value


def _company_locked(db, company_id: int) -> OwnerCompany:
    # Lock registry row to serialize payment confirmations for each company on MySQL.
    company = db.query(OwnerCompany).filter(OwnerCompany.id == company_id).with_for_update().first()
    if company is None:
        raise HTTPException(404, "Company not registered")
    return company


def _company_exists(db, company_id: int):
    if db.get(OwnerCompany, company_id) is None:
        raise HTTPException(404, "Company not registered")


def _terms(db, company_id: int):
    return (db.query(OwnerLicenseTerm)
        .filter(OwnerLicenseTerm.company_id == company_id)
        .order_by(OwnerLicenseTerm.start_on.asc(), OwnerLicenseTerm.id.asc()).all())


def subscription_status(terms: list[OwnerLicenseTerm], today: date) -> str:
    if not terms:
        return "AWAITING_ADVANCE"
    if any(t.start_on <= today < t.expires_on for t in terms):
        return "PAID_CURRENT"
    if any(t.start_on > today for t in terms):
        return "SCHEDULED"
    latest = max(terms, key=lambda t: (t.expires_on, t.id))
    if latest.plan == "ANNUAL" and latest.expires_on <= today < latest.expires_on + timedelta(days=7):
        return "ANNUAL_GRACE"
    return "CANCELLED"


def _term_view(t: OwnerLicenseTerm):
    return dict(
        id=t.id, plan=t.plan, amount_received_inr=str(t.amount_received_inr),
        payment_reference=t.payment_reference,
        start_on=t.start_on.isoformat(), expires_on=t.expires_on.isoformat(),
        confirmed_at=t.confirmed_at.isoformat() + "Z", confirmed_by_id=t.confirmed_by_id,
    )


def _view(db, company: OwnerCompany) -> dict:
    plan = db.query(OwnerLicensePlan).filter(OwnerLicensePlan.company_id == company.id).first()
    terms = _terms(db, company.id)
    today = business_today()
    status = subscription_status(terms, today) if plan else "NOT_CONFIGURED"
    latest = terms[-1] if terms else None
    cancellation_date = None
    recovery_deadline = None
    if latest and status == "CANCELLED":
        cancellation_date = latest.expires_on + (timedelta(days=7) if latest.plan == "ANNUAL" else timedelta())
        recovery_deadline = cancellation_date + timedelta(days=90)
    return {
        "company_id": company.id, "company_slug": company.slug,
        "company_status": company.status,
        "plan": plan.plan if plan else None,
        "price_inr": str(plan.price_inr) if plan else None,
        "subscription_status": status,
        "last_paid_term": _term_view(latest) if latest else None,
        "next_expiry_on": max(t.expires_on for t in terms).isoformat() if terms else None,
        "annual_grace_ends_on": (
            (latest.expires_on + timedelta(days=7)).isoformat()
            if latest and latest.plan == "ANNUAL" and
            status in {"ANNUAL_GRACE", "CANCELLED"} else None
        ),
        "checked_on_ist": today.isoformat(),
        "cancellation_effective_on": cancellation_date.isoformat() if cancellation_date else None,
        "data_recovery_deadline_on": recovery_deadline.isoformat() if recovery_deadline else None,
        "data_retention_automation_enabled": False,
        "erp_access_enforced": False,
        "erp_deployment_status": "NOT_PROVISIONED",
    }


def install_license_routes(app, Db, Auth, Protected):
    @app.get("/api/owner/companies/{company_id}/license")
    def get_license(company_id: int, auth: Auth, db: Db):
        _company_exists(db, company_id)
        return _view(db, db.get(OwnerCompany, company_id))

    @app.put("/api/owner/companies/{company_id}/license/plan")
    def configure_plan(company_id: int, payload: PlanPayload, protected: Protected, db: Db):
        owner, _ = protected
        company = _company_locked(db, company_id)
        if company.status == "ON_HOLD":
            raise HTTPException(409, "Resume onboarding before changing subscription plans")
        plan = db.query(OwnerLicensePlan).filter(OwnerLicensePlan.company_id == company_id).first()
        if plan is None:
            plan = OwnerLicensePlan(company_id=company.id, plan=payload.plan,
                price_inr=payload.price_inr, updated_at=now_utc(), updated_by_id=owner.id)
            db.add(plan)
        else:
            plan.plan = payload.plan
            plan.price_inr = payload.price_inr
            plan.updated_at = now_utc()
            plan.updated_by_id = owner.id
        db.add(OwnerCompanyEvent(
            company_id=company.id, owner_id=owner.id,
            event_type="LICENSE_PLAN_SET",
            message=f"Next subscription plan: {payload.plan}; listed price INR {payload.price_inr:.2f}; no ERP access changed",
            created_at=now_utc(),
        ))
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "Subscription plan conflict") from exc
        return _view(db, company)

    @app.post("/api/owner/companies/{company_id}/license/confirm-payment", status_code=201)
    def confirm_payment(company_id: int, payload: ConfirmPaymentPayload, protected: Protected, db: Db):
        owner, _ = protected
        company = _company_locked(db, company_id)
        if company.status == "ON_HOLD":
            raise HTTPException(409, "Resume company onboarding before recording a payment")
        if payload.advance_received is not True:
            raise HTTPException(422, "Confirm that the subscription payment was already received in advance")
        plan = db.query(OwnerLicensePlan).filter(OwnerLicensePlan.company_id == company_id).first()
        if plan is None:
            raise HTTPException(409, "Configure the company subscription plan first")
        current = business_today()
        terms = _terms(db, company_id)
        latest = terms[-1] if terms else None
        # Continuous renewal from the paid period's end, including annual grace.
        # A lapsed account restarts TODAY: never create retroactive overdue debt.
        if latest and latest.start_on > current:
            raise HTTPException(409, "A future renewal is already waiting to begin")
        if latest is None:
            begin = current
        elif (latest.plan == "ANNUAL" and latest.expires_on <= current
              < latest.expires_on + timedelta(days=7)):
            # Annual renewal during grace extends the ORIGINAL expiry date.
            begin = latest.expires_on
        else:
            begin = max(current, latest.expires_on)
        try:
            end = advance_months(begin, 1 if plan.plan == "MONTHLY" else 12)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        term = OwnerLicenseTerm(
            company_id=company_id, plan=plan.plan, amount_received_inr=plan.price_inr,
            payment_reference=payload.payment_reference,
            start_on=begin, expires_on=end,
            confirmed_by_id=owner.id, confirmed_at=now_utc(),
        )
        db.add(term)
        db.add(OwnerCompanyEvent(
            company_id=company_id, owner_id=owner.id,
            event_type="PAYMENT_CONFIRMED",
            message=f"Advance payment confirmed for {plan.plan} term {begin.isoformat()} to {end.isoformat()} (end exclusive). No ERP access changed",
            created_at=now_utc(),
        ))
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "Duplicate payment reference or conflicting subscription period") from exc
        return _view(db, company)

    @app.get("/api/owner/companies/{company_id}/license/history")
    def payment_history(company_id: int, auth: Auth, db: Db):
        _company_exists(db, company_id)
        return {"items": [_term_view(t) for t in reversed(_terms(db, company_id))]}
