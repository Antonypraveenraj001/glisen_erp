"""Step 180H: recovery cases only; in-memory SQLite, never live owner/ERP MySQL."""

from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from platform_owner.backend.app import create_app
from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.company_models import OwnerCompanyEvent
from platform_owner.backend.database import OwnerBase
from platform_owner.backend.recovery_models import OwnerBossRecoveryCase, OwnerBossRecoveryEvent
from platform_owner.backend.settings import OwnerSettings

ORIGIN = "http://127.0.0.1:8100"
EMAIL = "hrglobalinfo198@gmail.com"
PASS = "VeryStrongOwnerPass!2026"
ROOT = "/api/owner/companies"


class BossRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        OwnerBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine, expire_on_commit=False)
        config = OwnerSettings(
            environment="development", origin=ORIGIN, db_host="127.0.0.1",
            db_port=3306, db_name="castle_owner_tests", db_user="castle_owner_tests",
            db_password="UNIT_TEST_DATABASE_PASSWORD", owner_email=EMAIL, session_minutes=30,
        )
        self.client = TestClient(create_app(config, session_factory=self.factory), base_url=ORIGIN)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)
        with self.factory() as db:
            bootstrap_first_owner(db, EMAIL, PASS)
        self.company_id = None

    def headers(self):
        return {"Origin": ORIGIN, "x-csrf-token": self.client.cookies.get("castle_owner_dev_csrf")}

    def login(self):
        result = self.client.post("/api/owner/auth/login", json={"email": EMAIL, "password": PASS}, headers={"Origin": ORIGIN})
        self.assertEqual(result.status_code, 200, result.text)

    def company(self, slug="demo-engineering", recovery="backup@example.com"):
        response = self.client.post(ROOT, headers=self.headers(), json={
            "slug": slug, "legal_name": "Demo Engineering Company", "gstin": None,
            "boss_email": "boss@example.com", "recovery_email": recovery,
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.company_id = response.json()["id"]
        return self.company_id

    def path(self, company_id=None):
        return f"{ROOT}/{company_id or self.company_id}/boss-recovery"

    def payload(self, **kwargs):
        return {
            "reason": "LOST_PASSWORD", "requester_role": "RECOVERY_CONTACT",
            "requester_email": "backup@example.com", **kwargs,
        }

    def create(self, **kwargs):
        return self.client.post(self.path(), headers=self.headers(), json=self.payload(**kwargs))

    def verify_payload(self, **kwargs):
        return {
            "method": "SIGNED_COMPANY_AUTHORIZATION",
            "evidence_reference": "TICKET-2026-001",
            "independent_identity_checked": True,
            "legal_company_authority_checked": True,
            "company_contact_checked": True,
            **kwargs,
        }

    def verify(self, case_id, **kwargs):
        return self.client.post(self.path()+f"/{case_id}/verify", headers=self.headers(), json=self.verify_payload(**kwargs))

    def approve(self, case_id, **kwargs):
        return self.client.post(self.path()+f"/{case_id}/approve", headers=self.headers(), json={
            "review_completed": True, "understand_no_customer_account_is_changed": True, **kwargs,
        })

    def case(self, **kwargs):
        response = self.create(**kwargs)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def test_models_are_owner_only_and_no_runtime_erp_connector(self):
        self.assertIn("owner_boss_recovery_cases", OwnerBase.metadata.tables)
        self.assertIn("owner_boss_recovery_events", OwnerBase.metadata.tables)
        self.assertNotIn("users", OwnerBase.metadata.tables)
        self.assertNotIn("company_settings", OwnerBase.metadata.tables)
        base = Path(__file__).resolve().parents[1] / "backend"
        for name in ("recovery_api.py", "recovery_models.py"):
            content = (base / name).read_text(encoding="utf-8")
            for forbidden in ("from app.", "import app.", "subprocess", "pymysql", "requests.", "httpx."):
                self.assertNotIn(forbidden, content)

    def test_unauthenticated_endpoints_are_denied(self):
        self.assertEqual(self.client.get(ROOT+"/1/boss-recovery").status_code, 401)
        self.assertEqual(self.client.post(ROOT+"/1/boss-recovery", json=self.payload(), headers={"Origin": ORIGIN}).status_code, 401)
        for action in ("verify", "approve", "reject"):
            self.assertEqual(self.client.post(ROOT+f"/1/boss-recovery/1/{action}", json={}, headers={"Origin": ORIGIN}).status_code, 401)

    def test_missing_origin_and_csrf_are_denied(self):
        self.login(); self.company()
        self.assertEqual(self.client.post(self.path(), json=self.payload(), headers={"Origin": ORIGIN}).status_code, 403)
        self.assertEqual(self.client.post(self.path(), json=self.payload(), headers={**self.headers(), "Origin": "https://evil.example"}).status_code, 403)
        self.assertEqual(self.client.get(self.path()).json()["total"], 0)

    def test_open_case_records_unverified_and_never_resets_account(self):
        self.login(); self.company()
        response = self.create()
        self.assertEqual(response.status_code, 201, response.text)
        item = response.json()
        self.assertEqual(item["status"], "OPEN")
        self.assertFalse(item["account_access_changed"])
        self.assertFalse(item["reset_token_issued"])
        self.assertTrue(item["requires_secure_instance_connector"])
        self.assertEqual(self.client.get(self.path()).json()["total"], 1)
        with self.factory() as db:
            self.assertEqual(db.query(OwnerBossRecoveryEvent).count(), 1)
            self.assertEqual(db.query(OwnerCompanyEvent).filter(OwnerCompanyEvent.event_type == "BOSS_RECOVERY").count(), 1)

    def test_empty_or_invalid_fields_cannot_create_case(self):
        self.login(); self.company()
        for payload in (
            self.payload(reason="EMAIL_ME_PASSWORD"),
            self.payload(requester_role="ADMIN"),
            self.payload(requester_email="not-email"),
            {**self.payload(), "password": "tempting-secret"},
        ):
            self.assertEqual(self.client.post(self.path(), json=payload, headers=self.headers()).status_code, 422)
        self.assertEqual(self.client.get(self.path()).json()["total"], 0)

    def test_registered_contacts_must_match_exactly(self):
        self.login(); self.company()
        bad_boss = self.create(requester_role="BOSS", requester_email="other@example.com")
        self.assertEqual(bad_boss.status_code, 422)
        bad_contact = self.create(requester_email="other@example.com")
        self.assertEqual(bad_contact.status_code, 422)
        self.assertEqual(self.create(requester_role="BOSS", requester_email="BOSS@EXAMPLE.COM").status_code, 201)

    def test_no_registered_recovery_contact_requires_legal_representative_process(self):
        self.login(); self.company(recovery=None)
        self.assertEqual(self.create().status_code, 422)
        response = self.create(requester_role="LEGAL_REPRESENTATIVE", requester_email="new-director@example.com")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "OPEN")

    def test_only_one_unresolved_case_per_company(self):
        self.login(); self.company()
        self.case()
        self.assertEqual(self.create().status_code, 409)
        self.assertEqual(self.client.get(self.path()).json()["total"], 1)

    def test_cross_company_case_id_and_missing_company_denied(self):
        self.login(); first = self.company(); case_id = self.case()
        second = self.company(slug="second-demo-company")
        self.assertEqual(self.client.get(self.path(second) + f"/{case_id}").status_code, 404)
        self.assertEqual(self.client.post(self.path(second)+f"/{case_id}/verify", json=self.verify_payload(), headers=self.headers()).status_code, 404)
        self.assertEqual(self.client.get(ROOT+"/99999/boss-recovery").status_code, 404)
        self.assertEqual(self.client.get(self.path(first)+f"/{case_id}").status_code, 200)

    def test_verification_all_three_checks_required(self):
        self.login(); self.company(); case_id = self.case()
        for key in ("independent_identity_checked", "legal_company_authority_checked", "company_contact_checked"):
            response = self.verify(case_id, **{key: False})
            self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.get(self.path()+f"/{case_id}").json()["status"], "OPEN")

    def test_evidence_reference_cannot_store_unstructured_secrets(self):
        self.login(); self.company(); case_id = self.case()
        for ref in ("123", "ID Card Number 123", "PASSWORD=hidden", "OTP:123456", "a"*81):
            self.assertEqual(self.verify(case_id, evidence_reference=ref).status_code, 422)
        self.assertEqual(self.verify(case_id).status_code, 200)

    def test_lost_email_requires_signed_authorization(self):
        self.login(); self.company(); case_id = self.case(reason="LOST_EMAIL_OR_OTP")
        self.assertEqual(self.verify(case_id, method="INDEPENDENT_CONTACT_AND_RECORD_CHECK").status_code, 422)
        self.assertEqual(self.verify(case_id).json()["status"], "VERIFIED")

    def test_boss_replacement_and_legal_rep_require_signed_authorization(self):
        self.login(); self.company()
        case_id = self.case(reason="BOSS_REPLACEMENT", requester_role="LEGAL_REPRESENTATIVE", requester_email="director@example.com")
        self.assertEqual(self.verify(case_id, method="INDEPENDENT_CONTACT_AND_RECORD_CHECK").status_code, 422)
        self.assertEqual(self.verify(case_id).status_code, 200)

    def test_verification_has_audit_history_and_no_reverification(self):
        self.login(); self.company(); case_id = self.case()
        self.assertEqual(self.verify(case_id).json()["status"], "VERIFIED")
        self.assertEqual(self.verify(case_id).status_code, 409)
        history = self.client.get(self.path()+f"/{case_id}/history").json()["items"]
        self.assertEqual([e["type"] for e in history], ["OPENED_UNVERIFIED", "OWNER_RECORDED_VERIFICATION"])

    def test_approval_requires_verification_and_explicit_acknowledgment(self):
        self.login(); self.company(); case_id = self.case()
        self.assertEqual(self.approve(case_id).status_code, 409)
        self.verify(case_id)
        for key in ("review_completed", "understand_no_customer_account_is_changed"):
            self.assertEqual(self.approve(case_id, **{key: False}).status_code, 422)
        approved = self.approve(case_id)
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["status"], "READY_PENDING_CONNECTOR")
        self.assertFalse(approved.json()["account_access_changed"])
        self.assertFalse(approved.json()["reset_token_issued"])
        self.assertEqual(self.approve(case_id).status_code, 409)

    def test_rejection_reopens_future_request_but_records_history(self):
        self.login(); self.company(); case_id = self.case()
        reject = self.client.post(self.path()+f"/{case_id}/reject", json={"decision_code": "INSUFFICIENT_PROOF"}, headers=self.headers())
        self.assertEqual(reject.status_code, 200, reject.text)
        self.assertEqual(reject.json()["status"], "REJECTED")
        self.assertEqual(self.create().status_code, 201)
        old_history = self.client.get(self.path()+f"/{case_id}/history").json()["items"]
        self.assertEqual(len(old_history), 2)

    def test_approved_case_can_be_revoked_but_not_executed(self):
        self.login(); self.company(); case_id = self.case()
        self.verify(case_id); self.approve(case_id)
        rejected = self.client.post(self.path()+f"/{case_id}/reject", json={"decision_code": "FRAUD_RISK"}, headers=self.headers())
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(rejected.json()["status"], "REJECTED")
        self.assertEqual(self.approve(case_id).status_code, 409)
        self.assertEqual(self.client.post(self.path()+f"/{case_id}/execute", json={}, headers=self.headers()).status_code, 404)

    def test_pagination_and_owner_logout(self):
        self.login(); self.company(); case_id = self.case()
        for suffix in ("?limit=51", "?offset=-1"):
            self.assertEqual(self.client.get(self.path()+suffix).status_code, 422)
        self.assertEqual(self.client.post("/api/owner/auth/logout", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.get(self.path()).status_code, 401)
        self.assertEqual(self.client.get(self.path()+f"/{case_id}/history").status_code, 401)


if __name__ == "__main__":
    unittest.main()
