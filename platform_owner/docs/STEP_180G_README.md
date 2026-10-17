# CASTLE — Step 180G: Basic Platform Owner Audit History

**Verified patch base:** GitHub `Antonypraveenraj001/glisen_erp`, branch `main`, commit `f0dbfd4aab50f338b185535248e0a2943ab5ad29`.

## Scope

- Adds **read-only** `/api/owner/audit` and an **Audit history** navigation tab.
- Reuses **existing** `owner_company_events`, `owner_companies` and `owner_accounts` tables in the independently configured `castle_owner_control` database.
- Shows who (owner email), what (action and short description), which company (legal name/code) and when (UTC timestamp).
- Shows company registration/edit/onboarding actions, license plan/payment confirmations and Boss recovery review actions.
- Boss recovery also has a separate event table, but its actions already appear in `owner_company_events` and MUST NOT be counted twice.
- Category filter: `ALL`, `REGISTRATION`, `LICENSE`, `RECOVERY`; optional company-code filter and bounded pagination (20/page in UI, max 100 on API).
- All display uses `textContent`, not `innerHTML`. Unknown future event messages are withheld until reviewed.
- **No new database tables, migration, credentials, company ERP changes, service controls or Ubuntu deployment.** No `init-db` required.

## Limits — read before customer launch

- This is a **basic event viewer**, not a tamper-proof/tamper-evident compliance audit. MySQL administrators could alter existing database records. A later production phase must add durable off-host/event integrity logging, retention, tested backup and access reviews.
- Owner login/logout, security password changes, Ubuntu server maintenance, real ERP transaction history, real activation/suspension, and execution of Boss recovery are **not** in this feed yet. Those systems do not currently write into these company event tables.
- The audit feed does NOT connect to live customer ERP instances. Owner status and payment entries do NOT activate or suspend customer ERP access.
- The descriptions were already recorded in the original transaction. Some actions, such as company profile edits, have only a generic summary, not before/after field-level change details. Do not advertise exhaustive change tracking.

## Apply on Windows — no production deploy

Stop the local owner server (Ctrl+C). From repo root, confirm a clean working tree and that both local HEAD and `origin/main` match `f0dbfd4`. Apply implementation, then separate test patch, each with `git apply --check` first. Do not overwrite `.env`.

Run tests using existing backend virtual environment:

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180g_*.py" -v
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180*.py" -v
git diff --check
git status --short
```

After test confirmation, start `uvicorn platform_owner.backend.main:app --host 127.0.0.1 --port 8100` as usual, open the owner application, and check **Audit history** for existing test-company actions. Confirm category and company-code filtering, pagination and refresh. No new DB init is needed.

**Do not push or deploy until local browser tests pass.** Continue to protect `platform_owner/.env` and preserve the existing `backend/` and `frontend/` ERP.
