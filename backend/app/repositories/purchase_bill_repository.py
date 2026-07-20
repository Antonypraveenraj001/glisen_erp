from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.models.supplier import Supplier


class PurchaseBillRepository:

    @staticmethod
    def create(
        db: Session,
        purchase_bill: PurchaseBill,
    ):
        db.add(purchase_bill)
        db.commit()
        db.refresh(purchase_bill)
        return purchase_bill

    @staticmethod
    def update(
        db: Session,
        purchase_bill: PurchaseBill,
    ):
        db.commit()
        db.refresh(purchase_bill)
        return purchase_bill

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):

        query = (
            db.query(PurchaseBill)
            .join(Supplier)
            .options(
                joinedload(PurchaseBill.items),
                joinedload(PurchaseBill.supplier),
            )
            .filter(
                PurchaseBill.is_active == True,
            )
        )

        if search:
            query = query.filter(
                or_(
                    PurchaseBill.bill_number.ilike(f"%{search}%"),
                    Supplier.company_name.ilike(f"%{search}%"),
                )
            )

        return (
            query.order_by(
                PurchaseBill.id.desc()
            ).all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        purchase_bill_id: int,
    ):
        return (
            db.query(PurchaseBill)
            .options(
                joinedload(PurchaseBill.items),
                joinedload(PurchaseBill.supplier),
            )
            .filter(
                PurchaseBill.id == purchase_bill_id,
                PurchaseBill.is_active == True,
            )
            .first()
        )

    @staticmethod
    def get_by_bill_number(
        db: Session,
        supplier_id: int,
        bill_number: str,
    ):
        return (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.supplier_id == supplier_id,
                PurchaseBill.bill_number == bill_number,
                PurchaseBill.is_active == True,
            )
            .first()
        )

    @staticmethod
    def deactivate(
        db: Session,
        purchase_bill_id: int,
    ):
        purchase_bill = (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.id == purchase_bill_id,
                PurchaseBill.is_active == True,
            )
            .first()
        )

        if purchase_bill is None:
            return None

        purchase_bill.is_active = False

        db.commit()
        db.refresh(purchase_bill)

        return purchase_bill

    @staticmethod
    def get_statistics(
        db: Session,
    ):

        total_purchase_bills = (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.is_active == True,
            )
            .count()
        )

        total_purchase_value = (
            db.query(
                func.coalesce(
                    func.sum(PurchaseBill.grand_total),
                    0,
                )
            )
            .filter(
                PurchaseBill.is_active == True,
            )
            .scalar()
        )

        total_quantity_purchased = (
            db.query(
                func.coalesce(
                    func.sum(PurchaseBillItem.quantity),
                    0,
                )
            )
            .join(PurchaseBill)
            .filter(
                PurchaseBill.is_active == True,
            )
            .scalar()
        )

        return {
            "total_purchase_bills": total_purchase_bills,
            "active_purchase_bills": total_purchase_bills,
            "total_purchase_value": total_purchase_value,
            "total_quantity_purchased": total_quantity_purchased,
        }