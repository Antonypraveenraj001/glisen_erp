# CASTLE ERP Step 180C — Read-only Platform Owner dashboard

## Scope / safety

- This is a single **GET** route (`/api/owner/dashboard`) and a dashboard tab for the **independent Platform Owner service**, not a live ERP infrastructure monitor.
- Source of truth: existing `castle_owner_control` owner tables only. Neither reads nor writes an individual customer ERP database. No shell commands, deployment, service restarts, credentials, secrets, license keys or new database tables.
- It **does not activate, suspend, provision or check live availability** of customer ERP installations. The dashboard explicitly states this. A `PAID_CURRENT` owner ledger status is never proof of ERP access.
- Both the original owner login/security page and all Companies, Manage License and Boss Recovery workflows are unchanged.
- Authenticated owner session required; unauthorized clients get 401. HTTP caching is disabled by the existing owner service.
- Uses India local business date; license expiry is calculated at request time (no background scheduler). Annual grace: 7 days; monthly grace: 0.
- All customer-supplied names are rendered by `textContent`, never interpreted as HTML.
- A dashboard `Review company` button opens the existing company management / license / recovery review. It never performs a mutation.
- Flagged items are limited to 12; total number is displayed. Summary totals cover **all** owner companies, not merely the first 20 in the company list.
- No account recovery execution, secret reset, automatic deletion, scheduled task or notification is added.

## Apply / test in Windows PowerShell (root of repo)

1. Confirm local `git status` is clean and both HEAD and origin/main equal GitHub commit `5e4722300ed586d12a49b4b476e338e8dfd81ee9`.
2. Apply Step 180C implementation patch with `git apply --check`, then `git apply`.
3. Apply separate Step 180C testing patch with `git apply --check`, then `git apply`.
4. Run the new tests using existing `backend/venv/Scripts/python.exe` and standard unittest discovery `test_step180c_*.py`.
5. Run all `test_step180*.py` tests, then `git diff --check` and `git status --short`.
6. After test signoff, run the existing local Windows owner server on `127.0.0.1:8100` and test login, dashboard totals, refresh, navigation, Companies, Owner security, sign-out and browser refresh.

**No `init-db` required, since the dashboard has no new tables.** Do not alter production ERP, Ubuntu, MySQL grants, Cloudflare, backup services, or remote deployment during this step.
