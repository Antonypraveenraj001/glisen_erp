"""Offline regression tests: isolated SQLite, never the configured ERP database."""

import unittest
from datetime import datetime
from decimal import Decimal
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import SimpleNamespace

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.models.product import Product
from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.models.purchase_bill_payment import PurchaseBillPayment
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.schemas.purchase_bill import PurchaseBillCreate
from app.services.purchase_bill_service import PurchaseBillService
from app.services.purchase_bill_ai_confirm_service import PurchaseBillAIConfirmService


def amount(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


class PurchaseBillCancellationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        for model in (
            Supplier, Product, PurchaseBill, PurchaseBillItem,
            PurchaseBillPayment, StockMovement,
        ):
            model.__table__.create(self.engine)

        self.db = Session(self.engine)
        self.supplier = Supplier(
            supplier_code="SUP-1", company_name="Supplier", contact_person="X",
            email="supplier@example.org", phone="123", gst_number="GST1",
            address="One road", city="City", state="State", pincode="123",
            created_by=1, is_active=True,
        )
        self.product = Product(
            product_code="PART-1", product_name="Bearing", description="",
            category="Parts", unit="Nos", hsn_code="123456", gst_percentage=18,
            purchase_price=35, selling_price=80, minimum_stock=0,
            maximum_stock=1000, current_stock=100, is_active=True,
        )
        self.db.add_all([self.supplier, self.product])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def create_bill(self, number, price, quantity=10):
        bill = PurchaseBillService.create(
            self.db,
            PurchaseBillCreate(
                bill_number=number, supplier_id=self.supplier.id,
                bill_date=datetime(2026, 10, 12), subtotal=amount(price * quantity),
                total_gst=0, grand_total=amount(price * quantity),
                items=[{
                    "product_id": self.product.id,
                    "quantity": str(quantity), "purchase_price": str(price),
                    "gst_percentage": "0", "line_total": str(price * quantity),
                }],
            ),
            created_by=1,
        )
        return bill.id

    def cancel(self, bill_id):
        return PurchaseBillService.deactivate(
            self.db, bill_id, cancelled_by=1,
        )

    def test_cancel_latest_restores_previous_active_price_and_stock(self):
        old = self.create_bill("BILL-OLD", 50)
        newest = self.create_bill("BILL-NEW", 60)
        self.assertEqual(amount(self.product.purchase_price), amount(60))
        result = self.cancel(newest)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.purchase_price), amount(50))
        self.assertEqual(amount(self.product.current_stock), amount(110))
        self.assertFalse(result.is_active)
        self.assertEqual(result.bill_number, "BILL-NEW")
        self.assertIsNone(result.active_bill_number)
        self.assertEqual(result.price_restore_warnings, [])
        self.assertEqual(self.db.query(StockMovement).filter(
            StockMovement.movement_type == "PURCHASE_REVERSAL_OUT"
        ).count(), 1)
        self.assertIsNotNone(PurchaseBillService.deactivate(
            self.db, old, cancelled_by=1,
        ))

    def test_cancel_last_purchase_restores_master_baseline(self):
        bill_id = self.create_bill("BILL-ONLY", 65)
        self.cancel(bill_id)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.purchase_price), amount(35))
        self.assertEqual(amount(self.product.current_stock), amount(100))

    def test_reuse_cancelled_number_keeps_audit_history(self):
        old_id = self.create_bill("REUSED-123", 60)
        self.cancel(old_id)
        replacement_id = self.create_bill("REUSED-123", 48)
        self.assertNotEqual(old_id, replacement_id)
        original = self.db.get(PurchaseBill, old_id)
        replacement = self.db.get(PurchaseBill, replacement_id)
        self.assertFalse(original.is_active)
        self.assertEqual(original.bill_number, "REUSED-123")
        self.assertIsNone(original.active_bill_number)
        self.assertTrue(replacement.is_active)
        self.assertEqual(replacement.active_bill_number, "REUSED-123")
        self.assertEqual(self.db.query(PurchaseBill).count(), 2)

        # The replacement can also be cancelled; multiple inactive rows
        # can retain the same original invoice number safely.
        self.cancel(replacement_id)
        self.assertEqual(self.db.query(PurchaseBill).filter(
            PurchaseBill.bill_number == "REUSED-123",
        ).count(), 2)

    def test_cancelling_older_bill_keeps_latest_active_price(self):
        old_id = self.create_bill("EARLIER", 50)
        self.create_bill("LATER", 60)
        self.cancel(old_id)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.purchase_price), amount(60))

    def test_two_lines_same_product_restore_last_other_bill_price(self):
        self.create_bill("EARLIER", 42)
        new_bill = PurchaseBillService.create(
            self.db,
            PurchaseBillCreate(
                bill_number="TWO-LINES", supplier_id=self.supplier.id,
                bill_date=datetime(2026, 10, 12), subtotal=125,
                total_gst=0, grand_total=125,
                items=[
                    {"product_id": self.product.id, "quantity": "1",
                     "purchase_price": "60", "gst_percentage": "0",
                     "line_total": "60"},
                    {"product_id": self.product.id, "quantity": "1",
                     "purchase_price": "65", "gst_percentage": "0",
                     "line_total": "65"},
                ],
            ),
            created_by=1,
        )
        self.assertEqual(amount(self.product.purchase_price), amount(65))
        result = self.cancel(new_bill.id)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.current_stock), amount(110))
        self.assertEqual(amount(self.product.purchase_price), amount(42))
        self.assertEqual(result.price_restore_warnings, [])
        movements = self.db.query(StockMovement).filter(
            StockMovement.movement_type == "PURCHASE_REVERSAL_OUT"
        ).count()
        self.assertEqual(movements, 2)

    def test_two_active_bills_cannot_share_a_number(self):
        self.create_bill("DUPLICATE", 60)
        # Preserve the original active-number uniqueness restriction.
        with self.assertRaises(HTTPException):
            self.create_bill("DUPLICATE", 65)

    def ai_confirm(self, number, product_id=None, name="New scan part"):
        request = SimpleNamespace(
            supplier=SimpleNamespace(
                supplier_id=self.supplier.id, gst_number=self.supplier.gst_number,
                company_name=self.supplier.company_name,
            ),
            purchase_bill=SimpleNamespace(
                bill_number=number, bill_date="12-10-2026", credit_days=0,
                subtotal=80, total_gst=0, grand_total=80, remarks="Scan",
            ),
            products=[SimpleNamespace(
                product_id=product_id, product_name=name,
                description="", hsn_code="123", unit="Nos", quantity=1,
                purchase_price=80, gst_percentage=0, line_total=80,
            )],
        )
        return PurchaseBillAIConfirmService.confirm(
            self.db, request, current_user_id=1,
        )

    def test_ai_confirmation_snapshots_price_on_existing_product(self):
        result = self.ai_confirm("AI-EXISTING", product_id=self.product.id)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.purchase_price), amount(80))
        self.cancel(result["purchase_bill_id"])
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.purchase_price), amount(35))

    def test_ai_new_product_cancel_restores_zero_without_false_cost(self):
        result = self.ai_confirm("AI-NEW")
        item = self.db.query(PurchaseBillItem).filter(
            PurchaseBillItem.purchase_bill_id == result["purchase_bill_id"]
        ).one()
        new_product = self.db.get(Product, item.product_id)
        self.assertEqual(amount(new_product.purchase_price), amount(80))
        self.assertEqual(amount(item.previous_purchase_price), amount(0))
        self.cancel(result["purchase_bill_id"])
        self.db.refresh(new_product)
        self.assertEqual(amount(new_product.purchase_price), amount(0))
        self.assertEqual(amount(new_product.current_stock), amount(0))

    def test_payment_blocks_cancel_and_stock_unchanged(self):
        bill_id = self.create_bill("PAID", 60)
        self.db.add(PurchaseBillPayment(
            purchase_bill_id=bill_id, payment_date=datetime(2026, 10, 12),
            amount=10, created_by=1,
        ))
        self.db.commit()
        with self.assertRaises(HTTPException):
            self.cancel(bill_id)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.current_stock), amount(110))
        self.assertEqual(amount(self.product.purchase_price), amount(60))
        self.assertTrue(self.db.get(PurchaseBill, bill_id).is_active)

    def test_insufficient_stock_blocks_cancel(self):
        bill_id = self.create_bill("USED-UP", 60)
        self.product.current_stock = Decimal("5.00")
        self.db.commit()
        with self.assertRaises(HTTPException):
            self.cancel(bill_id)
        self.assertEqual(amount(self.product.current_stock), amount(5))
        self.assertTrue(self.db.get(PurchaseBill, bill_id).is_active)

    def test_legacy_without_known_baseline_warns_and_keeps_price(self):
        # Simulates a Purchase Bill recorded before price snapshots existed.
        historical = PurchaseBill(
            bill_number="LEGACY", active_bill_number="LEGACY",
            supplier_id=self.supplier.id, bill_date=datetime(2025, 4, 1),
            created_by=1, is_active=True, subtotal=700, total_gst=0,
            grand_total=700,
        )
        self.db.add(historical)
        self.db.flush()
        self.db.add(PurchaseBillItem(
            purchase_bill_id=historical.id, product_id=self.product.id,
            quantity=10, purchase_price=70, previous_purchase_price=None,
            gst_percentage=0, line_total=700, created_by=1,
        ))
        self.product.current_stock = Decimal("110.00")
        self.product.purchase_price = Decimal("70.00")
        self.db.commit()
        result = self.cancel(historical.id)
        self.db.refresh(self.product)
        self.assertEqual(amount(self.product.current_stock), amount(100))
        self.assertEqual(amount(self.product.purchase_price), amount(70))
        self.assertEqual(len(result.price_restore_warnings), 1)


class PurchaseBillMigrationTests(unittest.TestCase):
    def test_migration_retains_cancelled_numbers_and_active_unique(self):
        # Simulate the pre-migration schema without connecting to ERP MySQL.
        engine = create_engine("sqlite://")
        metadata = sa.MetaData()
        bills = sa.Table(
            "purchase_bills", metadata,
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("bill_number", sa.String(100), nullable=False),
            sa.Column("is_active", sa.Boolean, nullable=False),
        )
        items = sa.Table(
            "purchase_bill_items", metadata,
            sa.Column("id", sa.Integer, primary_key=True),
        )
        sa.Index("ix_purchase_bills_bill_number", bills.c.bill_number, unique=True)
        metadata.create_all(engine)

        migration_path = (
            Path(__file__).resolve().parents[2] / "alembic" / "versions"
            / "v8w9x3y4b286_safe_purchase_cancellation.py"
        )
        spec = spec_from_file_location("purchase_cancellation_migration", migration_path)
        assert spec is not None and spec.loader is not None
        migration = module_from_spec(spec)
        spec.loader.exec_module(migration)
        with engine.begin() as connection:
            connection.execute(bills.insert(), [
                {"id": 1, "bill_number": "REUSE", "is_active": False},
                {"id": 2, "bill_number": "LIVE", "is_active": True},
            ])
            context = MigrationContext.configure(connection)
            with Operations.context(context):
                migration.upgrade()

            rows = connection.execute(sa.text(
                "SELECT id, bill_number, active_bill_number "
                "FROM purchase_bills ORDER BY id"
            )).all()
            self.assertEqual(rows, [(1, "REUSE", None), (2, "LIVE", "LIVE")])
            self.assertIn(
                "previous_purchase_price",
                {c["name"] for c in sa.inspect(connection).get_columns(items.name)},
            )
            indexes = {i["name"]: i for i in sa.inspect(connection).get_indexes(bills.name)}
            self.assertFalse(indexes["ix_purchase_bills_bill_number"]["unique"])
            self.assertTrue(indexes["ix_purchase_bills_active_bill_number"]["unique"])

            # A new active bill can use a cancelled historical number.
            connection.execute(sa.text(
                "INSERT INTO purchase_bills "
                "(id, bill_number, is_active, active_bill_number) "
                "VALUES (3, 'REUSE', 1, 'REUSE')"
            ))
            with self.assertRaises(sa.exc.IntegrityError):
                connection.execute(sa.text(
                    "INSERT INTO purchase_bills "
                    "(id, bill_number, is_active, active_bill_number) "
                    "VALUES (4, 'REUSE', 1, 'REUSE')"
                ))
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
