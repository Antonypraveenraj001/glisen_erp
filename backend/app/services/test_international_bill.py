"""Offline international-bill tests. Uses only disposable SQLite tables."""

import unittest
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.models.international_bill import InternationalBill, InternationalBillItem
from app.schemas.international_bill import InternationalBillCreate
from app.services.international_bill_service import InternationalBillService


def bill_payload(items, currency="USD", cost_currency="INR", rate="85"):
    return InternationalBillCreate(
        bill_date=date(2026, 10, 12),
        seller_name="Seller", customer_name="Overseas Buyer",
        customer_country="Japan", currency_code=currency,
        cost_currency_code=cost_currency,
        exchange_rate=Decimal(rate), tax_label="VAT",
        items=items,
    )


def line(product_id=None, unit_cost=None, tax="0"):
    return {
        "finished_product_id": product_id,
        "description": "Finished machine" if product_id else "Packing charge",
        "unit": "Nos", "quantity": "2", "unit_price": "100.00",
        "discount_percent": "10", "tax_percent": tax,
        "manual_unit_cost": unit_cost,
    }


class InternationalBillTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        InternationalBill.__table__.create(self.engine)
        InternationalBillItem.__table__.create(self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_finished_product_cost_is_frozen_and_tax_is_not_profit(self):
        product = SimpleNamespace(
            id=12, finished_product_number="FGR-12",
            unit_cost=Decimal("1200.00"), cost_snapshot_at=datetime(2026, 4, 1),
        )
        with patch.object(self.db, "get", return_value=product):
            # Two x $100, 10% discount, 5% manual tax.
            result = InternationalBillService.create(
                self.db, bill_payload([line(product_id=12, tax="5")]), user_id=7,
            )

        self.assertEqual(result.taxable_amount, Decimal("180.00"))
        self.assertEqual(result.tax_amount, Decimal("9.00"))
        self.assertEqual(result.grand_total, Decimal("189.00"))
        self.assertEqual(result.sales_cost_currency, Decimal("15300.00"))
        self.assertEqual(result.cost_amount, Decimal("2400.00"))
        self.assertEqual(result.gross_profit, Decimal("12900.00"))
        self.assertEqual(result.items[0].unit_cost, Decimal("1200.00"))
        self.assertEqual(result.items[0].finished_product_number, "FGR-12")
        self.assertEqual(result.items[0].cost_source, "production_snapshot")
        self.assertEqual(InternationalBillService.list(self.db, 1, 10)["total"], 1)

    def test_unknown_manual_cost_does_not_invent_profit(self):
        result = InternationalBillService.create(
            self.db, bill_payload([line()]), user_id=1,
        )
        self.assertIsNone(result.cost_amount)
        self.assertIsNone(result.gross_profit)
        self.assertEqual(result.items[0].cost_source, "unknown")

    def test_manual_cost_and_same_currency(self):
        result = InternationalBillService.create(
            self.db,
            bill_payload([line(unit_cost="30.00")], "EUR", "EUR", "1"),
            user_id=1,
        )
        self.assertEqual(result.cost_amount, Decimal("60.00"))
        self.assertEqual(result.gross_profit, Decimal("120.00"))

    def test_missing_snapshot_is_rejected_without_saving(self):
        product = SimpleNamespace(
            id=12, finished_product_number="FGR-12",
            unit_cost=Decimal("0"), cost_snapshot_at=None,
        )
        with patch.object(self.db, "get", return_value=product):
            with self.assertRaisesRegex(ValueError, "Cost snapshot is missing"):
                InternationalBillService.create(
                    self.db, bill_payload([line(product_id=12)]), user_id=1,
                )
        self.assertEqual(InternationalBillService.list(self.db, 1, 10)["total"], 0)

    def test_invalid_currency_and_cost_override_rejected(self):
        with self.assertRaises(ValidationError):
            bill_payload([line(unit_cost="20")], "US D")
        with self.assertRaises(ValidationError):
            bill_payload([line(unit_cost="20")], "USD", "USD", "85")
        with self.assertRaises(ValidationError):
            bill_payload([line(product_id=4, unit_cost="2")])

    def test_page_size_and_independent_numbering(self):
        for _ in range(6):
            InternationalBillService.create(
                self.db, bill_payload([line(unit_cost="5.00")]), user_id=1,
            )
        listing = InternationalBillService.list(self.db, page=2, page_size=5)
        self.assertEqual(listing["total"], 6)
        self.assertEqual(len(listing["items"]), 1)
        self.assertTrue(listing["items"][0].bill_number.startswith("INT-2026-"))


if __name__ == "__main__":
    unittest.main()
