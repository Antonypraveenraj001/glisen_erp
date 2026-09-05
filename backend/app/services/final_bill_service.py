from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.final_bill import FinalBill
from app.models.final_bill_item import FinalBillItem
from app.models.finished_goods_receipt import FinishedGoodsReceipt
from app.models.product import Product
from app.models.production_order import ProductionOrder
from app.models.proforma import Proforma
from app.schemas.final_bill import FinalBillUpdate


class FinalBillService:

    # ============================================================
    # DECIMAL HELPER
    # ============================================================

    @staticmethod
    def decimal(value) -> Decimal:
        return Decimal(
            str(
                value
                or Decimal("0.00")
            )
        )

    # ============================================================
    # INVOICE NUMBER
    # ============================================================

    @staticmethod
    def generate_invoice_number(
        proforma: Proforma,
        invoice_date: date,
    ) -> str:
        return (
            f"INV-{invoice_date.year}-"
            f"{proforma.id:05d}"
        )

    # ============================================================
    # ELIGIBILITY CHECK
    # ============================================================

    @staticmethod
    def validate_proforma_eligibility(
        db: Session,
        proforma: Proforma,
    ) -> None:

        production_orders = (
            db.query(ProductionOrder)
            .filter(
                ProductionOrder.proforma_id
                == proforma.id
            )
            .all()
        )

        if not production_orders:
            raise ValueError(
                "Final Bill cannot be created because "
                "this Proforma has no Production Orders."
            )

        incomplete_orders = [
            order
            for order in production_orders
            if (
                order.status
                or ""
            ).strip().lower()
            != "completed"
        ]

        if incomplete_orders:
            numbers = ", ".join(
                order.production_number
                for order in incomplete_orders
            )

            raise ValueError(
                "Final Bill cannot be created until "
                "all Production Orders are completed. "
                f"Incomplete: {numbers}"
            )

        for order in production_orders:

            receipt = (
                db.query(FinishedGoodsReceipt)
                .filter(
                    FinishedGoodsReceipt.production_order_id
                    == order.id
                )
                .first()
            )

            if receipt is None:
                raise ValueError(
                    "Final Bill cannot be created because "
                    "Finished Goods Receipt is missing for "
                    f"Production Order "
                    f"{order.production_number}."
                )

            received_quantity = (
                FinalBillService.decimal(
                    receipt.quantity_received
                )
            )

            production_quantity = (
                FinalBillService.decimal(
                    order.quantity
                )
            )

            if (
                received_quantity
                < production_quantity
            ):
                raise ValueError(
                    "Final Bill cannot be created because "
                    "Finished Goods quantity is incomplete "
                    f"for Production Order "
                    f"{order.production_number}."
                )

    # ============================================================
    # CREATE FROM PROFORMA
    # ============================================================

    @staticmethod
    def create_from_proforma(
        db: Session,
        proforma_id: int,
        created_by: int,
        invoice_date: date | None = None,
        notes: str | None = None,
    ) -> FinalBill:

        try:

            proforma = (
                db.query(Proforma)
                .options(
                    joinedload(
                        Proforma.items
                    )
                )
                .filter(
                    Proforma.id
                    == proforma_id
                )
                .with_for_update()
                .first()
            )

            if proforma is None:
                raise ValueError(
                    "Proforma not found."
                )

            existing_bill = (
                db.query(FinalBill)
                .filter(
                    FinalBill.proforma_id
                    == proforma.id,
                    FinalBill.parent_invoice_id
                    .is_(None),
                )
                .first()
            )

            if existing_bill:
                raise ValueError(
                    "A Final Bill already exists "
                    "for this Proforma."
                )

            customer = (
                db.query(Customer)
                .filter(
                    Customer.id
                    == proforma.customer_id,
                    Customer.is_active
                    == True,
                )
                .first()
            )

            if customer is None:
                raise ValueError(
                    "Active customer not found "
                    "for this Proforma."
                )

            if not proforma.items:
                raise ValueError(
                    "Final Bill cannot be created "
                    "because the Proforma has no items."
                )

            FinalBillService.validate_proforma_eligibility(
                db=db,
                proforma=proforma,
            )

            final_invoice_date = (
                invoice_date
                or date.today()
            )

            invoice_number = (
                FinalBillService
                .generate_invoice_number(
                    proforma=proforma,
                    invoice_date=(
                        final_invoice_date
                    ),
                )
            )

            duplicate_number = (
                db.query(FinalBill)
                .filter(
                    FinalBill.invoice_number
                    == invoice_number
                )
                .first()
            )

            if duplicate_number:
                raise ValueError(
                    "Generated invoice number "
                    "already exists."
                )

            final_bill = FinalBill(
                invoice_number=(
                    invoice_number
                ),
                invoice_date=(
                    final_invoice_date
                ),
                proforma_id=(
                    proforma.id
                ),
                customer_id=(
                    customer.id
                ),
                company_name=(
                    proforma.company_name
                    or customer.company_name
                ),
                contact_person=(
                    proforma.contact_person
                    or customer.contact_person
                ),
                phone=(
                    proforma.phone
                    or customer.phone
                ),
                email=(
                    proforma.email
                    or customer.email
                ),
                gst_number=(
                    customer.gst_number
                ),
                billing_address=(
                    proforma.billing_address
                    or customer.address
                ),
                shipping_address=(
                    proforma.shipping_address
                    or customer.address
                ),
                payment_terms=(
                    proforma.payment_terms
                ),
                delivery_terms=(
                    proforma.delivery_terms
                ),
                notes=(
                    notes
                    if notes is not None
                    else proforma.notes
                ),
                subtotal=Decimal(
                    "0.00"
                ),
                discount_amount=Decimal(
                    "0.00"
                ),
                taxable_amount=Decimal(
                    "0.00"
                ),
                cgst_amount=Decimal(
                    "0.00"
                ),
                sgst_amount=Decimal(
                    "0.00"
                ),
                igst_amount=Decimal(
                    "0.00"
                ),
                tax_amount=Decimal(
                    "0.00"
                ),
                grand_total=Decimal(
                    "0.00"
                ),
                invoice_type=(
                    "Tax Invoice"
                ),
                status="Draft",
                revision_number=0,
                parent_invoice_id=None,
                created_by=created_by,
            )

            db.add(
                final_bill
            )

            db.flush()

            subtotal = Decimal(
                "0.00"
            )

            discount_total = Decimal(
                "0.00"
            )

            taxable_total = Decimal(
                "0.00"
            )

            tax_total = Decimal(
                "0.00"
            )

            grand_total = Decimal(
                "0.00"
            )

            for proforma_item in (
                proforma.items
            ):

                quantity = (
                    FinalBillService.decimal(
                        proforma_item.quantity
                    )
                )

                unit_price = (
                    FinalBillService.decimal(
                        proforma_item.unit_price
                    )
                )

                discount_percent = (
                    FinalBillService.decimal(
                        proforma_item
                        .discount_percent
                    )
                )

                discount_amount = (
                    FinalBillService.decimal(
                        proforma_item
                        .discount_amount
                    )
                )

                taxable_amount = (
                    FinalBillService.decimal(
                        proforma_item
                        .taxable_amount
                    )
                )

                gst_percent = (
                    FinalBillService.decimal(
                        proforma_item.tax_percent
                    )
                )

                tax_amount = (
                    FinalBillService.decimal(
                        proforma_item.tax_amount
                    )
                )

                line_total = (
                    FinalBillService.decimal(
                        proforma_item.line_total
                    )
                )

                if quantity <= Decimal(
                    "0.00"
                ):
                    raise ValueError(
                        "Final Bill item quantity "
                        "must be greater than zero."
                    )

                product = None

                if (
                    proforma_item.product_id
                    is not None
                ):
                    product = (
                        db.query(Product)
                        .filter(
                            Product.id
                            == proforma_item.product_id
                        )
                        .first()
                    )

                hsn_code = (
                    product.hsn_code
                    if product
                    else None
                )

                final_item = FinalBillItem(
                    final_bill_id=(
                        final_bill.id
                    ),
                    product_id=(
                        proforma_item.product_id
                    ),
                    description=(
                        proforma_item.description
                    ),
                    hsn_code=(
                        hsn_code
                    ),
                    quantity=(
                        quantity
                    ),
                    unit=(
                        proforma_item.unit
                    ),
                    unit_price=(
                        unit_price
                    ),
                    discount_percent=(
                        discount_percent
                    ),
                    discount_amount=(
                        discount_amount
                    ),
                    taxable_amount=(
                        taxable_amount
                    ),
                    gst_percent=(
                        gst_percent
                    ),
                    cgst_amount=Decimal(
                        "0.00"
                    ),
                    sgst_amount=Decimal(
                        "0.00"
                    ),
                    igst_amount=Decimal(
                        "0.00"
                    ),
                    tax_amount=(
                        tax_amount
                    ),
                    line_total=(
                        line_total
                    ),
                )

                db.add(
                    final_item
                )

                subtotal += (
                    quantity
                    * unit_price
                )

                discount_total += (
                    discount_amount
                )

                taxable_total += (
                    taxable_amount
                )

                tax_total += (
                    tax_amount
                )

                grand_total += (
                    line_total
                )

            final_bill.subtotal = (
                subtotal.quantize(
                    Decimal("0.01")
                )
            )

            final_bill.discount_amount = (
                discount_total.quantize(
                    Decimal("0.01")
                )
            )

            final_bill.taxable_amount = (
                taxable_total.quantize(
                    Decimal("0.01")
                )
            )

            final_bill.tax_amount = (
                tax_total.quantize(
                    Decimal("0.01")
                )
            )

            final_bill.grand_total = (
                grand_total.quantize(
                    Decimal("0.01")
                )
            )

            db.commit()

            db.refresh(
                final_bill
            )

            return final_bill

        except Exception:
            db.rollback()
            raise

    # ============================================================
    # UPDATE DRAFT FINAL BILL
    # ============================================================

    @staticmethod
    def update_draft(
        db: Session,
        final_bill_id: int,
        data: FinalBillUpdate,
    ) -> FinalBill:

        try:

            final_bill = (
                db.query(FinalBill)
                .filter(
                    FinalBill.id
                    == final_bill_id
                )
                .with_for_update()
                .first()
            )

            if final_bill is None:
                raise ValueError(
                    "Final Bill not found."
                )

            if (
                final_bill.status
                or ""
            ).strip().lower() != "draft":
                raise ValueError(
                    "Only Draft Final Bills "
                    "can be edited."
                )

            update_data = (
                data.model_dump(
                    exclude_unset=True
                )
            )

            if (
                "invoice_date"
                in update_data
                and update_data[
                    "invoice_date"
                ]
                is None
            ):
                raise ValueError(
                    "Invoice date cannot be empty."
                )

            allowed_fields = {
                "invoice_date",
                "company_name",
                "contact_person",
                "phone",
                "email",
                "gst_number",
                "billing_address",
                "shipping_address",
                "payment_terms",
                "delivery_terms",
                "notes",
            }

            for (
                field_name,
                value,
            ) in update_data.items():

                if (
                    field_name
                    in allowed_fields
                ):
                    setattr(
                        final_bill,
                        field_name,
                        value,
                    )

            if not (
                final_bill.company_name
                or ""
            ).strip():
                raise ValueError(
                    "Company name is required."
                )

            db.commit()

            return (
                FinalBillService
                .get_by_id(
                    db=db,
                    final_bill_id=(
                        final_bill.id
                    ),
                )
            )

        except Exception:
            db.rollback()
            raise

    # ============================================================
    # GET BY ID
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        final_bill_id: int,
    ) -> FinalBill | None:

        return (
            db.query(FinalBill)
            .options(
                joinedload(
                    FinalBill.items
                )
            )
            .filter(
                FinalBill.id
                == final_bill_id
            )
            .first()
        )

    # ============================================================
    # LIST
    # ============================================================

    @staticmethod
    def get_all(
        db: Session,
    ) -> list[FinalBill]:

        return (
            db.query(FinalBill)
            .options(
                joinedload(
                    FinalBill.items
                )
            )
            .order_by(
                FinalBill.invoice_date.desc(),
                FinalBill.id.desc(),
            )
            .all()
        )