# CASTLE ERP — Step 180L: Platform Owner Subscription Ledger (Windows)

**Base:** GitHub `Antonypraveenraj001/glisen_erp` `main` commit `fe068546998cfdad0dded853d0e517c8fff17c68`.

## Boundaries and policy

- Adds only files/edits under `platform_owner/`. **No changes** to existing ERP `backend/`, `frontend/`, customer databases, instance services, Cloudflare, backup jobs, licensing gates, or Nginx.
- `castle_owner_control` is the *only* persistent database involved when running the local application. Tests use disposable in-memory SQLite and never load production `.env`.
- Configurable per-company monthly or annual **INR subscription price**. Monthly grace = **0 days**. Annual grace = **7 India-local calendar days**. **No trials, no overdue credits, no automatic charge**. Requires owner confirmation that payment has already been received **in advance**.
- Subscription term is from **start_on inclusive to expires_on exclusive**, calculated as one/twelve calendar months. Anniversary date may clamp to the last day in a short month (example: Jan 31 -> Feb 28 -> Mar 28). Annual renewals recorded within grace begin at **original expiration**, so the grace is not added free to the next paid year. Renewals after complete lapse begin on confirmation date.
- Status is calculated from confirmed immutable payment terms at **current India business date**, whenever read, without depending on an always-running scheduler: `NOT_CONFIGURED`, `AWAITING_ADVANCE`, `PAID_CURRENT`, `ANNUAL_GRACE`, `CANCELLED`. `SCHEDULED` is possible if a prepaid future term has not begun. Historical payment periods keep the price and plan in effect when confirmed.
- After `CANCELLED`, display a **proposed** 90-day data-export/recovery deadline. **No customer data is deleted or exported by this patch**; no actual retention task is enabled.
- A `PAID_CURRENT` license **does not** mean any customer has an active ERP. `erp_access_enforced=false` and `erp_deployment_status=NOT_PROVISIONED` must remain explicit. The company `/activate` and `/suspend` APIs continue to return **409**. Secure instance provisioning and backend-side license enforcement, terms acknowledgment, tax invoicing, receipt verification, refunds if legally required, and backups all remain separately required before a paying customer is launched.
- Payment references must be unique across the owner registry. For concurrency, MySQL serializes company payment confirmations using `SELECT FOR UPDATE` and unique database constraints. Confirmation is *manual*, not bank-integrated; the application **cannot verify money actually arrived**.
- Independent owner login/CSRF and immutable company code are preserved. Only the owner can configure a plan, confirm payments, or view payment history. Company Boss/Admin cannot use these routes.
- `price_inr` is the plan's listed fee, without automatic GST calculation. Issue any legally required tax invoice outside this step. Do not enter customer bank details, UPI PINs, payment gateway keys, or transaction secrets.

## Apply and test on Windows (repo root, STOP server first)

Check `git status` clean and `git rev-parse --short HEAD` / `origin/main` both equal `fe06854`. Download the **implementation** and **tests** patches into Downloads.

```powershell
$impl = "$env:USERPROFILE\Downloads\CASTLE_Step_180L_Implementation.patch"
$tests = "$env:USERPROFILE\Downloads\CASTLE_Step_180L_Tests.patch"
git apply --check $impl
git apply $impl
git apply --check $tests
git apply $tests
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180l*.py" -v
& ".\backend\venv\Scripts\python.exe" -B -m unittest discover -s platform_owner/tests -p "test_step180*.py" -v
git diff --check
git status --short
```

Do **not** commit, migrate the owner DB, or start Ubuntu deployment until the test output is reviewed.

## After review: initialize owner-only tables (Windows)

Stop local Uvicorn. **Do not run migrations on `glisen_erp`.** The previous `init-db` tool uses `OwnerBase.metadata.create_all`, which creates **new** tables; it does not alter/drop existing tables. This step introduces:

- `owner_license_plans`: one configurable plan and fee for each company.
- `owner_license_terms`: immutable record of each advance-payment term, unique payment reference.

```powershell
& ".\backend\venv\Scripts\python.exe" -B -m platform_owner.backend.manage init-db --confirm-owner-only
```

Verify via the restricted **CASTLE Platform Owner** MySQL Workbench connection:

```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'castle_owner_control' ORDER BY TABLE_NAME;
```

**Expected seven tables:** `owner_accounts`, `owner_companies`, `owner_company_events`, `owner_license_plans`, `owner_license_terms`, `owner_login_throttles`, `owner_sessions`.

Then start the owner API on `http://127.0.0.1:8100`, log in, click **Manage license** on the *dummy company only*, save a sample plan, and use a clearly fictional payment reference for a **test record only**. Do not use real customer payment details until commercial controls and agreements are finalized.

## Future hard gates before first customer

Dedicated ERP instance/database/files/backup and secret isolation; per-instance server-side license verification and fail-closed offline behavior; verified paid agreement and consent records; secure owner-only company activation/recovery; independently verified suspension; proper tax invoices and controlled data export/deletion; safe staging and rollback testing. These are NOT implemented by this patch.
