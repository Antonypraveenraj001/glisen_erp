from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.repositories.product_repository import ProductRepository
from app.repositories.purchase_bill_repository import PurchaseBillRepository
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.purchase_bill import (
    PurchaseBillCreate,
    PurchaseBillUpdate,
)


class PurchaseBillService:

    @staticmethod
    def create(
        db: Session,
        purchase_bill: PurchaseBillCreate,
        created_by: int,
    ):

        supplier = SupplierRepository.get_by_id(
            db,
            purchase_bill.supplier_id,
        )

        if supplier is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found.",
            )

        existing_bill = PurchaseBillRepository.get_by_bill_number(
            db=db,
            supplier_id=purchase_bill.supplier_id,
            bill_number=purchase_bill.bill_number,
        )

        if existing_bill:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Purchase Bill already exists for this supplier.",
            )

        db_purchase_bill = PurchaseBill(
            bill_number=purchase_bill.bill_number,
            supplier_id=purchase_bill.supplier_id,
            bill_date=purchase_bill.bill_date,
            subtotal=purchase_bill.subtotal,
            total_gst=purchase_bill.total_gst,
            grand_total=purchase_bill.grand_total,
            remarks=purchase_bill.remarks,
            created_by=created_by,
        )

        for item in purchase_bill.items:

            product = ProductRepository.get_by_id(
                db,
                item.product_id,
            )

            if product is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product ID {item.product_id} not found.",
                )

            db_purchase_bill.items.append(
                PurchaseBillItem(
                    product_id=item.product_id,
                    quantity=item.quantity,
                    purchase_price=item.purchase_price,
                    gst_percentage=item.gst_percentage,
                    line_total=item.line_total,
                )
            )

        saved_bill = PurchaseBillRepository.create(
            db,
            db_purchase_bill,
        )

        for item in purchase_bill.items:

            product = ProductRepository.get_by_id(
                db,
                item.product_id,
            )

            product.current_stock += item.quantity

            ProductRepository.update(
                db,
                product,
            )

        return saved_bill

    @staticmethod
    def update(
        db: Session,
        purchase_bill_id: int,
        purchase_bill: PurchaseBillUpdate,
    ):

        db_purchase_bill = PurchaseBillRepository.get_by_id(
            db,
            purchase_bill_id,
        )

        if db_purchase_bill is None:
            return None

        db_purchase_bill.bill_date = purchase_bill.bill_date
        db_purchase_bill.subtotal = purchase_bill.subtotal
        db_purchase_bill.total_gst = purchase_bill.total_gst
        db_purchase_bill.grand_total = purchase_bill.grand_total
        db_purchase_bill.remarks = purchase_bill.remarks

        return PurchaseBillRepository.update(
            db,
            db_purchase_bill,
        )

    @staticmethod
    def deactivate(
        db: Session,
        purchase_bill_id: int,
    ):

        return PurchaseBillRepository.deactivate(
            db,
            purchase_bill_id,
        )