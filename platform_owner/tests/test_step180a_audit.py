"""Standard-library tests for the read-only CASTLE Step 180A audit."""

from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "step180a_audit.py"
spec = importlib.util.spec_from_file_location("castle_step180a", SCRIPT)
audit_module = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = audit_module
spec.loader.exec_module(audit_module)


class Step180ATests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.fake_sources = {
            "backend/app/database/session.py": "DATABASE_URL = URL.create(database=settings.DB_NAME)\n",
            "backend/app/core/config.py": "DB_NAME: str\nUPLOAD_FOLDER: str\nEXPORT_FOLDER: str\n",
            "backend/app/core/security.py": "x = settings.SECRET_KEY\n",
            "backend/app/dependencies/auth.py": "payload = decode_access_token(token)\n",
            "backend/app/models/user.py": 'class User:\n    __tablename__ = "users"\n',
            "backend/app/models/company_settings.py": 'class CompanySettings:\n    __tablename__ = "company_settings"\n',
            "backend/app/services/backup_service.py": 'ARCHIVE_PREFIX = "glisen_erp_"\n',
            "backend/app/services/backup_scheduler.py": "from somewhere import SessionLocal\n",
            "backend/app/main.py": "start_backup_scheduler()\n",
            "frontend/src/context/AuthContext.tsx": 'const URL = (import.meta.env.PROD ? "/api/v1" : "http://127.0.0.1:8000/api/v1");\n',
            "frontend/src/services/authService.ts": 'const URL = (import.meta.env.PROD ? "/api/v1" : "http://127.0.0.1:8000/api/v1");\n',
        }
        for path, contents in self.fake_sources.items():
            file = self.root / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(contents, encoding="utf-8")

    def test_expected_static_findings(self):
        findings = audit_module.audit(self.root)
        codes = {item.code: item.status for item in findings}
        self.assertEqual(codes["CONFIGURABLE_DATABASE"], "PASS")
        self.assertEqual(codes["CONFIGURABLE_TOKEN_SIGNING"], "PASS")
        self.assertEqual(codes["PRODUCTION_RELATIVE_API"], "PASS")
        self.assertEqual(codes["BACKUP_NAME_COLLISION"], "REVIEW")
        self.assertEqual(codes["OWNER_CONTROL_PLANE"], "REVIEW")
        self.assertNotIn("BLOCKER", {item.status for item in findings})

    def test_audit_does_not_change_source_or_create_reports(self):
        marker = self.root / ".env"
        marker.write_text("HIGHLY_CONFIDENTIAL_EXAMPLE_SECRET=do-not-print", encoding="utf-8")
        before = self._fingerprints()
        findings = audit_module.audit(self.root)
        after = self._fingerprints()
        self.assertEqual(before, after)
        self.assertNotIn("do-not-print", audit_module.format_report(findings))

    def test_missing_source_returns_blocker(self):
        (self.root / "backend/app/core/security.py").unlink()
        findings = audit_module.audit(self.root)
        self.assertTrue(any(x.status == "BLOCKER" for x in findings))
        self.assertIn("MISSING_SOURCE", {x.code for x in findings})

    def test_missing_database_setting_returns_blocker(self):
        (self.root / "backend/app/database/session.py").write_text("DATABASE_URL = 'hardcoded'", encoding="utf-8")
        findings = audit_module.audit(self.root)
        self.assertIn("DATABASE_SELECTION", {x.code for x in findings if x.status == "BLOCKER"})

    def test_no_unintended_secret_values_in_report(self):
        (self.root / "backend/app/core/config.py").write_text(
            'DB_NAME: str\nUPLOAD_FOLDER: str\nEXPORT_FOLDER: str\nSECRET_KEY: str = "sample_sensitive_do_not_print"\n',
            encoding="utf-8",
        )
        output = audit_module.format_report(audit_module.audit(self.root))
        self.assertNotIn("sample_sensitive_do_not_print", output)

    def _fingerprints(self):
        return {
            str(p.relative_to(self.root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in self.root.rglob("*") if p.is_file()
        }


if __name__ == "__main__":
    unittest.main()
