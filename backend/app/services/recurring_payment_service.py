from datetime import date
from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy.exc import (
    IntegrityError,
)
from sqlalchemy.orm import Session

from app.models.expense import (
    Expense,
)
from app.models.expense_recurring_rate import (
    ExpenseRecurringRate,
)
from app.models.recurring_payment import (
    RecurringPayment,
)
from app.models.staff import (
    Staff,
)
from app.models.staff_salary_rate import (
    StaffSalaryRate,
)
from app.schemas.recurring_payment import (
    OverheadRepeatPaymentCreate,
    StaffRepeatPaymentCreate,
)


class RecurringPaymentService:

    STAFF_SALARY = (
        "STAFF_SALARY"
    )

    OVERHEAD = (
        "OVERHEAD"
    )


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
                if value is not None
                else 0
            )
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )


    # ============================================================
    # MONTH START
    # ============================================================

    @staticmethod
    def month_start(
        value: date,
    ) -> date:

        return value.replace(
            day=1
        )


    # ============================================================
    # GET SALARY RATE FOR DATE
    # ============================================================

    @staticmethod
    def get_salary_rate(
        db: Session,
        staff_id: int,
        target_date: date,
    ) -> StaffSalaryRate | None:

        return (
            db.query(
                StaffSalaryRate
            )
            .filter(
                StaffSalaryRate.staff_id
                == staff_id,

                StaffSalaryRate.effective_from
                <= target_date,

                (
                    StaffSalaryRate.effective_to
                    .is_(
                        None
                    )
                    |
                    (
                        StaffSalaryRate.effective_to
                        >= target_date
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


    # ============================================================
    # GET OVERHEAD RATE FOR DATE
    # ============================================================

    @staticmethod
    def get_overhead_rate(
        db: Session,
        expense_id: int,
        target_date: date,
    ) -> ExpenseRecurringRate | None:

        return (
            db.query(
                ExpenseRecurringRate
            )
            .filter(
                ExpenseRecurringRate.expense_id
                == expense_id,

                ExpenseRecurringRate.effective_from
                <= target_date,

                (
                    ExpenseRecurringRate.effective_to
                    .is_(
                        None
                    )
                    |
                    (
                        ExpenseRecurringRate.effective_to
                        >= target_date
                    )
                ),
            )
            .order_by(
                ExpenseRecurringRate
                .effective_from
                .desc(),

                ExpenseRecurringRate
                .id
                .desc(),
            )
            .first()
        )


    # ============================================================
    # EXISTING STAFF PAYMENT
    # ============================================================

    @staticmethod
    def get_existing_staff_payment(
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
                RecurringPaymentService
                .STAFF_SALARY,

                RecurringPayment.staff_id
                ==
                staff_id,

                RecurringPayment.period_start
                ==
                period_start,
            )
            .first()
        )


    # ============================================================
    # EXISTING OVERHEAD PAYMENT
    # ============================================================

    @staticmethod
    def get_existing_overhead_payment(
        db: Session,
        expense_id: int,
        period_start: date,
    ) -> RecurringPayment | None:

        return (
            db.query(
                RecurringPayment
            )
            .filter(
                RecurringPayment.payment_kind
                ==
                RecurringPaymentService
                .OVERHEAD,

                RecurringPayment.expense_id
                ==
                expense_id,

                RecurringPayment.period_start
                ==
                period_start,
            )
            .first()
        )


    # ============================================================
    # STAFF WAS EMPLOYED ON PAYMENT DATE
    # ============================================================

    @staticmethod
    def staff_is_eligible(
        staff: Staff,
        payment_date: date,
    ) -> bool:

        if (
            staff.joining_date
            is not None
            and
            staff.joining_date
            >
            payment_date
        ):
            return False


        if (
            staff.relieving_date
            is not None
            and
            staff.relieving_date
            <
            payment_date
        ):
            return False


        return True


    # ============================================================
    # STAFF PREVIEW
    # ============================================================

    @staticmethod
    def preview_staff(
        db: Session,
        payment_date: date,
    ) -> dict:

        period_start = (
            RecurringPaymentService
            .month_start(
                payment_date
            )
        )


        staff_members = (
            db.query(
                Staff
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
                RecurringPaymentService
                .staff_is_eligible(
                    staff=staff,
                    payment_date=(
                        payment_date
                    ),
                )
            ):
                continue


            salary_rate = (
                RecurringPaymentService
                .get_salary_rate(
                    db=db,
                    staff_id=staff.id,
                    target_date=(
                        payment_date
                    ),
                )
            )


            if salary_rate is None:
                continue


            amount = (
                RecurringPaymentService
                .money(
                    salary_rate.monthly_salary
                )
            )


            # Zero salary staff are not payment candidates.
            if amount <= 0:
                continue


            existing = (
                RecurringPaymentService
                .get_existing_staff_payment(
                    db=db,
                    staff_id=staff.id,
                    period_start=(
                        period_start
                    ),
                )
            )


            already_paid = (
                existing
                is not None
            )


            if already_paid:

                already_paid_items += 1

            else:

                unpaid_items += 1

                total_unpaid_amount += (
                    amount
                )


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
                RecurringPaymentService
                .STAFF_SALARY,

            "payment_date":
                payment_date,

            "period_start":
                period_start,

            "total_items":
                len(
                    items
                ),

            "unpaid_items":
                unpaid_items,

            "already_paid_items":
                already_paid_items,

            "total_unpaid_amount":
                RecurringPaymentService
                .money(
                    total_unpaid_amount
                ),

            "items":
                items,
        }


    # ============================================================
    # OVERHEAD PREVIEW
    # ============================================================

    @staticmethod
    def preview_overheads(
        db: Session,
        payment_date: date,
    ) -> dict:

        period_start = (
            RecurringPaymentService
            .month_start(
                payment_date
            )
        )


        expenses = (
            db.query(
                Expense
            )
            .filter(
                Expense.expense_type
                ==
                "OVERHEAD",

                Expense.is_monthly_recurring
                .is_(
                    True
                ),
            )
            .order_by(
                Expense.category.asc(),
                Expense.description.asc(),
                Expense.id.asc(),
            )
            .all()
        )


        items = []

        total_unpaid_amount = (
            Decimal("0.00")
        )

        unpaid_items = 0

        already_paid_items = 0


        for expense in expenses:

            overhead_rate = (
                RecurringPaymentService
                .get_overhead_rate(
                    db=db,
                    expense_id=expense.id,
                    target_date=(
                        payment_date
                    ),
                )
            )


            if overhead_rate is None:
                continue


            amount = (
                RecurringPaymentService
                .money(
                    overhead_rate.monthly_amount
                )
            )


            if amount <= 0:
                continue


            existing = (
                RecurringPaymentService
                .get_existing_overhead_payment(
                    db=db,
                    expense_id=expense.id,
                    period_start=(
                        period_start
                    ),
                )
            )


            already_paid = (
                existing
                is not None
            )


            if already_paid:

                already_paid_items += 1

            else:

                unpaid_items += 1

                total_unpaid_amount += (
                    amount
                )


            secondary_text = (
                expense.vendor_name
                or
                None
            )


            items.append(
                {
                    "source_id":
                        expense.id,

                    "source_name":
                        expense.description,

                    "secondary_text":
                        secondary_text,

                    "category":
                        expense.category,

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
                RecurringPaymentService
                .OVERHEAD,

            "payment_date":
                payment_date,

            "period_start":
                period_start,

            "total_items":
                len(
                    items
                ),

            "unpaid_items":
                unpaid_items,

            "already_paid_items":
                already_paid_items,

            "total_unpaid_amount":
                RecurringPaymentService
                .money(
                    total_unpaid_amount
                ),

            "items":
                items,
        }


    # ============================================================
    # RESPONSE MAPPING
    # ============================================================

    @staticmethod
    def payment_to_dict(
        payment: RecurringPayment,
        source_name: str,
        category: str | None,
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
                source_name,

            "category":
                category,

            "period_start":
                payment.period_start,

            "payment_date":
                payment.payment_date,

            "amount":
                RecurringPaymentService
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


    # ============================================================
    # RECORD STAFF SALARY BATCH
    # ============================================================

    @staticmethod
    def record_staff_batch(
        db: Session,
        data: StaffRepeatPaymentCreate,
        created_by: int,
    ) -> dict:

        period_start = (
            RecurringPaymentService
            .month_start(
                data.payment_date
            )
        )


        staff_ids = list(
            dict.fromkeys(
                data.staff_ids
            )
        )


        payments = []

        total_amount = (
            Decimal("0.00")
        )


        try:

            for staff_id in staff_ids:

                staff = (
                    db.query(
                        Staff
                    )
                    .filter(
                        Staff.id
                        ==
                        staff_id
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
                    RecurringPaymentService
                    .staff_is_eligible(
                        staff=staff,
                        payment_date=(
                            data.payment_date
                        ),
                    )
                ):

                    raise ValueError(
                        f"{staff.staff_name} was not "
                        "employed on the selected "
                        "payment date."
                    )


                salary_rate = (
                    RecurringPaymentService
                    .get_salary_rate(
                        db=db,
                        staff_id=staff.id,
                        target_date=(
                            data.payment_date
                        ),
                    )
                )


                if salary_rate is None:

                    raise ValueError(
                        "No salary rate exists for "
                        f"{staff.staff_name} on "
                        f"{data.payment_date}."
                    )


                amount = (
                    RecurringPaymentService
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
                    RecurringPaymentService
                    .get_existing_staff_payment(
                        db=db,
                        staff_id=staff.id,
                        period_start=(
                            period_start
                        ),
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
                            RecurringPaymentService
                            .STAFF_SALARY
                        ),

                        staff_id=(
                            staff.id
                        ),

                        expense_id=None,

                        period_start=(
                            period_start
                        ),

                        payment_date=(
                            data.payment_date
                        ),

                        amount=(
                            amount
                        ),

                        payment_mode=(
                            data.payment_mode
                        ),

                        reference_number=(
                            data.reference_number
                        ),

                        notes=(
                            data.notes
                        ),

                        created_by=(
                            created_by
                        ),
                    )
                )


                db.add(
                    payment
                )


                db.flush()


                payments.append(
                    (
                        payment,
                        staff.staff_name,
                        "Salary",
                    )
                )


                total_amount += (
                    amount
                )


            db.commit()


            return {
                "payment_kind":
                    RecurringPaymentService
                    .STAFF_SALARY,

                "payment_date":
                    data.payment_date,

                "period_start":
                    period_start,

                "created_count":
                    len(
                        payments
                    ),

                "total_amount":
                    RecurringPaymentService
                    .money(
                        total_amount
                    ),

                "payments": [
                    RecurringPaymentService
                    .payment_to_dict(
                        payment=payment,
                        source_name=source_name,
                        category=category,
                    )

                    for (
                        payment,
                        source_name,
                        category,
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


    # ============================================================
    # RECORD OVERHEAD BATCH
    # ============================================================

    @staticmethod
    def record_overhead_batch(
        db: Session,
        data: OverheadRepeatPaymentCreate,
        created_by: int,
    ) -> dict:

        period_start = (
            RecurringPaymentService
            .month_start(
                data.payment_date
            )
        )


        expense_ids = list(
            dict.fromkeys(
                data.expense_ids
            )
        )


        payments = []

        total_amount = (
            Decimal("0.00")
        )


        try:

            for expense_id in expense_ids:

                expense = (
                    db.query(
                        Expense
                    )
                    .filter(
                        Expense.id
                        ==
                        expense_id
                    )
                    .with_for_update()
                    .first()
                )


                if expense is None:

                    raise ValueError(
                        "Overhead expense "
                        f"{expense_id} was not found."
                    )


                if (
                    expense.expense_type
                    !=
                    "OVERHEAD"
                    or
                    not expense.is_monthly_recurring
                ):

                    raise ValueError(
                        f"{expense.description} is not "
                        "an active recurring overhead."
                    )


                overhead_rate = (
                    RecurringPaymentService
                    .get_overhead_rate(
                        db=db,
                        expense_id=expense.id,
                        target_date=(
                            data.payment_date
                        ),
                    )
                )


                if overhead_rate is None:

                    raise ValueError(
                        "No recurring overhead rate exists for "
                        f"{expense.description} on "
                        f"{data.payment_date}."
                    )


                amount = (
                    RecurringPaymentService
                    .money(
                        overhead_rate.monthly_amount
                    )
                )


                if amount <= 0:

                    raise ValueError(
                        f"{expense.description} has no "
                        "amount to pay."
                    )


                existing = (
                    RecurringPaymentService
                    .get_existing_overhead_payment(
                        db=db,
                        expense_id=expense.id,
                        period_start=(
                            period_start
                        ),
                    )
                )


                if existing is not None:

                    raise ValueError(
                        f"{expense.description} payment "
                        "has already been recorded "
                        f"for {period_start.strftime('%b %Y')}."
                    )


                payment = (
                    RecurringPayment(
                        payment_kind=(
                            RecurringPaymentService
                            .OVERHEAD
                        ),

                        staff_id=None,

                        expense_id=(
                            expense.id
                        ),

                        period_start=(
                            period_start
                        ),

                        payment_date=(
                            data.payment_date
                        ),

                        amount=(
                            amount
                        ),

                        payment_mode=(
                            data.payment_mode
                        ),

                        reference_number=(
                            data.reference_number
                        ),

                        notes=(
                            data.notes
                        ),

                        created_by=(
                            created_by
                        ),
                    )
                )


                db.add(
                    payment
                )


                db.flush()


                payments.append(
                    (
                        payment,
                        expense.description,
                        expense.category,
                    )
                )


                total_amount += (
                    amount
                )


            db.commit()


            return {
                "payment_kind":
                    RecurringPaymentService
                    .OVERHEAD,

                "payment_date":
                    data.payment_date,

                "period_start":
                    period_start,

                "created_count":
                    len(
                        payments
                    ),

                "total_amount":
                    RecurringPaymentService
                    .money(
                        total_amount
                    ),

                "payments": [
                    RecurringPaymentService
                    .payment_to_dict(
                        payment=payment,
                        source_name=source_name,
                        category=category,
                    )

                    for (
                        payment,
                        source_name,
                        category,
                    )
                    in payments
                ],
            }


        except IntegrityError as exc:

            db.rollback()


            raise ValueError(
                "One or more selected overhead payments "
                "have already been recorded for this month."
            ) from exc


        except Exception:

            db.rollback()

            raise


    # ============================================================
    # PAYMENT HISTORY
    # ============================================================

    @staticmethod
    def get_history(
        db: Session,
        payment_kind: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict]:

        if (
            start_date is not None
            and
            end_date is not None
            and
            start_date > end_date
        ):

            raise ValueError(
                "Start date cannot be after end date."
            )


        query = (
            db.query(
                RecurringPayment
            )
        )


        if payment_kind:

            normalized_kind = (
                payment_kind
                .strip()
                .upper()
            )


            if normalized_kind not in {
                RecurringPaymentService.STAFF_SALARY,
                RecurringPaymentService.OVERHEAD,
            }:

                raise ValueError(
                    "payment_kind must be "
                    "STAFF_SALARY or OVERHEAD."
                )


            query = query.filter(
                RecurringPayment.payment_kind
                ==
                normalized_kind
            )


        if start_date is not None:

            query = query.filter(
                RecurringPayment.payment_date
                >=
                start_date
            )


        if end_date is not None:

            query = query.filter(
                RecurringPayment.payment_date
                <=
                end_date
            )


        rows = (
            query
            .order_by(
                RecurringPayment.payment_date
                .desc(),

                RecurringPayment.id
                .desc(),
            )
            .all()
        )


        result = []


        for payment in rows:

            if (
                payment.payment_kind
                ==
                RecurringPaymentService
                .STAFF_SALARY
            ):

                staff = (
                    db.query(
                        Staff
                    )
                    .filter(
                        Staff.id
                        ==
                        payment.staff_id
                    )
                    .first()
                )


                source_name = (
                    staff.staff_name
                    if staff
                    else "Staff"
                )


                category = (
                    "Salary"
                )

            else:

                expense = (
                    db.query(
                        Expense
                    )
                    .filter(
                        Expense.id
                        ==
                        payment.expense_id
                    )
                    .first()
                )


                source_name = (
                    expense.description
                    if expense
                    else "Overhead"
                )


                category = (
                    expense.category
                    if expense
                    else None
                )


            result.append(
                RecurringPaymentService
                .payment_to_dict(
                    payment=payment,
                    source_name=source_name,
                    category=category,
                )
            )


        return result