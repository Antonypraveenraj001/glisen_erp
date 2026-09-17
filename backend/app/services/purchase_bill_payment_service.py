from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_payment import (
    PurchaseBillPayment,
)
from app.schemas.purchase_bill_payment import (
    PurchaseBillPaymentCreate,
)


class PurchaseBillPaymentService:

    # ============================================================
    # DECIMAL HELPER
    # ============================================================

    @staticmethod
    def _decimal(
        value,
    ) -> Decimal:

        return Decimal(
            str(
                value
                or Decimal("0.00")
            )
        ).quantize(
            Decimal("0.01")
        )

    # ============================================================
    # TOTAL PAID
    # ============================================================

    @staticmethod
    def get_total_paid(
        db: Session,
        purchase_bill_id: int,
    ) -> Decimal:

        total_paid = (
            db.query(
                func.coalesce(
                    func.sum(
                        PurchaseBillPayment.amount
                    ),
                    0,
                )
            )
            .filter(
                PurchaseBillPayment.purchase_bill_id
                == purchase_bill_id
            )
            .scalar()
        )

        return (
            PurchaseBillPaymentService
            ._decimal(
                total_paid
            )
        )

    # ============================================================
    # PAYMENT STATUS
    # ============================================================

    @staticmethod
    def determine_payment_status(
        *,
        grand_total: Decimal,
        paid_amount: Decimal,
        due_date,
    ) -> str:

        grand_total = (
            PurchaseBillPaymentService
            ._decimal(
                grand_total
            )
        )

        paid_amount = (
            PurchaseBillPaymentService
            ._decimal(
                paid_amount
            )
        )

        # Historical Purchase Bills created before
        # payment tracking was introduced cannot
        # automatically be classified as unpaid.
        if (
            due_date is None
            and paid_amount
            == Decimal("0.00")
        ):
            return "Untracked"

        if (
            paid_amount
            <= Decimal("0.00")
        ):
            return "Unpaid"

        if (
            paid_amount
            < grand_total
        ):
            return "Partially Paid"

        return "Paid"

    # ============================================================
    # GET PAYMENT SUMMARY
    # ============================================================

    @staticmethod
    def get_summary(
        db: Session,
        purchase_bill_id: int,
    ):

        purchase_bill = (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.id
                == purchase_bill_id,
                PurchaseBill.is_active
                == True,
            )
            .first()
        )

        if purchase_bill is None:
            return None

        grand_total = (
            PurchaseBillPaymentService
            ._decimal(
                purchase_bill.grand_total
            )
        )

        paid_amount = (
            PurchaseBillPaymentService
            .get_total_paid(
                db=db,
                purchase_bill_id=(
                    purchase_bill.id
                ),
            )
        )

        balance_amount = (
            grand_total
            - paid_amount
        ).quantize(
            Decimal("0.01")
        )

        if (
            balance_amount
            < Decimal("0.00")
        ):
            balance_amount = Decimal(
                "0.00"
            )

        payment_status = (
            PurchaseBillPaymentService
            .determine_payment_status(
                grand_total=(
                    grand_total
                ),
                paid_amount=(
                    paid_amount
                ),
                due_date=(
                    purchase_bill.due_date
                ),
            )
        )

        payments = (
            db.query(
                PurchaseBillPayment
            )
            .filter(
                PurchaseBillPayment.purchase_bill_id
                == purchase_bill.id
            )
            .order_by(
                PurchaseBillPayment.payment_date.asc(),
                PurchaseBillPayment.id.asc(),
            )
            .all()
        )

        return {
            "purchase_bill_id": (
                purchase_bill.id
            ),
            "bill_number": (
                purchase_bill.bill_number
            ),
            "grand_total": (
                grand_total
            ),
            "paid_amount": (
                paid_amount
            ),
            "balance_amount": (
                balance_amount
            ),
            "payment_status": (
                payment_status
            ),
            "credit_days": int(
                purchase_bill.credit_days
                or 0
            ),
            "due_date": (
                purchase_bill.due_date
            ),
            "payments": (
                payments
            ),
        }

    # ============================================================
    # RECORD PAYMENT
    # ============================================================

    @staticmethod
    def create_payment(
        db: Session,
        purchase_bill_id: int,
        payment: PurchaseBillPaymentCreate,
        created_by: int,
    ):
        """
        Record a supplier payment against a Purchase Bill.

        Supplier payments affect only the payment ledger.
        They never change inventory stock and never create
        StockMovement records.
        """

        try:
            # ====================================================
            # LOCK PURCHASE BILL
            # ====================================================

            purchase_bill = (
                db.query(PurchaseBill)
                .filter(
                    PurchaseBill.id
                    == purchase_bill_id,
                    PurchaseBill.is_active
                    == True,
                )
                .with_for_update()
                .first()
            )

            if purchase_bill is None:
                raise HTTPException(
                    status_code=(
                        status.HTTP_404_NOT_FOUND
                    ),
                    detail=(
                        "Purchase Bill not found."
                    ),
                )

            # ====================================================
            # PAYMENT DATE VALIDATION
            # ====================================================

            if (
                payment.payment_date
                < purchase_bill.bill_date
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Payment date cannot be earlier "
                        "than the Purchase Bill date."
                    ),
                )

            # ====================================================
            # BILL / PAYMENT VALUES
            # ====================================================

            grand_total = (
                PurchaseBillPaymentService
                ._decimal(
                    purchase_bill.grand_total
                )
            )

            payment_amount = (
                PurchaseBillPaymentService
                ._decimal(
                    payment.amount
                )
            )

            if (
                payment_amount
                <= Decimal("0.00")
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Payment amount must be "
                        "greater than zero."
                    ),
                )

            # ====================================================
            # CURRENT PAYMENT TOTAL
            # ====================================================

            paid_amount = (
                PurchaseBillPaymentService
                .get_total_paid(
                    db=db,
                    purchase_bill_id=(
                        purchase_bill.id
                    ),
                )
            )

            outstanding_amount = (
                grand_total
                - paid_amount
            ).quantize(
                Decimal("0.01")
            )

            if (
                outstanding_amount
                <= Decimal("0.00")
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Purchase Bill is already "
                        "fully paid."
                    ),
                )

            # ====================================================
            # PREVENT OVERPAYMENT
            # ====================================================

            if (
                payment_amount
                > outstanding_amount
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Payment amount cannot exceed "
                        "the outstanding balance. "
                        f"Outstanding balance: "
                        f"{outstanding_amount:.2f}."
                    ),
                )

            # ====================================================
            # CREATE PAYMENT
            # ====================================================

            db_payment = (
                PurchaseBillPayment(
                    purchase_bill_id=(
                        purchase_bill.id
                    ),
                    payment_date=(
                        payment.payment_date
                    ),
                    amount=(
                        payment_amount
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

            # ====================================================
            # PAYMENT ONLY - NO STOCK CHANGE
            # ====================================================

            db.commit()

            db.refresh(
                db_payment
            )

            return db_payment

        except Exception:
            db.rollback()
            raise