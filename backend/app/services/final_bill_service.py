from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.final_bill import FinalBill
from app.models.final_bill_item import FinalBillItem
from app.models.finished_goods_receipt import FinishedGoodsReceipt
from app.models.product import Product
from app.models.production_order import ProductionOrder
from app.models.proforma import Proforma
from app.schemas.final_bill import (
    FinalBillItemUpdate,
    FinalBillUpdate,
)


class FinalBillService:

    # ============================================================
    # DECIMAL HELPERS
    # ============================================================

    @staticmethod
    def decimal(value) -> Decimal:
        return Decimal(
            str(
                value
                or Decimal("0.00")
            )
        )

    @staticmethod
    def money(value) -> Decimal:
        return (
            FinalBillService
            .decimal(value)
            .quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
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
    # CALCULATE ITEM TOTALS
    # ============================================================

    @staticmethod
    def calculate_item_totals(
        item: FinalBillItem,
    ) -> None:

        quantity = (
            FinalBillService.decimal(
                item.quantity
            )
        )

        unit_price = (
            FinalBillService.decimal(
                item.unit_price
            )
        )

        discount_percent = (
            FinalBillService.decimal(
                item.discount_percent
            )
        )

        gst_percent = (
            FinalBillService.decimal(
                item.gst_percent
            )
        )

        if quantity <= Decimal("0.00"):
            raise ValueError(
                "Final Bill item quantity "
                "must be greater than zero."
            )

        if unit_price < Decimal("0.00"):
            raise ValueError(
                "Unit price cannot be negative."
            )

        if (
            discount_percent
            < Decimal("0.00")
            or discount_percent
            > Decimal("100.00")
        ):
            raise ValueError(
                "Discount percentage must be "
                "between 0 and 100."
            )

        if (
            gst_percent
            < Decimal("0.00")
            or gst_percent
            > Decimal("100.00")
        ):
            raise ValueError(
                "GST percentage must be "
                "between 0 and 100."
            )

        gross_amount = (
            quantity
            * unit_price
        )

        discount_amount = (
            gross_amount
            * discount_percent
            / Decimal("100.00")
        )

        taxable_amount = (
            gross_amount
            - discount_amount
        )

        tax_amount = (
            taxable_amount
            * gst_percent
            / Decimal("100.00")
        )

        line_total = (
            taxable_amount
            + tax_amount
        )

        item.discount_amount = (
            FinalBillService.money(
                discount_amount
            )
        )

        item.taxable_amount = (
            FinalBillService.money(
                taxable_amount
            )
        )

        # GST split will be implemented after
        # company GST state configuration exists.
        item.cgst_amount = Decimal(
            "0.00"
        )
        item.sgst_amount = Decimal(
            "0.00"
        )
        item.igst_amount = Decimal(
            "0.00"
        )

        item.tax_amount = (
            FinalBillService.money(
                tax_amount
            )
        )

        item.line_total = (
            FinalBillService.money(
                line_total
            )
        )

    # ============================================================
    # RECALCULATE FINAL BILL TOTALS
    # ============================================================

    @staticmethod
    def recalculate_bill_totals(
        db: Session,
        final_bill: FinalBill,
    ) -> None:

        items = (
            db.query(FinalBillItem)
            .filter(
                FinalBillItem.final_bill_id
                == final_bill.id
            )
            .all()
        )

        if not items:
            raise ValueError(
                "Final Bill must contain "
                "at least one item."
            )

        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        taxable_total = Decimal("0.00")
        cgst_total = Decimal("0.00")
        sgst_total = Decimal("0.00")
        igst_total = Decimal("0.00")
        tax_total = Decimal("0.00")
        grand_total = Decimal("0.00")

        for item in items:

            subtotal += (
                FinalBillService.decimal(
                    item.quantity
                )
                * FinalBillService.decimal(
                    item.unit_price
                )
            )

            discount_total += (
                FinalBillService.decimal(
                    item.discount_amount
                )
            )

            taxable_total += (
                FinalBillService.decimal(
                    item.taxable_amount
                )
            )

            cgst_total += (
                FinalBillService.decimal(
                    item.cgst_amount
                )
            )

            sgst_total += (
                FinalBillService.decimal(
                    item.sgst_amount
                )
            )

            igst_total += (
                FinalBillService.decimal(
                    item.igst_amount
                )
            )

            tax_total += (
                FinalBillService.decimal(
                    item.tax_amount
                )
            )

            grand_total += (
                FinalBillService.decimal(
                    item.line_total
                )
            )

        final_bill.subtotal = (
            FinalBillService.money(
                subtotal
            )
        )

        final_bill.discount_amount = (
            FinalBillService.money(
                discount_total
            )
        )

        final_bill.taxable_amount = (
            FinalBillService.money(
                taxable_total
            )
        )

        final_bill.cgst_amount = (
            FinalBillService.money(
                cgst_total
            )
        )

        final_bill.sgst_amount = (
            FinalBillService.money(
                sgst_total
            )
        )

        final_bill.igst_amount = (
            FinalBillService.money(
                igst_total
            )
        )

        final_bill.tax_amount = (
            FinalBillService.money(
                tax_total
            )
        )

        final_bill.grand_total = (
            FinalBillService.money(
                grand_total
            )
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
                subtotal=Decimal("0.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("0.00"),
                cgst_amount=Decimal("0.00"),
                sgst_amount=Decimal("0.00"),
                igst_amount=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                grand_total=Decimal("0.00"),
                invoice_type="Tax Invoice",
                status="Draft",
                revision_number=0,
                parent_invoice_id=None,
                created_by=created_by,
            )

            db.add(
                final_bill
            )

            db.flush()

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

                gst_percent = (
                    FinalBillService.decimal(
                        proforma_item.tax_percent
                    )
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
                        product.hsn_code
                        if product
                        else None
                    ),
                    quantity=quantity,
                    unit=(
                        proforma_item.unit
                    ),
                    unit_price=unit_price,
                    discount_percent=(
                        discount_percent
                    ),
                    discount_amount=Decimal(
                        "0.00"
                    ),
                    taxable_amount=Decimal(
                        "0.00"
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
                    tax_amount=Decimal(
                        "0.00"
                    ),
                    line_total=Decimal(
                        "0.00"
                    ),
                )

                FinalBillService.calculate_item_totals(
                    final_item
                )

                db.add(
                    final_item
                )

            db.flush()

            FinalBillService.recalculate_bill_totals(
                db=db,
                final_bill=final_bill,
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
    # UPDATE DRAFT FINAL BILL HEADER
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
    # UPDATE DRAFT FINAL BILL ITEM
    # ============================================================

    @staticmethod
    def update_draft_item(
        db: Session,
        final_bill_id: int,
        item_id: int,
        data: FinalBillItemUpdate,
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

            final_item = (
                db.query(FinalBillItem)
                .filter(
                    FinalBillItem.id
                    == item_id,
                    FinalBillItem.final_bill_id
                    == final_bill.id,
                )
                .with_for_update()
                .first()
            )

            if final_item is None:
                raise ValueError(
                    "Final Bill item not found."
                )

            update_data = (
                data.model_dump(
                    exclude_unset=True
                )
            )

            editable_fields = {
                "description",
                "hsn_code",
                "quantity",
                "unit",
                "unit_price",
                "discount_percent",
                "gst_percent",
            }

            for (
                field_name,
                value,
            ) in update_data.items():

                if (
                    field_name
                    not in editable_fields
                ):
                    continue

                if (
                    field_name
                    in {
                        "quantity",
                        "unit_price",
                        "discount_percent",
                        "gst_percent",
                    }
                    and value is None
                ):
                    raise ValueError(
                        f"{field_name} cannot be empty."
                    )

                setattr(
                    final_item,
                    field_name,
                    value,
                )

            if not (
                final_item.description
                or ""
            ).strip():
                raise ValueError(
                    "Item description is required."
                )

            FinalBillService.calculate_item_totals(
                final_item
            )

            db.flush()

            FinalBillService.recalculate_bill_totals(
                db=db,
                final_bill=final_bill,
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
    # ISSUE FINAL BILL
    # ============================================================

    @staticmethod
    def issue_final_bill(
        db: Session,
        final_bill_id: int,
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
                    "can be issued."
                )

            if not (
                final_bill.company_name
                or ""
            ).strip():
                raise ValueError(
                    "Company name is required "
                    "before issuing the Final Bill."
                )

            if final_bill.invoice_date is None:
                raise ValueError(
                    "Invoice date is required "
                    "before issuing the Final Bill."
                )

            items = (
                db.query(FinalBillItem)
                .filter(
                    FinalBillItem.final_bill_id
                    == final_bill.id
                )
                .all()
            )

            if not items:
                raise ValueError(
                    "Final Bill cannot be issued "
                    "without items."
                )

            for item in items:

                if not (
                    item.description
                    or ""
                ).strip():
                    raise ValueError(
                        "Every Final Bill item must "
                        "have a description."
                    )

                FinalBillService.calculate_item_totals(
                    item
                )

            db.flush()

            FinalBillService.recalculate_bill_totals(
                db=db,
                final_bill=final_bill,
            )

            final_bill.status = "Issued"

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
    # CREATE REVISED FINAL BILL
    # ============================================================

    @staticmethod
    def create_revision(
        db: Session,
        final_bill_id: int,
        created_by: int,
        invoice_date: date | None = None,
        notes: str | None = None,
    ) -> FinalBill:

        try:

            # ====================================================
            # SOURCE INVOICE
            # ====================================================

            source_bill = (
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
                .with_for_update()
                .first()
            )

            if source_bill is None:
                raise ValueError(
                    "Final Bill not found."
                )

            if (
                source_bill.status
                or ""
            ).strip().lower() != "issued":
                raise ValueError(
                    "Only Issued Final Bills "
                    "can be revised."
                )

            if not source_bill.items:
                raise ValueError(
                    "Final Bill cannot be revised "
                    "because it has no items."
                )

            # ====================================================
            # ROOT INVOICE
            # ====================================================

            root_invoice_id = (
                source_bill.parent_invoice_id
                or source_bill.id
            )

            root_bill = (
                db.query(FinalBill)
                .filter(
                    FinalBill.id
                    == root_invoice_id
                )
                .first()
            )

            if root_bill is None:
                raise ValueError(
                    "Original Final Bill not found."
                )

            # ====================================================
            # BLOCK MULTIPLE OPEN DRAFT REVISIONS
            # ====================================================

            existing_draft_revision = (
                db.query(FinalBill)
                .filter(
                    FinalBill.parent_invoice_id
                    == root_invoice_id,
                    FinalBill.status
                    == "Draft",
                )
                .first()
            )

            if existing_draft_revision:
                raise ValueError(
                    "A Draft revised invoice "
                    "already exists for this Final Bill."
                )

            # ====================================================
            # NEXT REVISION NUMBER
            # ====================================================

            revisions = (
                db.query(FinalBill)
                .filter(
                    FinalBill.parent_invoice_id
                    == root_invoice_id
                )
                .all()
            )

            highest_revision = max(
                [
                    bill.revision_number
                    for bill in revisions
                ]
                or [0]
            )

            next_revision_number = (
                highest_revision
                + 1
            )

            # ====================================================
            # REVISION INVOICE NUMBER
            # ====================================================

            revision_invoice_number = (
                f"{root_bill.invoice_number}"
                f"-R{next_revision_number}"
            )

            duplicate_number = (
                db.query(FinalBill)
                .filter(
                    FinalBill.invoice_number
                    == revision_invoice_number
                )
                .first()
            )

            if duplicate_number:
                raise ValueError(
                    "Generated revised invoice "
                    "number already exists."
                )

            revision_invoice_date = (
                invoice_date
                or date.today()
            )

            # ====================================================
            # CREATE REVISION HEADER
            # ====================================================

            revised_bill = FinalBill(
                invoice_number=(
                    revision_invoice_number
                ),
                invoice_date=(
                    revision_invoice_date
                ),
                proforma_id=(
                    source_bill.proforma_id
                ),
                customer_id=(
                    source_bill.customer_id
                ),
                company_name=(
                    source_bill.company_name
                ),
                contact_person=(
                    source_bill.contact_person
                ),
                phone=(
                    source_bill.phone
                ),
                email=(
                    source_bill.email
                ),
                gst_number=(
                    source_bill.gst_number
                ),
                billing_address=(
                    source_bill.billing_address
                ),
                shipping_address=(
                    source_bill.shipping_address
                ),
                payment_terms=(
                    source_bill.payment_terms
                ),
                delivery_terms=(
                    source_bill.delivery_terms
                ),
                notes=(
                    notes
                    if notes is not None
                    else source_bill.notes
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
                    "Revised Invoice"
                ),
                status="Draft",
                revision_number=(
                    next_revision_number
                ),
                parent_invoice_id=(
                    root_invoice_id
                ),
                created_by=created_by,
            )

            db.add(
                revised_bill
            )

            db.flush()

            # ====================================================
            # COPY ITEMS
            # ====================================================

            for source_item in (
                source_bill.items
            ):

                revised_item = FinalBillItem(
                    final_bill_id=(
                        revised_bill.id
                    ),
                    product_id=(
                        source_item.product_id
                    ),
                    description=(
                        source_item.description
                    ),
                    hsn_code=(
                        source_item.hsn_code
                    ),
                    quantity=(
                        source_item.quantity
                    ),
                    unit=(
                        source_item.unit
                    ),
                    unit_price=(
                        source_item.unit_price
                    ),
                    discount_percent=(
                        source_item.discount_percent
                    ),
                    discount_amount=Decimal(
                        "0.00"
                    ),
                    taxable_amount=Decimal(
                        "0.00"
                    ),
                    gst_percent=(
                        source_item.gst_percent
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
                    line_total=Decimal(
                        "0.00"
                    ),
                )

                FinalBillService.calculate_item_totals(
                    revised_item
                )

                db.add(
                    revised_item
                )

            db.flush()

            # ====================================================
            # RECALCULATE REVISION TOTALS
            # ====================================================

            FinalBillService.recalculate_bill_totals(
                db=db,
                final_bill=revised_bill,
            )

            # ====================================================
            # SINGLE TRANSACTION
            # ====================================================

            db.commit()

            return (
                FinalBillService
                .get_by_id(
                    db=db,
                    final_bill_id=(
                        revised_bill.id
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