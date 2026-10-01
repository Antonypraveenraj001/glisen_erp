from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.final_bill import (
    FinalBill,
)

from app.models.final_bill_payment import (
    FinalBillPayment,
)

from app.models.proforma_payment import (
    ProformaPayment,
)

from app.models.proforma_payment_refund import (
    ProformaPaymentRefund,
)

from app.schemas.final_bill_payment import (
    FinalBillPaymentCreate,
)


class FinalBillPaymentService:

    # ============================================================
    # MONEY
    # ============================================================

    @staticmethod
    def money(
        value,
    ) -> Decimal:

        return Decimal(
            str(
                value
                or
                Decimal(
                    "0.00"
                )
            )
        ).quantize(
            Decimal(
                "0.01"
            ),
            rounding=(
                ROUND_HALF_UP
            ),
        )

    # ============================================================
    # ROOT INVOICE
    # ============================================================

    @staticmethod
    def get_root_invoice(
        db: Session,
        bill: FinalBill,
    ) -> FinalBill:

        invoice_type = (
            bill.invoice_type
            or
            ""
        ).strip().lower()

        if (
            invoice_type
            ==
            "revised invoice"
        ):

            if (
                bill.parent_invoice_id
                is None
            ):

                raise ValueError(
                    "Revised Invoice does not have "
                    "an Original Invoice reference."
                )

            root_bill = (
                db.query(
                    FinalBill
                )
                .filter(
                    FinalBill.id
                    ==
                    bill.parent_invoice_id
                )
                .first()
            )

            if (
                root_bill
                is None
            ):

                raise ValueError(
                    "Original Final Bill was not found."
                )

            return root_bill

        return bill

    # ============================================================
    # INVOICE CHAIN
    # ============================================================

    @staticmethod
    def get_invoice_chain(
        db: Session,
        root_bill: FinalBill,
    ) -> list[
        FinalBill
    ]:

        revisions = (
            db.query(
                FinalBill
            )
            .filter(
                FinalBill.parent_invoice_id
                ==
                root_bill.id,

                FinalBill.invoice_type
                ==
                "Revised Invoice",
            )
            .order_by(
                FinalBill.revision_number.asc(),
                FinalBill.id.asc(),
            )
            .all()
        )

        return [
            root_bill,
            *revisions,
        ]

    # ============================================================
    # EFFECTIVE ISSUED INVOICE
    # ============================================================

    @staticmethod
    def get_effective_invoice(
        invoice_chain:
            list[
                FinalBill
            ],
    ) -> FinalBill | None:

        issued_invoices = [
            bill
            for bill
            in invoice_chain
            if (
                (
                    bill.status
                    or
                    ""
                )
                .strip()
                .lower()
                ==
                "issued"
            )
        ]

        if (
            not issued_invoices
        ):
            return None

        return max(
            issued_invoices,
            key=lambda bill: (
                bill.revision_number,
                bill.id,
            ),
        )

    # ============================================================
    # CREDIT NOTE TOTAL
    # ============================================================

    @staticmethod
    def get_credit_note_total(
        db: Session,
        effective_invoice_id: int,
    ) -> Decimal:

        total = (
            db.query(
                func.coalesce(
                    func.sum(
                        FinalBill.grand_total
                    ),
                    0,
                )
            )
            .filter(
                FinalBill.parent_invoice_id
                ==
                effective_invoice_id,

                FinalBill.invoice_type
                ==
                "Credit Note",

                FinalBill.status
                ==
                "Issued",
            )
            .scalar()
        )

        return (
            FinalBillPaymentService
            .money(
                total
            )
        )

    # ============================================================
    # NET PROFORMA ADVANCE
    #
    # Gross advance received
    # -
    # Advance refunded
    # =
    # Advance still held by company
    #
    # Only NET advance is carried into Final Billing.
    # ============================================================

    @staticmethod
    def get_proforma_advance_total(
        db: Session,
        proforma_id: int,
    ) -> Decimal:

        advance_received = (
            db.query(
                func.coalesce(
                    func.sum(
                        ProformaPayment.amount
                    ),
                    0,
                )
            )
            .filter(
                ProformaPayment.proforma_id
                ==
                proforma_id
            )
            .scalar()
        )

        advance_refunded = (
            db.query(
                func.coalesce(
                    func.sum(
                        ProformaPaymentRefund.amount
                    ),
                    0,
                )
            )
            .filter(
                ProformaPaymentRefund.proforma_id
                ==
                proforma_id
            )
            .scalar()
        )

        received = (
            FinalBillPaymentService
            .money(
                advance_received
            )
        )

        refunded = (
            FinalBillPaymentService
            .money(
                advance_refunded
            )
        )

        net_advance = (
            received
            -
            refunded
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        if (
            net_advance
            <
            Decimal(
                "0.00"
            )
        ):

            return Decimal(
                "0.00"
            )

        return net_advance

    # ============================================================
    # FINAL BILL PAYMENTS
    # ============================================================

    @staticmethod
    def get_invoice_payment_total(
        db: Session,
        root_invoice_id: int,
    ) -> Decimal:

        total = (
            db.query(
                func.coalesce(
                    func.sum(
                        FinalBillPayment.amount
                    ),
                    0,
                )
            )
            .filter(
                FinalBillPayment.final_bill_id
                ==
                root_invoice_id
            )
            .scalar()
        )

        return (
            FinalBillPaymentService
            .money(
                total
            )
        )

    # ============================================================
    # TOTAL CUSTOMER MONEY RECEIVED
    # ============================================================

    @staticmethod
    def get_total_received(
        db: Session,
        root_bill: FinalBill,
    ) -> tuple[
        Decimal,
        Decimal,
        Decimal,
    ]:

        proforma_advance_amount = (
            FinalBillPaymentService
            .get_proforma_advance_total(
                db=db,
                proforma_id=(
                    root_bill.proforma_id
                ),
            )
        )

        invoice_payment_amount = (
            FinalBillPaymentService
            .get_invoice_payment_total(
                db=db,
                root_invoice_id=(
                    root_bill.id
                ),
            )
        )

        paid_amount = (
            proforma_advance_amount
            +
            invoice_payment_amount
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        return (
            proforma_advance_amount,
            invoice_payment_amount,
            paid_amount,
        )

    # ============================================================
    # PAYMENT STATUS
    # ============================================================

    @staticmethod
    def determine_payment_status(
        *,
        document_is_issued: bool,
        receivable_amount: Decimal,
        paid_amount: Decimal,
    ) -> str:

        if (
            not document_is_issued
        ):

            return (
                "Not Issued"
            )

        if (
            receivable_amount
            <=
            Decimal(
                "0.00"
            )
        ):

            return (
                "Paid"
            )

        if (
            paid_amount
            <=
            Decimal(
                "0.00"
            )
        ):

            return (
                "Pending"
            )

        if (
            paid_amount
            <
            receivable_amount
        ):

            return (
                "Partially Paid"
            )

        return (
            "Paid"
        )

    # ============================================================
    # PAYMENT SUMMARY
    # ============================================================

    @staticmethod
    def get_summary(
        db: Session,
        final_bill_id: int,
    ):

        bill = (
            db.query(
                FinalBill
            )
            .filter(
                FinalBill.id
                ==
                final_bill_id
            )
            .first()
        )

        if (
            bill
            is None
        ):
            return None

        invoice_type = (
            bill.invoice_type
            or
            ""
        ).strip().lower()

        # ========================================================
        # CREDIT NOTE
        # ========================================================

        if (
            invoice_type
            ==
            "credit note"
        ):

            return {
                "final_bill_id":
                    bill.id,

                "invoice_number":
                    bill.invoice_number,

                "effective_invoice_id":
                    None,

                "effective_invoice_number":
                    None,

                "is_effective_invoice":
                    False,

                "grand_total":
                    (
                        FinalBillPaymentService
                        .money(
                            bill.grand_total
                        )
                    ),

                "credit_note_total":
                    Decimal(
                        "0.00"
                    ),

                "receivable_amount":
                    Decimal(
                        "0.00"
                    ),

                "proforma_advance_amount":
                    Decimal(
                        "0.00"
                    ),

                "invoice_payment_amount":
                    Decimal(
                        "0.00"
                    ),

                "paid_amount":
                    Decimal(
                        "0.00"
                    ),

                "balance_amount":
                    Decimal(
                        "0.00"
                    ),

                "payment_status":
                    "N/A",

                "payments":
                    [],
            }

        # ========================================================
        # ROOT + REVISION CHAIN
        # ========================================================

        root_bill = (
            FinalBillPaymentService
            .get_root_invoice(
                db=db,
                bill=bill,
            )
        )

        invoice_chain = (
            FinalBillPaymentService
            .get_invoice_chain(
                db=db,
                root_bill=root_bill,
            )
        )

        effective_invoice = (
            FinalBillPaymentService
            .get_effective_invoice(
                invoice_chain
            )
        )

        # ========================================================
        # CUSTOMER MONEY
        # ========================================================

        (
            proforma_advance_amount,
            invoice_payment_amount,
            paid_amount,
        ) = (
            FinalBillPaymentService
            .get_total_received(
                db=db,
                root_bill=root_bill,
            )
        )

        payments = (
            db.query(
                FinalBillPayment
            )
            .filter(
                FinalBillPayment.final_bill_id
                ==
                root_bill.id
            )
            .order_by(
                FinalBillPayment.payment_date.asc(),
                FinalBillPayment.id.asc(),
            )
            .all()
        )

        # ========================================================
        # DRAFT / NO ISSUED INVOICE
        # ========================================================

        if (
            effective_invoice
            is None
        ):

            grand_total = (
                FinalBillPaymentService
                .money(
                    bill.grand_total
                )
            )

            receivable_amount = (
                grand_total
            )

            balance_amount = (
                receivable_amount
                -
                paid_amount
            ).quantize(
                Decimal(
                    "0.01"
                )
            )

            if (
                balance_amount
                <
                Decimal(
                    "0.00"
                )
            ):

                balance_amount = (
                    Decimal(
                        "0.00"
                    )
                )

            return {
                "final_bill_id":
                    bill.id,

                "invoice_number":
                    bill.invoice_number,

                "effective_invoice_id":
                    None,

                "effective_invoice_number":
                    None,

                "is_effective_invoice":
                    False,

                "grand_total":
                    grand_total,

                "credit_note_total":
                    Decimal(
                        "0.00"
                    ),

                "receivable_amount":
                    receivable_amount,

                "proforma_advance_amount":
                    proforma_advance_amount,

                "invoice_payment_amount":
                    invoice_payment_amount,

                "paid_amount":
                    paid_amount,

                "balance_amount":
                    balance_amount,

                "payment_status":
                    "Not Issued",

                "payments":
                    payments,
            }

        # ========================================================
        # EFFECTIVE INVOICE
        # ========================================================

        grand_total = (
            FinalBillPaymentService
            .money(
                effective_invoice.grand_total
            )
        )

        credit_note_total = (
            FinalBillPaymentService
            .get_credit_note_total(
                db=db,
                effective_invoice_id=(
                    effective_invoice.id
                ),
            )
        )

        receivable_amount = (
            grand_total
            -
            credit_note_total
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        if (
            receivable_amount
            <
            Decimal(
                "0.00"
            )
        ):

            receivable_amount = (
                Decimal(
                    "0.00"
                )
            )

        balance_amount = (
            receivable_amount
            -
            paid_amount
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        if (
            balance_amount
            <
            Decimal(
                "0.00"
            )
        ):

            balance_amount = (
                Decimal(
                    "0.00"
                )
            )

        requested_document_is_issued = (
            (
                bill.status
                or
                ""
            )
            .strip()
            .lower()
            ==
            "issued"
        )

        payment_status = (
            FinalBillPaymentService
            .determine_payment_status(
                document_is_issued=(
                    requested_document_is_issued
                ),

                receivable_amount=(
                    receivable_amount
                ),

                paid_amount=(
                    paid_amount
                ),
            )
        )

        return {
            "final_bill_id":
                bill.id,

            "invoice_number":
                bill.invoice_number,

            "effective_invoice_id":
                effective_invoice.id,

            "effective_invoice_number":
                effective_invoice.invoice_number,

            "is_effective_invoice":
                (
                    bill.id
                    ==
                    effective_invoice.id
                ),

            "grand_total":
                grand_total,

            "credit_note_total":
                credit_note_total,

            "receivable_amount":
                receivable_amount,

            "proforma_advance_amount":
                proforma_advance_amount,

            "invoice_payment_amount":
                invoice_payment_amount,

            "paid_amount":
                paid_amount,

            "balance_amount":
                balance_amount,

            "payment_status":
                payment_status,

            "payments":
                payments,
        }

    # ============================================================
    # RECORD FINAL BILL PAYMENT
    # ============================================================

    @staticmethod
    def create_payment(
        db: Session,
        final_bill_id: int,
        payment:
            FinalBillPaymentCreate,
        created_by: int,
    ):

        try:

            bill = (
                db.query(
                    FinalBill
                )
                .filter(
                    FinalBill.id
                    ==
                    final_bill_id
                )
                .with_for_update()
                .first()
            )

            if (
                bill
                is None
            ):

                raise ValueError(
                    "Final Bill not found."
                )

            invoice_type = (
                bill.invoice_type
                or
                ""
            ).strip().lower()

            if (
                invoice_type
                ==
                "credit note"
            ):

                raise ValueError(
                    "Customer payment cannot be "
                    "recorded against a Credit Note."
                )

            if (
                (
                    bill.status
                    or
                    ""
                )
                .strip()
                .lower()
                !=
                "issued"
            ):

                raise ValueError(
                    "Payment can be recorded only "
                    "after the Final Bill is Issued."
                )

            root_bill = (
                FinalBillPaymentService
                .get_root_invoice(
                    db=db,
                    bill=bill,
                )
            )

            invoice_chain = (
                FinalBillPaymentService
                .get_invoice_chain(
                    db=db,
                    root_bill=root_bill,
                )
            )

            effective_invoice = (
                FinalBillPaymentService
                .get_effective_invoice(
                    invoice_chain
                )
            )

            if (
                effective_invoice
                is None
            ):

                raise ValueError(
                    "No Issued invoice is available "
                    "for payment."
                )

            if (
                bill.id
                !=
                effective_invoice.id
            ):

                raise ValueError(
                    "Payment must be recorded against "
                    "the latest Issued invoice "
                    f"{effective_invoice.invoice_number}."
                )

            grand_total = (
                FinalBillPaymentService
                .money(
                    effective_invoice.grand_total
                )
            )

            credit_note_total = (
                FinalBillPaymentService
                .get_credit_note_total(
                    db=db,
                    effective_invoice_id=(
                        effective_invoice.id
                    ),
                )
            )

            receivable_amount = (
                grand_total
                -
                credit_note_total
            ).quantize(
                Decimal(
                    "0.01"
                )
            )

            if (
                receivable_amount
                <
                Decimal(
                    "0.00"
                )
            ):

                receivable_amount = (
                    Decimal(
                        "0.00"
                    )
                )

            (
                _proforma_advance_amount,
                _invoice_payment_amount,
                paid_amount,
            ) = (
                FinalBillPaymentService
                .get_total_received(
                    db=db,
                    root_bill=root_bill,
                )
            )

            outstanding_amount = (
                receivable_amount
                -
                paid_amount
            ).quantize(
                Decimal(
                    "0.01"
                )
            )

            if (
                outstanding_amount
                <=
                Decimal(
                    "0.00"
                )
            ):

                raise ValueError(
                    "This invoice is already fully paid."
                )

            payment_amount = (
                FinalBillPaymentService
                .money(
                    payment.amount
                )
            )

            if (
                payment_amount
                <=
                Decimal(
                    "0.00"
                )
            ):

                raise ValueError(
                    "Payment amount must be "
                    "greater than zero."
                )

            if (
                payment_amount
                >
                outstanding_amount
            ):

                raise ValueError(
                    "Payment amount cannot exceed "
                    "the outstanding balance of "
                    f"{outstanding_amount:.2f}."
                )

            db_payment = (
                FinalBillPayment(
                    final_bill_id=(
                        root_bill.id
                    ),

                    payment_date=(
                        payment.payment_date
                    ),

                    amount=(
                        payment_amount
                    ),

                    payment_type=(
                        payment.payment_type
                    ),

                    payment_mode=(
                        payment.payment_mode
                    ),

                    reference_number=(
                        payment.reference_number
                    ),

                    notes=(
                        payment.notes
                    ),

                    created_by=(
                        created_by
                    ),
                )
            )

            db.add(
                db_payment
            )

            db.commit()

            db.refresh(
                db_payment
            )

            return db_payment

        except Exception:

            db.rollback()

            raise