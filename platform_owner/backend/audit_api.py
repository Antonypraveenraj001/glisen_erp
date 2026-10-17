"""Step 180G: read-only Platform Owner activity feed.

The existing OwnerCompanyEvent ledger already mirrors company registration,
license and Boss recovery actions. Use that source once, rather than joining
recovery events again and incorrectly double-counting them.

This is a *basic* owner activity viewer, not a tamper-evident security log. It
never reads customer ERP databases, credentials or recovery evidence.
"""

import re

from fastapi import HTTPException
from sqlalchemy import func

from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent
from platform_owner.backend.models import OwnerAccount


CATEGORY_ACTIONS = {
    "REGISTRATION": frozenset({
        "REGISTERED", "PROFILE_UPDATED", "ONBOARDING_HELD", "ONBOARDING_RESUMED",
    }),
    "LICENSE": frozenset({"LICENSE_PLAN_SET", "PAYMENT_CONFIRMED"}),
    "RECOVERY": frozenset({"BOSS_RECOVERY"}),
}
KNOWN_ACTIONS = frozenset().union(*CATEGORY_ACTIONS.values())
CODE_PATTERN = re.compile(r"^[a-z][a-z0-9-]{2,39}$")


def _category(action: str) -> str:
    for category, actions in CATEGORY_ACTIONS.items():
        if action in actions:
            return category
    return "OTHER"


def _safe_details(event) -> str:
    # These are fixed, existing application-generated messages. Future event
    # types must be explicitly reviewed before their contents are displayed.
    if event.event_type in KNOWN_ACTIONS:
        return event.message
    return "Unclassified owner event; details withheld pending review"


def install_audit_routes(app, Db, Auth):
    @app.get("/api/owner/audit")
    def owner_audit_history(
        auth: Auth, db: Db, *, offset: int = 0, limit: int = 20,
        category: str = "ALL", company_code: str | None = None,
    ):
        if offset < 0 or not 1 <= limit <= 100:
            raise HTTPException(422, "Invalid audit pagination")
        if category not in {"ALL", *CATEGORY_ACTIONS}:
            raise HTTPException(422, "Unsupported audit category")
        if company_code is not None:
            if not CODE_PATTERN.fullmatch(company_code) or "--" in company_code or company_code.endswith("-"):
                raise HTTPException(422, "Invalid company code filter")

        query = (db.query(OwnerCompanyEvent, OwnerCompany, OwnerAccount)
                 .join(OwnerCompany, OwnerCompany.id == OwnerCompanyEvent.company_id)
                 .join(OwnerAccount, OwnerAccount.id == OwnerCompanyEvent.owner_id))
        if category != "ALL":
            query = query.filter(OwnerCompanyEvent.event_type.in_(CATEGORY_ACTIONS[category]))
        if company_code is not None:
            query = query.filter(OwnerCompany.slug == company_code)

        total = query.with_entities(func.count(OwnerCompanyEvent.id)).scalar() or 0
        entries = (query.order_by(OwnerCompanyEvent.created_at.desc(), OwnerCompanyEvent.id.desc())
                   .offset(offset).limit(limit).all())
        return {
            "scope": "OWNER_REGISTRY_EVENTS_ONLY",
            "customer_erp_connected": False,
            "immutable_external_audit_enabled": False,
            "items": [
                {
                    "id": event.id,
                    "occurred_at": event.created_at.isoformat() + "Z",
                    "category": _category(event.event_type),
                    "action": event.event_type,
                    "company_id": company.id,
                    "company_code": company.slug,
                    "company_name": company.legal_name,
                    "actor_id": account.id,
                    "actor_email": account.email,
                    "details": _safe_details(event),
                    "live_erp_access_changed": False,
                }
                for event, company, account in entries
            ],
            "total": total,
            "offset": offset,
            "limit": limit,
        }
