# CASTLE ERP Step 180H — Emergency Boss Recovery Case Management

**Status:** CASE REVIEW ONLY, not a password reset. No new user, email, OTP, role,
JWT, Cloudflare policy or database account is created or modified by this step.

## Why the step is deliberately staged

CASTLE presently uses one independent ERP backend/database per company. The
owner registry does not yet have a trusted per-company provisioning and
management channel. Therefore a platform-wide "reset Boss" button would be
insecure or misleading. This patch creates an **owner-authenticated manual
verification and approval record**, and it requires the future company-specific
connector before any account recovery can actually be performed.

An APPROVED case uses the explicit status `READY_PENDING_CONNECTOR`. It is
**not** evidence that the customer has regained access.

## Added tables (owner database only)

- `owner_boss_recovery_cases` — reason, requesting contact, status, sanitized
  external evidence ticket reference, reviewed/verified timestamps and owner IDs.
- `owner_boss_recovery_events` — append-only-in-API recovery event history.
- Also writes short, nonsensitive lifecycle entries to existing
  `owner_company_events`, for the later owner audit UI.

These tables belong exclusively to the `castle_owner_control` schema. The
existing `glisen_erp` company database, the ERP login, its users and roles,
Nginx, Cloudflare, backup scripts and existing production services are unchanged.

**Evidence/privacy:** Do not enter passwords, OTPs, identity document numbers,
proof documents, scans, signed letters, or copies of private messages. An
`evidence_reference` is only a nonsensitive ID pointing to separately secured
records, not the evidence itself. The app cannot verify genuine documents;
it records the owner's attestations. Signed company authority is required for
Boss replacement, lost email/OTP, or unavailable Boss scenarios.

## Workflow

1. Open a case for the registered Boss, registered emergency recovery contact,
   or a newly appointed legal representative. A new legal representative's email
   does not by itself establish authority.
2. Verify the requester's identity, legal company authority, and independently
   established company contact, outside the application. Store proof securely.
3. Record a nonsensitive external ticket reference and mark the case verified.
4. Approve **for future secure execution only**, or reject/revoke it.
5. In a later step, a separately reviewed and tested connector must recheck
   authorization and the target account, revoke previous login sessions, change
   the intended account securely, provide notification to registered contacts,
   and record the outcome. That connector is NOT included in this patch.

Only one unresolved case may exist per company. Rejected requests remain in the
audit trail; new requests may be opened after rejection. Review states cannot be
silently edited after submission. Approval can be revoked while still awaiting
secure execution.

## Windows patch/test order

From a clean repo at GitHub `main` commit `25d21f1866ef0b8cac2420f73ce52a9d7d65d454`:

```powershell
cd C:\Users\admin\.cursor\projects\glisen_erp

git status
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main

git apply --check "$env:USERPROFILE\Downloads\CASTLE_Step_180H_Implementation.patch"
git apply "$env:USERPROFILE\Downloads\CASTLE_Step_180H_Implementation.patch"

git apply --check "$env:USERPROFILE\Downloads\CASTLE_Step_180H_Tests.patch"
git apply "$env:USERPROFILE\Downloads\CASTLE_Step_180H_Tests.patch"

& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180h_*.py" -v
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180*.py" -v

git diff --check
git status --short
```

Tests use **SQLite in memory**, not the owner MySQL database nor any ERP instance.
Stop and share results before touching the real owner schema.

## Future owner-only schema initialization (AFTER tests confirmed)

1. Stop the owner Uvicorn server (Ctrl+C).
2. Make sure the active ignored `platform_owner/.env` is unchanged and
   `CASTLE_OWNER_DB_NAME=castle_owner_control`.
3. Run the already existing, guarded command:

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m platform_owner.backend.manage init-db --confirm-owner-only
```

4. Verify only the two new recovery tables have been added to the five existing
   registry/security and two licensing tables:

```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'castle_owner_control'
ORDER BY TABLE_NAME;
```

Expect **9 tables** total. Then restart the local owner service and test recovery
with **CASTLE Demo Engineering Updated**, using clearly fictitious test contacts
and references. Do not open a case for a real customer or claim credentials were
recovered. No Ubuntu deployment, Git commit, or live customer intervention until
all checks are complete.

## Security boundaries

- Owner session required for reads; origin and CSRF required for writes.
- Strict reason/role/method/decision allowlists and bounded reference format.
- Requester Boss or recovery-contact email must match the registered address;
  new legal representatives require independent verification and signed authority.
- Every transition is scoped by company ID; status changes are serialized on
  the recovery case row on MySQL. Initial case creation locks the company row.
- No code path to import the company ERP, execute shell commands, send password
  resets, change authentication or use company DB credentials.
- A future connector must not trust these owner-checklist fields alone as proof.
- The owner service remains Windows-only until separate Ubuntu staging is tested.
