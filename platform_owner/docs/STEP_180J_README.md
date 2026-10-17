# CASTLE ERP — Step 180J: Independent Company Registration

## Scope and hard boundaries

- Adds owner-only company registration in the existing **separate** Platform Owner service.
- The only persistent storage is `castle_owner_control` (owner-only DB); it never reads or writes `glisen_erp`.
- Adds two owner-only tables: `owner_companies` and `owner_company_events`.
- The already-installed company ERP application is **not** modified: no backend/ or frontend/ changes; no company DB, account, service, Nginx, Cloudflare, or backup changes.
- **IMPORTANT:** This is a *registration directory*, NOT customer provisioning. A company code does not create an ERP instance, DNS, database, user login, billing agreement, license, backups, or cloud access.
- `PENDING_SETUP` and `ON_HOLD` are **onboarding record** states only. Holding onboarding does **not** block any existing ERP login.
- API routes `/activate` and `/suspend` intentionally return `409 Conflict` even for an authenticated owner, until Step 180L and dedicated-instance provisioner have verified *real server-side enforcement*. Do **not** represent these administrative entries as an active customer service or a completed suspension.
- The Platform Owner still must manually provision and verify per-company isolation, and confirm the agreement and payment before launch.
- Company Boss/Admin passwords are never entered into this registry; `boss_email` is a contact address, not a login created by this step.
- Unverified company name, GSTIN and emails entered here are *registration claims*, not verified legal authority.

## Before applying patches (Windows PowerShell)

At the repository root, verify `git status`, and that local HEAD and origin/main point to `238c5a4` or stop and obtain an updated patch. Leave the already created owner `.env` alone. Apply the implementation patch, then the separate testing patch using `git apply --check` and `git apply`.

## Tests: entirely in-memory, do not access MySQL

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180j*.py" -v
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180bk_*.py" -v
```

The first command runs 13 company-registration tests; the second runs 12 legacy owner security tests. No `.env`/live owner MySQL credentials are loaded by either suite.

## Later: add owner-only tables on Windows after test confirmation

From the repository root with the separate owner `.env` already configured:

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m platform_owner.backend.manage init-db --confirm-owner-only
```

This uses SQLAlchemy `create_all` on the **configured owner database** and does not drop/replace existing tables. It requires the owner DB to contain the three tables from Step 180B/180K; their records are preserved. This is a local development action only and must be reviewed separately before production use.

Verify in **CASTLE Platform Owner** MySQL Workbench connection:

```sql
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'castle_owner_control' ORDER BY TABLE_NAME;
```

Expected five tables: `owner_accounts`, `owner_company_events`, `owner_companies`, `owner_login_throttles`, `owner_sessions`.

Restart local owner API if it was already running (without `--reload`) and browse `http://127.0.0.1:8100` with the existing owner account. The Company Management page supports register, edit, hold/resume onboarding and a basic actions history. The Owner Security tab still contains password change and sign out.

## Safety checks for implementation review

- All operations are owner-session authenticated; writes additionally check origin and CSRF.
- Slugs are unique/immutable and reject reserved names; GSTIN is optionally provided with format validation and unique constraint when present.
- No account or password is generated for any customer's Boss.
- Company data is shown using `textContent` (not `innerHTML`) in the browser.
- Company events record owner actions without passwords/tokens, supporting the later Step 180G audit UI.
- No activation or suspension of actual ERP until Step 180L ensures enforcement in each independent instance.
- No Git commit/push, Ubuntu deployment, or new company activation before local test sign-off.
