"""Step 180C: authenticated, read-only owner directory dashboard.

Only queries OWNER database tables. Neither provisioning nor real ERP license
checks exist yet; summaries must never be presented as operational access.
"""

from collections import defaultdict
from datetime import timedelta

from platform_owner.backend.company_models import OwnerCompany
from platform_owner.backend.license_api import business_today, subscription_status
from platform_owner.backend.license_models import OwnerLicensePlan, OwnerLicenseTerm
from platform_owner.backend.recovery_models import OwnerBossRecoveryCase


SUBSCRIPTION_STATES = (
    "NOT_CONFIGURED", "AWAITING_ADVANCE", "SCHEDULED", "PAID_CURRENT",
    "ANNUAL_GRACE", "CANCELLED",
)
RECOVERY_STATES = ("OPEN", "VERIFIED", "READY_PENDING_CONNECTOR", "REJECTED")
ATTENTION_LIMIT = 12


def build_dashboard(db, today):
    """Single consistent snapshot from the owner's registry, not customer ERPs."""
    companies = db.query(OwnerCompany).order_by(OwnerCompany.id.asc()).all()
    plans = {p.company_id: p for p in db.query(OwnerLicensePlan).all()}
    terms = defaultdict(list)
    for term in db.query(OwnerLicenseTerm).all():
        terms[term.company_id].append(term)
    recoveries = db.query(OwnerBossRecoveryCase).order_by(OwnerBossRecoveryCase.id.asc()).all()
    sub_counts = {s: 0 for s in SUBSCRIPTION_STATES}
    rec_counts = {s.lower(): 0 for s in RECOVERY_STATES}
    attention = []
    soon_count = 0

    def add(priority, kind, company, detail, *, due=None, case_id=None):
        attention.append((priority, due or "9999-12-31", company.id, case_id or 0, {
            "kind": kind,
            "company_id": company.id,
            "company_name": company.legal_name,
            "company_code": company.slug,
            "detail": detail,
            "due_on": due,
            "recovery_case_id": case_id,
        }))

    by_id = {company.id: company for company in companies}
    for company in companies:
        history = terms[company.id]
        status = subscription_status(history, today) if company.id in plans else "NOT_CONFIGURED"
        sub_counts[status] += 1
        if status == "ANNUAL_GRACE":
            paid_through = max(t.expires_on for t in history)
            end = paid_through + timedelta(days=7)
            add(1, "ANNUAL_GRACE", company, "Annual grace ends (exclusive)", due=end.isoformat())
        elif status == "CANCELLED":
            add(2, "CANCELLED", company, "Subscription cancelled in owner records")
        elif status == "PAID_CURRENT":
            covered_through = max(t.expires_on for t in history)
            if today < covered_through <= today + timedelta(days=30):
                soon_count += 1
                add(3, "EXPIRING_SOON", company, "Paid coverage ends (exclusive)", due=covered_through.isoformat())
        if company.status == "ON_HOLD":
            add(4, "ONBOARDING_ON_HOLD", company, "Onboarding registration is on hold")

    for case in recoveries:
        if case.status in RECOVERY_STATES:
            rec_counts[case.status.lower()] += 1
        company = by_id.get(case.company_id)
        if company is not None and case.status in {"OPEN", "VERIFIED", "READY_PENDING_CONNECTOR"}:
            add(0, "RECOVERY_" + case.status, company,
                "Recovery review only; no customer account changes", case_id=case.id)

    attention.sort(key=lambda record: record[:4])
    return {
        "as_of_ist": today.isoformat(),
        "scope": "OWNER_REGISTRY_ONLY",
        "erp_access_enforced": False,
        "customer_instances_connected": False,
        "companies": {
            "total": len(companies),
            "pending_setup": sum(c.status == "PENDING_SETUP" for c in companies),
            "on_hold": sum(c.status == "ON_HOLD" for c in companies),
        },
        "subscriptions": {**sub_counts, "expiring_within_30_days": soon_count},
        "recoveries": rec_counts,
        "attention_total": len(attention),
        "attention": [row[4] for row in attention[:ATTENTION_LIMIT]],
    }


def install_dashboard_routes(app, Db, Auth):
    @app.get("/api/owner/dashboard")
    def owner_dashboard(auth: Auth, db: Db):
        return build_dashboard(db, business_today())
