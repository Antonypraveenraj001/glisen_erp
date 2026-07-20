from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.product_mapper import ProductMapper
from app.models.product import Product
from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.models.supplier import Supplier
from app.repositories.product_repository import ProductRepository
from app.repositories.purchase_bill_repository import (
    PurchaseBillRepository,
)
from app.repositories.supplier_repository import (
    SupplierRepository,
)
from app.schemas.purchase_bill_ai_confirm import (
    PurchaseBillAIConfirmRequest,
)


class PurchaseBillAIConfirmService:

    @staticmethod
    def confirm(
        db: Session,
        request: PurchaseBillAIConfirmRequest,
        created_by: int,
    ):

        try:

            existing_bill = (
                PurchaseBillRepository.get_by_bill_number(
                    db=db,
                    supplier_id=request.supplier.supplier_id or 0,
                    bill_number=request.purchase_bill.bill_number,
                )
            )

            if existing_bill:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Purchase Bill already exists.",
                )

            supplier_id = request.supplier.supplier_id

            if supplier_id is None:

                supplier = Supplier(
                    supplier_code=SupplierRepository.generate_supplier_code(
                        db,
                    ),
                    company_name=request.supplier.company_name,
                    contact_person=request.supplier.contact_person,
                    email=request.supplier.email,
                    phone=request.supplier.phone,
                    gst_number=request.supplier.gst_number,
                    address=request.supplier.address,
                    city=request.supplier.city,
                    state=request.supplier.state,
                    pincode=request.supplier.pincode,
                    created_by=created_by,
                )

                db.add(supplier)
                db.flush()

                supplier_id = supplier.id

            purchase_bill = PurchaseBill(
                bill_number=request.purchase_bill.bill_number,
                supplier_id=supplier_id,
                bill_date=datetime.strptime(
                    request.purchase_bill.bill_date,
                    "%d-%m-%Y",
                ),
                subtotal=request.purchase_bill.subtotal,
                total_gst=request.purchase_bill.total_gst,
                grand_total=request.purchase_bill.grand_total,
                remarks=request.purchase_bill.remarks,
                created_by=created_by,
            )

            db.add(purchase_bill)
            db.flush()

            for item in request.products:

                if item.quantity <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid quantity for {item.description}.",
                    )

                if item.purchase_price < 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid purchase price for {item.description}.",
                    )

                if item.gst_percentage < 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid GST percentage for {item.description}.",
                    )

                product = None

                if item.product_id:

                    product = db.get(
                        Product,
                        item.product_id,
                    )

                else:

                    # ----------------------------
                    # Duplicate Product Check
                    # ----------------------------

                    if item.hsn_code:

                        product = ProductRepository.get_by_hsn_code(
                            db=db,
                            hsn_code=item.hsn_code,
                        )

                    if (
                        product is None
                        and item.product_name
                    ):

                        product = ProductRepository.get_by_name(
                            db=db,
                            product_name=item.product_name,
                        )

                    if product is None:

                        product = Product(
                            product_code=ProductRepository.generate_product_code(
                                db,
                            ),
                            product_name=item.product_name,
                            description=item.description,
                            hsn_code=item.hsn_code,
                            unit=ProductMapper.get_unit(
                                item.unit,
                            ),
                            gst_percentage=item.gst_percentage,
                            purchase_price=item.purchase_price,
                            selling_price=0,
                            current_stock=0,
                            minimum_stock=0,
                            maximum_stock=0,
                            category=ProductMapper.get_category(
                                item.product_name,
                                item.description,
                            ),
                            created_by=created_by,
                        )

                        db.add(product)
                        db.flush()

                purchase_bill_item = PurchaseBillItem(
                    purchase_bill_id=purchase_bill.id,
                    product_id=product.id,
                    quantity=item.quantity,
                    purchase_price=item.purchase_price,
                    gst_percentage=item.gst_percentage,
                    line_total=item.line_total,
                    created_by=created_by,
                )

                db.add(purchase_bill_item)

                product.current_stock += item.quantity

            db.commit()
            db.refresh(purchase_bill)

            return purchase_bill

        except Exception:

            db.rollback()
            raise