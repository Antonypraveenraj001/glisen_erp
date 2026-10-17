# CASTLE ERP — Step 180B + 180K: Independent Platform Owner login

**Baseline:** GitHub `main` at commit `9c34f7a0a1f491e28c2067bd451e223d430fbffe`.

## Safety boundary

- The implementation adds only new files under `platform_owner/`.
- Does **not** import `backend/app/` application components or reuse ERP database/roles/sessions/keys.
- No company ERP code, routes, migrations, tables, data, scheduled backups, or server services are changed.
- No owner account is created on server startup. Database schema creation is EXPLICIT via owner-only CLI.
- The Owner app must run on a separate local port. Public Cloudflare/Nginx deployment is NOT authorized by this patch.
- Do not deploy or run the owner app on Ubuntu yet. Complete Windows tests and isolated hardening first.

## Windows: tests first (do not configure DB to test)

From repository root:

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180bk_*.py" -v
```

Automated tests use an isolated temporary **SQLite in-memory database** only. They do NOT contact MySQL or Ubuntu.

## Windows: optional real local owner-only DB setup, after tests pass

1. Create MySQL database `castle_owner_control`, separate MySQL login `castle_owner_app`, and assign permissions **only** on this database. Never grant this account privileges to `glisen_erp` or other company DBs.
2. Copy `platform_owner/.env.example` to `platform_owner/.env` (untracked). Set a unique owner DB password and verify MySQL credentials and owner email.
3. `python -m platform_owner.backend.manage init-db --confirm-owner-only` creates **only owner tables** in the configured owner DB (requires explicit confirmation).
4. `python -m platform_owner.backend.manage bootstrap-owner --confirm-owner-only` prompts privately for a strong owner password; refuses a second owner.
5. Start from repository root, using the existing backend venv:

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m platform_owner.backend.manage init-db --confirm-owner-only
& ".\backend\venv\Scripts\python.exe" -B -m platform_owner.backend.manage bootstrap-owner --confirm-owner-only
& ".\backend\venv\Scripts\python.exe" -B -m uvicorn platform_owner.backend.main:app --host 127.0.0.1 --port 8100
```

Open `http://127.0.0.1:8100` on the **same Windows PC**. Development cookie security requires this loopback-only configuration. Do not bind to `0.0.0.0`.

## Built-in owner security

- First-owner creation is CLI-only; there is no public owner signup route.
- Passwords use memory-hard scrypt (n=32768, r=8, p=1); minimum 14 chars including uppercase, lowercase, digit and symbol; maximum 1024 UTF-8 bytes.
- Owner sessions are 48-byte random opaque tokens; only SHA-256 hashes are stored in the owner DB, **not** shared ERP JWTs.
- Owner cookies are HttpOnly, SameSite=Strict, host-only; production uses `Secure` and `__Host-` cookie prefixes.
- POST requests require the exact configured `Origin`; authenticated writes require CSRF header + cookie + server-side token validation.
- Login throttle: five failed attempts from the same network source and email results in a 15-minute lock. Put a separate IP/WAF rate limit before the production owner service.
- Changing the owner password revokes **all** owner sessions. No browser endpoint can reset owner credentials.
- HTTP security headers, restrictive CSP, no OpenAPI docs exposed, optional HSTS for production.
- No CORS access to other origins. Do not copy any ERP login cookies to owner domain.

## Production prerequisites (do not do now)

Independent database user/grants, trusted ingress, Cloudflare Access owner-only identity and MFA, secure HTTPS hostname, server-side `Origin`, dedicated service account, restricted secret file permissions, backup/restore for owner DB, centralized logging without credentials, WAF/rate limits, staging, rollback and audit review. These remain **pending**, so this release is not yet production-ready.

## Current limitations

This step implements **owner authentication and account password management only**. Company activation, licenses, Boss recovery, dashboard, audit history, production deployment and password-loss recovery will follow in later steps. A local-first recovery procedure must be designed before production use.
