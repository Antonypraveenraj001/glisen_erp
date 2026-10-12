"""Offline document-number tests; no ERP database is opened or modified."""

import unittest
from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import Mock

from app.models.business_settings import BusinessSettings
from app.services.enquiry_service import EnquiryService
from app.services.final_bill_service import FinalBillService
from app.services.finished_goods_receipt import FinishedGoodsReceiptService
from app.services.production import ProductionService
from app.services.proforma_service import ProformaService


def configured_db(settings=None, enquiry_numbers=None):
    """A fake Session that returns settings and existing Enquiry numbers."""
    db = Mock()
    settings_query = Mock()
    settings_query.first.return_value = settings
    enquiry_query = Mock()
    enquiry_query.filter.return_value = enquiry_query
    enquiry_query.all.return_value = [
        (number,) for number in (enquiry_numbers or [])
    ]
    db.query.side_effect = (
        lambda model: settings_query if model is BusinessSettings else enquiry_query
    )
    return db


class DocumentNumberSettingsTests(unittest.TestCase):
    def test_enquiry_defaults_when_settings_missing(self):
        db = configured_db()
        number = EnquiryService._generate_enquiry_number(db)
        self.assertEqual(number, f"ENQ-{datetime.now().year}-0001")

    def test_enquiry_custom_prefix_and_width_continue_highest_sequence(self):
        year = datetime.now().year
        settings = SimpleNamespace(enquiry_prefix="ENQ_X", sequence_digits=6)
        db = configured_db(
            settings,
            [
                f"ENQ_X-{year}-000012",
                f"ENQ_X-{year}-000009",
                f"ENQ_X-{year}-BAD",
                f"ENQ_Y-{year}-999999",
            ],
        )
        self.assertEqual(
            EnquiryService._generate_enquiry_number(db),
            f"ENQ_X-{year}-000013",
        )

    def test_proforma_prefix_change_and_three_digits(self):
        year = date.today().year
        service = ProformaService.__new__(ProformaService)
        service.db = configured_db(
            SimpleNamespace(proforma_prefix="QUOTE", sequence_digits=3)
        )
        service.repository = Mock()
        service.repository.get_all.return_value = [
            SimpleNamespace(proforma_number=f"QUOTE-{year}-015"),
            SimpleNamespace(proforma_number=f"QUOTE-{year}-007"),
            SimpleNamespace(proforma_number=f"PRO-{year}-9999"),
        ]
        self.assertEqual(
            service.generate_proforma_number(),
            f"QUOTE-{year}-016",
        )

    def test_production_custom_prefix_and_six_digits(self):
        year = datetime.utcnow().year
        service = ProductionService.__new__(ProductionService)
        service.db = configured_db(
            SimpleNamespace(production_prefix="WORK", sequence_digits=6)
        )
        service.production_order_repository = Mock()
        service.production_order_repository.get_all.return_value = [
            SimpleNamespace(production_number=f"WORK-{year}-000008"),
            SimpleNamespace(production_number=f"PROD-{year}-9999"),
        ]
        self.assertEqual(
            service._generate_production_number(),
            f"WORK-{year}-000009",
        )

    def test_finished_goods_receipt_keeps_production_order_id(self):
        year = datetime.utcnow().year
        service = FinishedGoodsReceiptService.__new__(FinishedGoodsReceiptService)
        service.db = configured_db(
            SimpleNamespace(finished_goods_receipt_prefix="FG", sequence_digits=6)
        )
        self.assertEqual(
            service._generate_receipt_number(42),
            f"FG-{year}-000042",
        )

    def test_invoice_generator_already_honors_prefix_and_width(self):
        db = configured_db(
            SimpleNamespace(invoice_prefix="BILL", sequence_digits=6)
        )
        invoice_query = Mock()
        invoice_query.filter.return_value = invoice_query
        invoice_query.all.return_value = [("INV-2025-0008",)]
        settings_query = Mock()
        settings_query.with_for_update.return_value = settings_query
        settings_query.first.return_value = SimpleNamespace(
            invoice_prefix="BILL", sequence_digits=6
        )
        db.query.side_effect = (
            lambda model: settings_query
            if model is BusinessSettings
            else invoice_query
        )
        self.assertEqual(
            FinalBillService.generate_invoice_number(db, date(2026, 10, 12)),
            "BILL-2026-000009",
        )

    def test_credit_note_keeps_invoice_link_and_skips_used_number(self):
        db = Mock()
        db.query.return_value.filter.return_value.first.side_effect = [
            object(),
            None,
        ]
        self.assertEqual(
            FinalBillService._next_credit_note_number(
                db, "INV-2026-0007", "CR"
            ),
            "INV-2026-0007-CR2",
        )

    def test_credit_note_default_format_is_backward_compatible(self):
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None
        self.assertEqual(
            FinalBillService._next_credit_note_number(
                db, "INV-2026-0007", "CN"
            ),
            "INV-2026-0007-CN1",
        )

    def test_credit_note_rejects_number_longer_than_database_field(self):
        db = Mock()
        with self.assertRaisesRegex(ValueError, "30-character database limit"):
            FinalBillService._next_credit_note_number(
                db, "INV-2026-0007", "LONGPREFIX1234567890"
            )


if __name__ == "__main__":
    unittest.main()
