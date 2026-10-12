"""International billing: isolated records with frozen finished-product costs.

Never writes to FinishedProduct, domestic FinalBill, stock, GST, or accounting.
No report aggregates these invoices into domestic revenue/profit.
"""

from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.finished_product import FinishedProduct
from app.models.international_bill import InternationalBill, InternationalBillItem
from app.schemas.international_bill import InternationalBillCreate


CENT = Decimal("0.01")
HUNDRED = Decimal("100")


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


class InternationalBillService:
    @staticmethod
    def list_finished_products(db: Session):
        """Expose only produced goods and cost snapshots to this module."""
        products = (
            db.query(FinishedProduct)
            .options(joinedload(FinishedProduct.finished_goods_receipt))
            .order_by(FinishedProduct.id.desc())
            .all()
        )
        return [
            {
                "id": item.id,
                "finished_product_number": item.finished_product_number,
                "product_name": item.product_name,
                "unit": item.unit,
                "quantity_produced": item.finished_goods_receipt.quantity_received,
                "unit_cost": item.unit_cost,
                "has_cost_snapshot": item.cost_snapshot_at is not None,
            }
            for item in products
        ]

    @staticmethod
    def _create_item(db: Session, data):
        product = None
        if data.finished_product_id is not None:
            product = db.get(FinishedProduct, data.finished_product_id)
            if product is None:
                raise ValueError("Selected finished product no longer exists.")
            if product.cost_snapshot_at is None:
                raise ValueError(
                    f"Cost snapshot is missing for {product.finished_product_number}. "
                    "Complete production costing before billing it."
                )

        # Read-only production cost snapshot, never a client-provided override.
        unit_cost = product.unit_cost if product is not None else data.manual_unit_cost
        source = (
            "production_snapshot" if product is not None
            else "manual" if unit_cost is not None
            else "unknown"
        )
        subtotal = money(data.quantity * data.unit_price)
        discount = money(subtotal * data.discount_percent / HUNDRED)
        taxable = subtotal - discount
        tax = money(taxable * data.tax_percent / HUNDRED)

        return InternationalBillItem(
            finished_product_id=product.id if product is not None else None,
            finished_product_number=(
                product.finished_product_number if product is not None else None
            ),
            description=data.description,
            unit=data.unit,
            quantity=data.quantity,
            unit_price=data.unit_price,
            discount_percent=data.discount_percent,
            tax_percent=data.tax_percent,
            line_subtotal=subtotal,
            discount_amount=discount,
            taxable_amount=taxable,
            tax_amount=tax,
            line_total=taxable + tax,
            unit_cost=unit_cost,
            cost_amount=(money(data.quantity * unit_cost) if unit_cost is not None else None),
            cost_source=source,
        )

    @classmethod
    def create(cls, db: Session, data: InternationalBillCreate, user_id: int):
        # All amounts are computed by the server in the submitted bill currency.
        # Profit excludes tax and uses the MANUAL rate: 1 bill unit = N cost units.
        try:
            lines = [cls._create_item(db, item) for item in data.items]
            subtotal = sum((x.line_subtotal for x in lines), Decimal("0"))
            discount = sum((x.discount_amount for x in lines), Decimal("0"))
            taxable = sum((x.taxable_amount for x in lines), Decimal("0"))
            tax = sum((x.tax_amount for x in lines), Decimal("0"))
            sales_base = money(taxable * data.exchange_rate)
            all_costs_known = all(x.cost_amount is not None for x in lines)
            cost = (
                sum((x.cost_amount for x in lines), Decimal("0"))
                if all_costs_known else None
            )
            bill = InternationalBill(
                bill_number=f"INT-{data.bill_date.year}-{uuid4().hex[:12].upper()}",
                bill_date=data.bill_date,
                seller_name=data.seller_name,
                seller_address=data.seller_address,
                seller_contact=data.seller_contact,
                customer_name=data.customer_name,
                customer_country=data.customer_country,
                customer_address=data.customer_address,
                customer_contact=data.customer_contact,
                currency_code=data.currency_code,
                cost_currency_code=data.cost_currency_code,
                exchange_rate=data.exchange_rate,
                tax_label=data.tax_label,
                payment_terms=data.payment_terms,
                notes=data.notes,
                subtotal=subtotal,
                discount_amount=discount,
                taxable_amount=taxable,
                tax_amount=tax,
                grand_total=taxable + tax,
                sales_cost_currency=sales_base,
                cost_amount=cost,
                gross_profit=(sales_base - cost if cost is not None else None),
                created_by=user_id,
                items=lines,
            )
            db.add(bill)
            db.commit()
            return cls.get(db, bill.id)
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get(db: Session, bill_id: int):
        return (
            db.query(InternationalBill)
            .options(selectinload(InternationalBill.items))
            .filter(InternationalBill.id == bill_id)
            .first()
        )

    @staticmethod
    def list(db: Session, page: int, page_size: int):
        query = db.query(InternationalBill)
        total = query.count()
        items = (
            query.order_by(InternationalBill.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {"items": items, "total": total, "page": page, "page_size": page_size}
