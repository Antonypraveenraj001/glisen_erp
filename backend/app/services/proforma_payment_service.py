from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.final_bill import (
    FinalBill,
)

from app.models.proforma import (
    Proforma,
)

from app.models.proforma_payment import (
    ProformaPayment,
)

from app.models.proforma_payment_refund import (
    ProformaPaymentRefund,
)

from app.schemas.proforma_payment import (
    ProformaPaymentCreate,
    ProformaPaymentRefundCreate,
)


class ProformaPaymentService:

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
    # GET PROFORMA
    # ============================================================

    @staticmethod
    def get_proforma(
        db: Session,
        proforma_id: int,
    ) -> Proforma | None:

        return (
            db.query(
                Proforma
            )
            .filter(
                Proforma.id
                ==
                proforma_id
            )
            .first()
        )

    # ============================================================
    # ADVANCE PAYMENTS
    # ============================================================

    @staticmethod
    def get_payments(
        db: Session,
        proforma_id: int,
    ) -> list[
        ProformaPayment
    ]:

        return (
            db.query(
                ProformaPayment
            )
            .filter(
                ProformaPayment.proforma_id
                ==
                proforma_id
            )
            .order_by(
                ProformaPayment
                .payment_date
                .asc(),

                ProformaPayment
                .id
                .asc(),
            )
            .all()
        )

    # ============================================================
    # REFUNDS
    # ============================================================

    @staticmethod
    def get_refunds(
        db: Session,
        proforma_id: int,
    ) -> list[
        ProformaPaymentRefund
    ]:

        return (
            db.query(
                ProformaPaymentRefund
            )
            .filter(
                ProformaPaymentRefund.proforma_id
                ==
                proforma_id
            )
            .order_by(
                ProformaPaymentRefund
                .refund_date
                .asc(),

                ProformaPaymentRefund
                .id
                .asc(),
            )
            .all()
        )

    # ============================================================
    # GROSS ADVANCE
    # ============================================================

    @staticmethod
    def get_total_advance(
        db: Session,
        proforma_id: int,
    ) -> Decimal:

        total = (
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

        return (
            ProformaPaymentService
            .money(
                total
            )
        )

    # ============================================================
    # TOTAL REFUNDED
    # ============================================================

    @staticmethod
    def get_total_refunded(
        db: Session,
        proforma_id: int,
    ) -> Decimal:

        total = (
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

        return (
            ProformaPaymentService
            .money(
                total
            )
        )

    # ============================================================
    # NET ADVANCE STILL HELD
    # ============================================================

    @staticmethod
    def get_net_advance_held(
        db: Session,
        proforma_id: int,
    ) -> Decimal:

        advance_received = (
            ProformaPaymentService
            .get_total_advance(
                db=db,
                proforma_id=(
                    proforma_id
                ),
            )
        )

        advance_refunded = (
            ProformaPaymentService
            .get_total_refunded(
                db=db,
                proforma_id=(
                    proforma_id
                ),
            )
        )

        net_advance = (
            advance_received
            -
            advance_refunded
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
    # ORIGINAL FINAL BILL EXISTS
    # ============================================================

    @staticmethod
    def has_final_bill(
        db: Session,
        proforma_id: int,
    ) -> bool:

        final_bill = (
            db.query(
                FinalBill.id
            )
            .filter(
                FinalBill.proforma_id
                ==
                proforma_id,

                FinalBill.parent_invoice_id
                .is_(
                    None
                ),
            )
            .first()
        )

        return (
            final_bill
            is not None
        )

    # ============================================================
    # ADVANCE ELIGIBILITY
    # ============================================================

    @staticmethod
    def get_recording_eligibility(
        db: Session,
        proforma: Proforma,
    ) -> tuple[
        bool,
        str | None,
    ]:

        normalized_status = (
            proforma.status
            or
            ""
        ).strip().lower()

        allowed_statuses = {
            "confirmed",
            "order confirmed",
            "production started",
            "production completed",
        }

        if (
            normalized_status
            not in
            allowed_statuses
        ):

            if (
                normalized_status
                ==
                "cancelled"
            ):

                return (
                    False,
                    (
                        "This Proforma is Cancelled. "
                        "New advances cannot be recorded."
                    ),
                )

            return (
                False,
                (
                    "Advance payment can be recorded "
                    "only after the Proforma is "
                    "Order Confirmed."
                ),
            )

        if (
            ProformaPaymentService
            .has_final_bill(
                db=db,
                proforma_id=(
                    proforma.id
                ),
            )
        ):

            return (
                False,
                (
                    "Final Billing has already started "
                    "for this Proforma. Record further "
                    "customer payments from Final Billing."
                ),
            )

        return (
            True,
            None,
        )

    # ============================================================
    # REFUND ELIGIBILITY
    #
    # Refunds are intentionally available only after cancellation.
    # This keeps the accounting intent clear.
    # ============================================================

    @staticmethod
    def get_refund_eligibility(
        db: Session,
        proforma: Proforma,
        net_advance_held: Decimal,
    ) -> tuple[
        bool,
        str | None,
    ]:

        if (
            net_advance_held
            <=
            Decimal(
                "0.00"
            )
        ):

            return (
                False,
                (
                    "There is no refundable advance "
                    "remaining against this Proforma."
                ),
            )

        normalized_status = (
            proforma.status
            or
            ""
        ).strip().lower()

        if (
            normalized_status
            !=
            "cancelled"
        ):

            return (
                False,
                (
                    "Advance refund becomes available "
                    "after the Proforma is Cancelled."
                ),
            )

        if (
            ProformaPaymentService
            .has_final_bill(
                db=db,
                proforma_id=(
                    proforma.id
                ),
            )
        ):

            return (
                False,
                (
                    "Final Billing already exists for this "
                    "Proforma. Settlement must be handled "
                    "through the billing workflow."
                ),
            )

        return (
            True,
            None,
        )

    # ============================================================
    # SETTLEMENT STATUS
    # ============================================================

    @staticmethod
    def get_settlement_status(
        advance_received: Decimal,
        advance_refunded: Decimal,
        net_advance_held: Decimal,
    ) -> str:

        if (
            advance_received
            <=
            Decimal(
                "0.00"
            )
        ):

            return (
                "No Advance"
            )

        if (
            advance_refunded
            <=
            Decimal(
                "0.00"
            )
        ):

            return (
                "Advance Held"
            )

        if (
            net_advance_held
            >
            Decimal(
                "0.00"
            )
        ):

            return (
                "Partially Refunded"
            )

        return (
            "Refunded"
        )

    # ============================================================
    # SUMMARY
    # ============================================================

    @staticmethod
    def get_summary(
        db: Session,
        proforma_id: int,
    ):

        proforma = (
            ProformaPaymentService
            .get_proforma(
                db=db,
                proforma_id=(
                    proforma_id
                ),
            )
        )

        if (
            proforma
            is None
        ):

            return None

        payments = (
            ProformaPaymentService
            .get_payments(
                db=db,
                proforma_id=(
                    proforma.id
                ),
            )
        )

        refunds = (
            ProformaPaymentService
            .get_refunds(
                db=db,
                proforma_id=(
                    proforma.id
                ),
            )
        )

        advance_received = (
            ProformaPaymentService
            .get_total_advance(
                db=db,
                proforma_id=(
                    proforma.id
                ),
            )
        )

        advance_refunded = (
            ProformaPaymentService
            .get_total_refunded(
                db=db,
                proforma_id=(
                    proforma.id
                ),
            )
        )

        net_advance_held = (
            advance_received
            -
            advance_refunded
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        if (
            net_advance_held
            <
            Decimal(
                "0.00"
            )
        ):

            net_advance_held = (
                Decimal(
                    "0.00"
                )
            )

        proforma_total = (
            ProformaPaymentService
            .money(
                proforma.grand_total
            )
        )

        balance_after_advance = (
            proforma_total
            -
            net_advance_held
        ).quantize(
            Decimal(
                "0.01"
            )
        )

        if (
            balance_after_advance
            <
            Decimal(
                "0.00"
            )
        ):

            balance_after_advance = (
                Decimal(
                    "0.00"
                )
            )

        (
            can_record_advance,
            advance_recording_message,
        ) = (
            ProformaPaymentService
            .get_recording_eligibility(
                db=db,
                proforma=proforma,
            )
        )

        (
            can_record_refund,
            refund_recording_message,
        ) = (
            ProformaPaymentService
            .get_refund_eligibility(
                db=db,
                proforma=proforma,
                net_advance_held=(
                    net_advance_held
                ),
            )
        )

        settlement_status = (
            ProformaPaymentService
            .get_settlement_status(
                advance_received=(
                    advance_received
                ),

                advance_refunded=(
                    advance_refunded
                ),

                net_advance_held=(
                    net_advance_held
                ),
            )
        )

        return {
            "proforma_id":
                proforma.id,

            "proforma_number":
                proforma.proforma_number,

            "proforma_total":
                proforma_total,

            "advance_received":
                advance_received,

            "advance_refunded":
                advance_refunded,

            "net_advance_held":
                net_advance_held,

            "balance_after_advance":
                balance_after_advance,

            "payment_count":
                len(
                    payments
                ),

            "refund_count":
                len(
                    refunds
                ),

            "settlement_status":
                settlement_status,

            "can_record_advance":
                can_record_advance,

            "advance_recording_message":
                advance_recording_message,

            "can_record_refund":
                can_record_refund,

            "refund_recording_message":
                refund_recording_message,

            "payments":
                payments,

            "refunds":
                refunds,
        }

    # ============================================================
    # CREATE ADVANCE
    # ============================================================

    @staticmethod
    def create_payment(
        db: Session,
        proforma_id: int,
        payment: ProformaPaymentCreate,
        created_by: int,
    ):

        try:

            proforma = (
                db.query(
                    Proforma
                )
                .filter(
                    Proforma.id
                    ==
                    proforma_id
                )
                .with_for_update()
                .first()
            )

            if (
                proforma
                is None
            ):

                raise ValueError(
                    "Proforma not found."
                )

            (
                can_record,
                message,
            ) = (
                ProformaPaymentService
                .get_recording_eligibility(
                    db=db,
                    proforma=proforma,
                )
            )

            if (
                not can_record
            ):

                raise ValueError(
                    message
                    or
                    "Advance payment cannot be recorded."
                )

            # ----------------------------------------------------
            # IMPORTANT:
            #
            # Use NET advance, not gross advance.
            #
            # If a prior advance was refunded and the order is
            # later reconfirmed, only money still held by the
            # company reduces the remaining payable amount.
            # ----------------------------------------------------

            net_advance_held = (
                ProformaPaymentService
                .get_net_advance_held(
                    db=db,
                    proforma_id=(
                        proforma.id
                    ),
                )
            )

            proforma_total = (
                ProformaPaymentService
                .money(
                    proforma.grand_total
                )
            )

            outstanding = (
                proforma_total
                -
                net_advance_held
            ).quantize(
                Decimal(
                    "0.01"
                )
            )

            if (
                outstanding
                <=
                Decimal(
                    "0.00"
                )
            ):

                raise ValueError(
                    "This Proforma value is already "
                    "fully covered by advance payments."
                )

            payment_amount = (
                ProformaPaymentService
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
                    "Advance payment amount must "
                    "be greater than zero."
                )

            if (
                payment_amount
                >
                outstanding
            ):

                raise ValueError(
                    "Advance payment cannot exceed "
                    "the remaining Proforma value of "
                    f"{outstanding:.2f}."
                )

            db_payment = (
                ProformaPayment(
                    proforma_id=(
                        proforma.id
                    ),

                    payment_date=(
                        payment.payment_date
                    ),

                    amount=(
                        payment_amount
                    ),

                    payment_type=(
                        "Advance"
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

    # ============================================================
    # CREATE ADVANCE REFUND
    # ============================================================

    @staticmethod
    def create_refund(
        db: Session,
        proforma_id: int,
        refund: ProformaPaymentRefundCreate,
        created_by: int,
    ):

        try:

            # ----------------------------------------------------
            # Lock the Proforma.
            #
            # Advance creation and refund creation both use this
            # same lock, preventing concurrent settlement changes
            # from exceeding the available amount.
            # ----------------------------------------------------

            proforma = (
                db.query(
                    Proforma
                )
                .filter(
                    Proforma.id
                    ==
                    proforma_id
                )
                .with_for_update()
                .first()
            )

            if (
                proforma
                is None
            ):

                raise ValueError(
                    "Proforma not found."
                )

            advance_received = (
                ProformaPaymentService
                .get_total_advance(
                    db=db,
                    proforma_id=(
                        proforma.id
                    ),
                )
            )

            advance_refunded = (
                ProformaPaymentService
                .get_total_refunded(
                    db=db,
                    proforma_id=(
                        proforma.id
                    ),
                )
            )

            net_advance_held = (
                advance_received
                -
                advance_refunded
            ).quantize(
                Decimal(
                    "0.01"
                )
            )

            if (
                net_advance_held
                <
                Decimal(
                    "0.00"
                )
            ):

                net_advance_held = (
                    Decimal(
                        "0.00"
                    )
                )

            (
                can_refund,
                message,
            ) = (
                ProformaPaymentService
                .get_refund_eligibility(
                    db=db,
                    proforma=proforma,
                    net_advance_held=(
                        net_advance_held
                    ),
                )
            )

            if (
                not can_refund
            ):

                raise ValueError(
                    message
                    or
                    "Advance refund cannot be recorded."
                )

            refund_amount = (
                ProformaPaymentService
                .money(
                    refund.amount
                )
            )

            if (
                refund_amount
                <=
                Decimal(
                    "0.00"
                )
            ):

                raise ValueError(
                    "Refund amount must be "
                    "greater than zero."
                )

            if (
                refund_amount
                >
                net_advance_held
            ):

                raise ValueError(
                    "Refund amount cannot exceed "
                    "the refundable advance balance of "
                    f"{net_advance_held:.2f}."
                )

            db_refund = (
                ProformaPaymentRefund(
                    proforma_id=(
                        proforma.id
                    ),

                    refund_date=(
                        refund.refund_date
                    ),

                    amount=(
                        refund_amount
                    ),

                    refund_mode=(
                        refund.refund_mode
                    ),

                    reference_number=(
                        refund.reference_number
                    ),

                    notes=(
                        refund.notes
                    ),

                    created_by=(
                        created_by
                    ),
                )
            )

            db.add(
                db_refund
            )

            db.commit()

            db.refresh(
                db_refund
            )

            return db_refund

        except Exception:

            db.rollback()

            raise