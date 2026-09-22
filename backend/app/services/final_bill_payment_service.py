from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.final_bill import FinalBill
from app.models.final_bill_payment import (
    FinalBillPayment,
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
                or Decimal("0.00")
            )
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
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
            or ""
        ).strip().lower()

        if (
            invoice_type
            == "revised invoice"
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
                db.query(FinalBill)
                .filter(
                    FinalBill.id
                    == bill.parent_invoice_id
                )
                .first()
            )

            if root_bill is None:
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
    ) -> list[FinalBill]:

        revisions = (
            db.query(FinalBill)
            .filter(
                FinalBill.parent_invoice_id
                == root_bill.id,

                FinalBill.invoice_type
                == "Revised Invoice",
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
        invoice_chain: list[FinalBill],
    ) -> FinalBill | None:

        issued_invoices = [
            bill
            for bill
            in invoice_chain
            if (
                (
                    bill.status
                    or ""
                ).strip().lower()
                == "issued"
            )
        ]

        if not issued_invoices:
            return None

        return max(
            issued_invoices,
            key=lambda bill: (
                bill.revision_number,
                bill.id,
            ),
        )

    # ============================================================
    # CREDIT NOTES FOR CURRENT EFFECTIVE INVOICE ONLY
    # ============================================================

    @staticmethod
    def get_credit_note_total(
        db: Session,
        effective_invoice_id: int,
    ) -> Decimal:
        """
        Only issued Credit Notes created directly against the
        CURRENT effective invoice reduce its customer receivable.

        Example:

        Original
            ↓
        R1
            ↓
        CN1 against R1
            ↓
        R2

        Once R2 becomes the effective invoice, CN1 from R1 must
        NOT silently reduce the payment balance of R2.

        A Credit Note created against R2 will reduce R2's
        receivable.
        """

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
                == effective_invoice_id,

                FinalBill.invoice_type
                == "Credit Note",

                FinalBill.status
                == "Issued",
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
    # TOTAL RECEIVED
    # ============================================================

    @staticmethod
    def get_total_paid(
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
                == root_invoice_id
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
    # STATUS
    # ============================================================

    @staticmethod
    def determine_payment_status(
        *,
        document_is_issued: bool,
        receivable_amount: Decimal,
        paid_amount: Decimal,
    ) -> str:

        if not document_is_issued:
            return "Not Issued"

        if (
            receivable_amount
            <= Decimal("0.00")
        ):
            return "Paid"

        if (
            paid_amount
            <= Decimal("0.00")
        ):
            return "Pending"

        if (
            paid_amount
            < receivable_amount
        ):
            return "Partially Paid"

        return "Paid"

    # ============================================================
    # PAYMENT SUMMARY
    # ============================================================

    @staticmethod
    def get_summary(
        db: Session,
        final_bill_id: int,
    ):

        bill = (
            db.query(FinalBill)
            .filter(
                FinalBill.id
                == final_bill_id
            )
            .first()
        )

        if bill is None:
            return None

        invoice_type = (
            bill.invoice_type
            or ""
        ).strip().lower()

        # ========================================================
        # CREDIT NOTES DO NOT RECEIVE CUSTOMER PAYMENTS
        # ========================================================

        if (
            invoice_type
            == "credit note"
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
                    FinalBillPaymentService
                    .money(
                        bill.grand_total
                    ),

                "credit_note_total":
                    Decimal("0.00"),

                "receivable_amount":
                    Decimal("0.00"),

                "paid_amount":
                    Decimal("0.00"),

                "balance_amount":
                    Decimal("0.00"),

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
        # NO ISSUED INVOICE YET
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
                    Decimal("0.00"),

                "receivable_amount":
                    grand_total,

                "paid_amount":
                    Decimal("0.00"),

                "balance_amount":
                    grand_total,

                "payment_status":
                    "Not Issued",

                "payments":
                    [],
            }

        # ========================================================
        # EFFECTIVE INVOICE VALUE
        # ========================================================

        grand_total = (
            FinalBillPaymentService
            .money(
                effective_invoice.grand_total
            )
        )

        # IMPORTANT:
        # Only Credit Notes issued directly against the current
        # effective invoice reduce its receivable.
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
            - credit_note_total
        ).quantize(
            Decimal("0.01")
        )

        if (
            receivable_amount
            < Decimal("0.00")
        ):
            receivable_amount = (
                Decimal("0.00")
            )

        # ========================================================
        # PAYMENTS
        #
        # Payments remain stored against the original/root invoice.
        # This preserves advance payments when R1 / R2 / R3 are
        # later created.
        # ========================================================

        paid_amount = (
            FinalBillPaymentService
            .get_total_paid(
                db=db,
                root_invoice_id=(
                    root_bill.id
                ),
            )
        )

        balance_amount = (
            receivable_amount
            - paid_amount
        ).quantize(
            Decimal("0.01")
        )

        if (
            balance_amount
            < Decimal("0.00")
        ):
            balance_amount = (
                Decimal("0.00")
            )

        payments = (
            db.query(
                FinalBillPayment
            )
            .filter(
                FinalBillPayment.final_bill_id
                == root_bill.id
            )
            .order_by(
                FinalBillPayment.payment_date.asc(),
                FinalBillPayment.id.asc(),
            )
            .all()
        )

        requested_document_is_issued = (
            (
                bill.status
                or ""
            ).strip().lower()
            == "issued"
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
                    == effective_invoice.id
                ),

            "grand_total":
                grand_total,

            "credit_note_total":
                credit_note_total,

            "receivable_amount":
                receivable_amount,

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
    # RECORD CUSTOMER PAYMENT
    # ============================================================

    @staticmethod
    def create_payment(
        db: Session,
        final_bill_id: int,
        payment: FinalBillPaymentCreate,
        created_by: int,
    ):

        try:

            # ====================================================
            # REQUESTED INVOICE
            # ====================================================

            bill = (
                db.query(FinalBill)
                .filter(
                    FinalBill.id
                    == final_bill_id
                )
                .with_for_update()
                .first()
            )

            if bill is None:
                raise ValueError(
                    "Final Bill not found."
                )

            invoice_type = (
                bill.invoice_type
                or ""
            ).strip().lower()

            if (
                invoice_type
                == "credit note"
            ):
                raise ValueError(
                    "Customer payment cannot be "
                    "recorded against a Credit Note."
                )

            if (
                (
                    bill.status
                    or ""
                ).strip().lower()
                != "issued"
            ):
                raise ValueError(
                    "Payment can be recorded only "
                    "after the Final Bill is Issued."
                )

            # ====================================================
            # ROOT + REVISION CHAIN
            # ====================================================

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

            # Only latest issued invoice receives new payments.
            if (
                bill.id
                != effective_invoice.id
            ):
                raise ValueError(
                    "Payment must be recorded against "
                    "the latest Issued invoice "
                    f"{effective_invoice.invoice_number}."
                )

            # ====================================================
            # CURRENT RECEIVABLE
            # ====================================================

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
                - credit_note_total
            ).quantize(
                Decimal("0.01")
            )

            if (
                receivable_amount
                < Decimal("0.00")
            ):
                receivable_amount = (
                    Decimal("0.00")
                )

            # ====================================================
            # CURRENT RECEIVED AMOUNT
            # ====================================================

            paid_amount = (
                FinalBillPaymentService
                .get_total_paid(
                    db=db,
                    root_invoice_id=(
                        root_bill.id
                    ),
                )
            )

            outstanding_amount = (
                receivable_amount
                - paid_amount
            ).quantize(
                Decimal("0.01")
            )

            if (
                outstanding_amount
                <= Decimal("0.00")
            ):
                raise ValueError(
                    "This invoice is already fully paid."
                )

            # ====================================================
            # NEW PAYMENT
            # ====================================================

            payment_amount = (
                FinalBillPaymentService
                .money(
                    payment.amount
                )
            )

            if (
                payment_amount
                <= Decimal("0.00")
            ):
                raise ValueError(
                    "Payment amount must be "
                    "greater than zero."
                )

            if (
                payment_amount
                > outstanding_amount
            ):
                raise ValueError(
                    "Payment amount cannot exceed "
                    "the outstanding balance of "
                    f"{outstanding_amount:.2f}."
                )

            # Advance payment dates may be earlier than the
            # Final Bill invoice date, so no invoice-date check
            # is intentionally applied here.

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