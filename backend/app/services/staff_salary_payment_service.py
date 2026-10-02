from calendar import monthrange
from datetime import date
from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy.exc import (
    IntegrityError,
)
from sqlalchemy.orm import Session

from app.models.recurring_payment import (
    RecurringPayment,
)
from app.models.staff import Staff
from app.models.staff_salary_rate import (
    StaffSalaryRate,
)


class StaffSalaryPaymentService:

    STAFF_SALARY = "STAFF_SALARY"


    @staticmethod
    def money(
        value,
    ) -> Decimal:

        return Decimal(
            str(
                value
                if value is not None
                else 0
            )
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )


    @staticmethod
    def normalize_period_start(
        value: date,
    ) -> date:

        if value.day != 1:
            raise ValueError(
                "Salary month must use the first day "
                "of the selected month."
            )

        return value


    @staticmethod
    def month_end(
        period_start: date,
    ) -> date:

        last_day = monthrange(
            period_start.year,
            period_start.month,
        )[1]

        return period_start.replace(
            day=last_day
        )


    @staticmethod
    def validate_period(
        period_start: date,
        payment_date: date,
    ) -> None:

        period_start = (
            StaffSalaryPaymentService
            .normalize_period_start(
                period_start
            )
        )

        payment_month = (
            payment_date.replace(
                day=1
            )
        )

        if period_start > payment_month:

            raise ValueError(
                "Salary month cannot be after "
                "the payment date month."
            )


    @staticmethod
    def staff_is_eligible_for_month(
        staff: Staff,
        period_start: date,
    ) -> bool:

        if staff.is_deleted:
            return False

        period_end = (
            StaffSalaryPaymentService
            .month_end(
                period_start
            )
        )

        if (
            staff.joining_date
            is not None
            and
            staff.joining_date
            > period_end
        ):
            return False

        if (
            staff.relieving_date
            is not None
            and
            staff.relieving_date
            < period_start
        ):
            return False

        return True


    @staticmethod
    def get_salary_rate_for_month(
        db: Session,
        staff_id: int,
        period_start: date,
    ) -> StaffSalaryRate | None:

        period_end = (
            StaffSalaryPaymentService
            .month_end(
                period_start
            )
        )

        return (
            db.query(
                StaffSalaryRate
            )
            .filter(
                StaffSalaryRate.staff_id
                == staff_id,

                StaffSalaryRate.effective_from
                <= period_end,

                (
                    StaffSalaryRate.effective_to
                    .is_(None)
                    |
                    (
                        StaffSalaryRate.effective_to
                        >= period_start
                    )
                ),
            )
            .order_by(
                StaffSalaryRate
                .effective_from
                .desc(),

                StaffSalaryRate
                .id
                .desc(),
            )
            .first()
        )


    @staticmethod
    def get_existing_payment(
        db: Session,
        staff_id: int,
        period_start: date,
    ) -> RecurringPayment | None:

        return (
            db.query(
                RecurringPayment
            )
            .filter(
                RecurringPayment.payment_kind
                ==
                StaffSalaryPaymentService
                .STAFF_SALARY,

                RecurringPayment.staff_id
                == staff_id,

                RecurringPayment.period_start
                == period_start,
            )
            .first()
        )


    @staticmethod
    def payment_to_dict(
        payment: RecurringPayment,
        staff_name: str,
    ) -> dict:

        return {
            "id":
                payment.id,

            "payment_kind":
                payment.payment_kind,

            "staff_id":
                payment.staff_id,

            "expense_id":
                payment.expense_id,

            "source_name":
                staff_name,

            "category":
                "Salary",

            "period_start":
                payment.period_start,

            "payment_date":
                payment.payment_date,

            "amount":
                StaffSalaryPaymentService
                .money(
                    payment.amount
                ),

            "payment_mode":
                payment.payment_mode,

            "reference_number":
                payment.reference_number,

            "notes":
                payment.notes,

            "created_by":
                payment.created_by,

            "created_at":
                payment.created_at,
        }


    @staticmethod
    def preview(
        db: Session,
        period_start: date,
        payment_date: date,
    ) -> dict:

        period_start = (
            StaffSalaryPaymentService
            .normalize_period_start(
                period_start
            )
        )

        (
            StaffSalaryPaymentService
            .validate_period(
                period_start=period_start,
                payment_date=payment_date,
            )
        )

        staff_members = (
            db.query(
                Staff
            )
            .filter(
                Staff.is_deleted.is_(False)
            )
            .order_by(
                Staff.staff_name.asc(),
                Staff.id.asc(),
            )
            .all()
        )

        items = []

        total_unpaid_amount = (
            Decimal("0.00")
        )

        unpaid_items = 0
        already_paid_items = 0

        for staff in staff_members:

            if not (
                StaffSalaryPaymentService
                .staff_is_eligible_for_month(
                    staff=staff,
                    period_start=period_start,
                )
            ):
                continue

            salary_rate = (
                StaffSalaryPaymentService
                .get_salary_rate_for_month(
                    db=db,
                    staff_id=staff.id,
                    period_start=period_start,
                )
            )

            if salary_rate is None:
                continue

            amount = (
                StaffSalaryPaymentService
                .money(
                    salary_rate.monthly_salary
                )
            )

            if amount <= 0:
                continue

            existing = (
                StaffSalaryPaymentService
                .get_existing_payment(
                    db=db,
                    staff_id=staff.id,
                    period_start=period_start,
                )
            )

            already_paid = (
                existing is not None
            )

            if already_paid:
                already_paid_items += 1
            else:
                unpaid_items += 1
                total_unpaid_amount += amount

            items.append(
                {
                    "source_id":
                        staff.id,

                    "source_name":
                        staff.staff_name,

                    "secondary_text":
                        staff.designation,

                    "category":
                        "Salary",

                    "amount":
                        amount,

                    "already_paid":
                        already_paid,

                    "existing_payment_id":
                        (
                            existing.id
                            if existing
                            else None
                        ),

                    "existing_payment_date":
                        (
                            existing.payment_date
                            if existing
                            else None
                        ),
                }
            )

        return {
            "payment_kind":
                StaffSalaryPaymentService
                .STAFF_SALARY,

            "payment_date":
                payment_date,

            "period_start":
                period_start,

            "total_items":
                len(items),

            "unpaid_items":
                unpaid_items,

            "already_paid_items":
                already_paid_items,

            "total_unpaid_amount":
                StaffSalaryPaymentService
                .money(
                    total_unpaid_amount
                ),

            "items":
                items,
        }


    @staticmethod
    def record_batch(
        db: Session,
        *,
        period_start: date,
        payment_date: date,
        staff_ids: list[int],
        payment_mode: str | None,
        reference_number: str | None,
        notes: str | None,
        created_by: int,
    ) -> dict:

        period_start = (
            StaffSalaryPaymentService
            .normalize_period_start(
                period_start
            )
        )

        (
            StaffSalaryPaymentService
            .validate_period(
                period_start=period_start,
                payment_date=payment_date,
            )
        )

        unique_staff_ids = list(
            dict.fromkeys(
                staff_ids
            )
        )

        if not unique_staff_ids:
            raise ValueError(
                "Select at least one staff member."
            )

        payments = []
        total_amount = Decimal("0.00")

        try:

            for staff_id in unique_staff_ids:

                staff = (
                    db.query(
                        Staff
                    )
                    .filter(
                        Staff.id == staff_id,
                        Staff.is_deleted.is_(False),
                    )
                    .with_for_update()
                    .first()
                )

                if staff is None:
                    raise ValueError(
                        "Staff member "
                        f"{staff_id} was not found."
                    )

                if not (
                    StaffSalaryPaymentService
                    .staff_is_eligible_for_month(
                        staff=staff,
                        period_start=period_start,
                    )
                ):

                    raise ValueError(
                        f"{staff.staff_name} was not "
                        "employed during the selected "
                        "salary month."
                    )

                salary_rate = (
                    StaffSalaryPaymentService
                    .get_salary_rate_for_month(
                        db=db,
                        staff_id=staff.id,
                        period_start=period_start,
                    )
                )

                if salary_rate is None:
                    raise ValueError(
                        "No salary rate exists for "
                        f"{staff.staff_name} during "
                        f"{period_start.strftime('%b %Y')}."
                    )

                amount = (
                    StaffSalaryPaymentService
                    .money(
                        salary_rate.monthly_salary
                    )
                )

                if amount <= 0:
                    raise ValueError(
                        f"{staff.staff_name} has no "
                        "salary amount to pay."
                    )

                existing = (
                    StaffSalaryPaymentService
                    .get_existing_payment(
                        db=db,
                        staff_id=staff.id,
                        period_start=period_start,
                    )
                )

                if existing is not None:
                    raise ValueError(
                        f"{staff.staff_name} salary "
                        "has already been recorded "
                        f"for {period_start.strftime('%b %Y')}."
                    )

                payment = (
                    RecurringPayment(
                        payment_kind=(
                            StaffSalaryPaymentService
                            .STAFF_SALARY
                        ),

                        staff_id=staff.id,
                        expense_id=None,

                        period_start=period_start,
                        payment_date=payment_date,

                        amount=amount,

                        payment_mode=(
                            payment_mode.strip()
                            if payment_mode
                            and payment_mode.strip()
                            else None
                        ),

                        reference_number=(
                            reference_number.strip()
                            if reference_number
                            and reference_number.strip()
                            else None
                        ),

                        notes=(
                            notes.strip()
                            if notes
                            and notes.strip()
                            else None
                        ),

                        created_by=created_by,
                    )
                )

                db.add(payment)
                db.flush()

                payments.append(
                    (
                        payment,
                        staff.staff_name,
                    )
                )

                total_amount += amount

            db.commit()

            return {
                "payment_kind":
                    StaffSalaryPaymentService
                    .STAFF_SALARY,

                "payment_date":
                    payment_date,

                "period_start":
                    period_start,

                "created_count":
                    len(payments),

                "total_amount":
                    StaffSalaryPaymentService
                    .money(
                        total_amount
                    ),

                "payments": [
                    StaffSalaryPaymentService
                    .payment_to_dict(
                        payment=payment,
                        staff_name=staff_name,
                    )

                    for (
                        payment,
                        staff_name,
                    )
                    in payments
                ],
            }

        except IntegrityError as exc:

            db.rollback()

            raise ValueError(
                "One or more selected staff salaries "
                "have already been recorded for this month."
            ) from exc

        except Exception:

            db.rollback()
            raise
