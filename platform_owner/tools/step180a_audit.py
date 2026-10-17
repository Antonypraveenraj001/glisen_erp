"""CASTLE Step 180A: read-only source architecture inventory.

NO application imports; NO database/network calls; NO environment-file reads;
NO source modifications; NO deployment actions. Standard library only.

This is a preliminary STATIC audit, not a penetration test or proof of
production separation. All findings require later runtime verification.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
import sys


@dataclass(frozen=True)
class Finding:
    status: str
    code: str
    message: str


# Only named source files are inspected. Never inspect .env, backups, dumps,
# passwords, certificates, tokens, uploaded documents, or business data.
SOURCE_FILES = (
    "backend/app/database/session.py",
    "backend/app/core/config.py",
    "backend/app/core/security.py",
    "backend/app/dependencies/auth.py",
    "backend/app/models/user.py",
    "backend/app/models/company_settings.py",
    "backend/app/services/backup_service.py",
    "backend/app/services/backup_scheduler.py",
    "backend/app/main.py",
    "frontend/src/context/AuthContext.tsx",
    "frontend/src/services/authService.ts",
)


def _read_source(root: Path, relative: str) -> str | None:
    """Read exactly one known code path; do not follow symlinks."""
    path = root / relative
    if not path.is_file() or path.is_symlink():
        return None
    try:
        if path.stat().st_size > 2_000_000:
            return None
        return path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeError):
        return None


def _has(text: str | None, pattern: str) -> bool:
    return text is not None and re.search(pattern, text, re.I | re.S) is not None


def audit(root: Path) -> list[Finding]:
    """Classify static patterns without modifying anything on disk."""
    root = Path(root)
    findings: list[Finding] = []
    if not root.is_dir():
        return [Finding("BLOCKER", "INVALID_ROOT", "Repository directory not found.")]

    sources = {name: _read_source(root, name) for name in SOURCE_FILES}
    missing = [name for name, content in sources.items() if content is None]
    if missing:
        for name in missing:
            findings.append(Finding("BLOCKER", "MISSING_SOURCE", f"Missing/unreadable: {name}"))
        findings.append(Finding("REVIEW", "SOURCE_VERSION", "Confirm Windows working tree matches intended GitHub main revision."))
        return findings

    db = sources["backend/app/database/session.py"]
    config = sources["backend/app/core/config.py"]
    security = sources["backend/app/core/security.py"]
    auth = sources["backend/app/dependencies/auth.py"]
    user = sources["backend/app/models/user.py"]
    company = sources["backend/app/models/company_settings.py"]
    backup = sources["backend/app/services/backup_service.py"]
    scheduler = sources["backend/app/services/backup_scheduler.py"]
    main = sources["backend/app/main.py"]
    browser_auth = sources["frontend/src/context/AuthContext.tsx"]
    browser_service = sources["frontend/src/services/authService.ts"]

    if _has(db, r"database\s*=\s*settings\.DB_NAME") and _has(config, r"DB_NAME\s*:"):
        findings.append(Finding("PASS", "CONFIGURABLE_DATABASE", "MySQL database is selected through per-process configuration."))
    else:
        findings.append(Finding("BLOCKER", "DATABASE_SELECTION", "Database may not be selected by per-instance DB_NAME; inspect manually."))

    if _has(security, r"settings\.SECRET_KEY") and _has(auth, r"decode_access_token"):
        findings.append(Finding("PASS", "CONFIGURABLE_TOKEN_SIGNING", "ERP JWT validation uses configured signing key."))
        findings.append(Finding("REVIEW", "UNIQUE_KEYS", "Require a DIFFERENT strong SECRET_KEY for every customer instance and owner service."))
    else:
        findings.append(Finding("BLOCKER", "TOKEN_ISOLATION", "Could not confirm independently configurable token signing."))

    if _has(user, r"__tablename__\s*=\s*['\"]users['\"]") and not _has(user, r"\bcompany_id\b"):
        findings.append(Finding("REVIEW", "PER_INSTANCE_USER_TABLE", "ERP users have no tenant/company foreign key. Suitable only with rigorously separate databases and instances."))
    else:
        findings.append(Finding("REVIEW", "USER_MODEL", "Confirm user scoping and prevent any cross-instance credential use."))

    if _has(company, r"__tablename__\s*=\s*['\"]company_settings['\"]"):
        findings.append(Finding("PASS", "COMPANY_CONFIGURATION_MODEL", "Existing company settings model can be initialized separately for each instance."))
    else:
        findings.append(Finding("BLOCKER", "COMPANY_SETTINGS", "Company settings model was not recognized."))

    if _has(browser_auth, r"import\.meta\.env\.PROD\s*\?\s*['\"]/api/v1['\"]") and _has(browser_service, r"import\.meta\.env\.PROD\s*\?\s*['\"]/api/v1['\"]"):
        findings.append(Finding("PASS", "PRODUCTION_RELATIVE_API", "Main login and auth context use same-origin /api/v1 in production."))
    else:
        findings.append(Finding("REVIEW", "FRONTEND_API_ROUTING", "Check browser API origins before deploying on separate hostnames."))

    if _has(config, r"UPLOAD_FOLDER\s*:") and _has(config, r"EXPORT_FOLDER\s*:"):
        findings.append(Finding("REVIEW", "FILE_STORAGE", "Provide separate upload and export directories with restricted filesystem permissions for every company."))
    else:
        findings.append(Finding("BLOCKER", "FILE_STORAGE_CONFIG", "Upload/export folder isolation needs investigation."))

    if _has(backup, r"ARCHIVE_PREFIX\s*=\s*['\"]glisen_erp_"):
        findings.append(Finding("REVIEW", "BACKUP_NAME_COLLISION", "Backup archives share a standard prefix; require distinct company backup paths, ownership and cloud destinations."))
    else:
        findings.append(Finding("REVIEW", "BACKUP_NAMING", "Independently validate backup archive naming and destinations."))

    if _has(scheduler, r"SessionLocal") and _has(main, r"start_backup_scheduler"):
        findings.append(Finding("REVIEW", "EACH_INSTANCE_SCHEDULER", "Each backend can run backup scheduling: confirm independent paths, retention, credentials and no duplicate jobs."))
    else:
        findings.append(Finding("REVIEW", "SCHEDULER_REVIEW", "Confirm backup scheduler lifecycle and isolation before deployment."))

    findings.extend((
        Finding("REVIEW", "OWNER_CONTROL_PLANE", "Keep owner API, authentication, JWT keys and management database OUTSIDE the company ERP user/role model."),
        Finding("REVIEW", "PROVISIONING", "Create NEW empty company database; initialize schema/roles only. Never clone production business data."),
        Finding("REVIEW", "RUNTIME_SEPARATION", "Separate backend ports/services, MySQL users, filesystem paths, Nginx hostnames and Cloudflare Access policies."),
        Finding("REVIEW", "LICENSE_ENFORCEMENT", "Suspend/cancel must be checked server-side and fail closed; frontend-only or editable company status is insufficient."),
        Finding("REVIEW", "EMERGENCY_ACCESS", "Boss recovery needs verified company authorization, revocation, audit events and dedicated owner-to-company action channel."),
        Finding("REVIEW", "LINUX_DEPLOYMENT", "Windows static findings do NOT verify live Ubuntu systemd, Nginx, MySQL grants, Cloudflare, backups or restore."),
        Finding("REVIEW", "PRODUCTION_SAFETY", "Any future deployment must first pass isolated staging, backup/restore testing, diff review and rollback plan."),
    ))
    return findings


def format_report(findings: list[Finding]) -> str:
    lines = [
        "CASTLE ERP - STEP 180A STATIC AUDIT (READ ONLY)",
        "Scope: named source files only; no credentials, DB or services accessed.",
        "PASS means a code pattern was found, NOT that security was proven.",
        "",
    ]
    lines.extend(f"[{x.status}] {x.code}: {x.message}" for x in findings)
    counts = {kind: sum(x.status == kind for x in findings) for kind in ("PASS", "REVIEW", "BLOCKER")}
    lines.extend((
        "",
        f"SUMMARY: {counts['PASS']} static patterns confirmed, {counts['REVIEW']} manual reviews, {counts['BLOCKER']} blockers.",
        "NO source files, secrets, databases, services or configuration were modified.",
        "Next: review output together BEFORE creating Step 180B/180K code.",
    ))
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="Windows repository root")
    args = parser.parse_args(argv)
    results = audit(args.repo)
    print(format_report(results))
    return 2 if any(x.status == "BLOCKER" for x in results) else 0


if __name__ == "__main__":
    sys.exit(main())
