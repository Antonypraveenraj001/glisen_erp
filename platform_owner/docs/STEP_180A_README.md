# CASTLE ERP Step 180A: Read-only architecture audit

- **Verified GitHub reference at preparation:** `Antonypraveenraj001/glisen_erp` `main` commit `83af969dadc94fe2205ac30f359642c6933c4e17`.
- **Scope:** Static review only on Windows. This does NOT complete a penetration test or production deployment audit.
- **Production:** No application code modifications, database access, migrations, authentication changes, or backup/service changes.
- **Secrets:** The script neither reads `.env` nor prints passwords, tokens, configuration values, or business data.
- **Output:** Terminal only. It does not write reports into the repository.

## Order of execution (PowerShell, repository root)

1. `git status --short` (must be understood before making changes)
2. `git fetch origin` (optional but recommended if GitHub is reachable)
3. `git rev-parse HEAD` and `git rev-parse origin/main` (compare revisions; do not reset anything)
4. `git apply --check "<download-folder>\CASTLE_Step_180A_Audit.patch"`
5. `git apply "<download-folder>\CASTLE_Step_180A_Audit.patch"`
6. `git apply --check "<download-folder>\CASTLE_Step_180A_Tests.patch"`
7. `git apply "<download-folder>\CASTLE_Step_180A_Tests.patch"`
8. `py -3.11 -B -m unittest discover -s platform_owner/tests -p "test_step180a_audit.py" -v`
9. `py -3.11 -B platform_owner/tools/step180a_audit.py --repo .`
10. `git status --short` (only newly added `platform_owner/` files should appear)

Run **NO** `git add`, `git commit`, `git push`, Ubuntu commands or Alembic migrations until review is complete.

## Interpret results

- `PASS`: A static source-code pattern matches. **Not a security certification.**
- `REVIEW`: Design or environment concern; must be resolved before customer launch.
- `BLOCKER`: Key source missing or the current layout is inconsistent with expected isolated deployment.

The separate Platform Owner service will use an independent management database and identity system. Each company will run a dedicated ERP instance/database, with isolated backups and strong per-instance secrets.
