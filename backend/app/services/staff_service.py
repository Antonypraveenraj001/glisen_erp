from datetime import (
    date,
    timedelta,
)
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.staff import Staff
from app.models.staff_salary_rate import (
    StaffSalaryRate,
)
from app.repositories.staff_repository import (
    StaffRepository,
)
from app.schemas.staff import (
    StaffCreate,
    StaffUpdate,
)


class StaffService:

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
    # CURRENT SALARY RATE
    # ============================================================

    @staticmethod
    def get_current_salary_rate(
        db: Session,
        staff_id: int,
    ) -> StaffSalaryRate | None:

        return (
            db.query(
                StaffSalaryRate
            )
            .filter(
                StaffSalaryRate.staff_id
                == staff_id,

                StaffSalaryRate.effective_to
                .is_(
                    None
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
    # CREATE
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        data: StaffCreate,
    ) -> Staff:

        try:

            staff = Staff(
                staff_name=(
                    data.staff_name
                ),

                designation=(
                    data.designation
                ),

                monthly_salary=(
                    data.monthly_salary
                ),

                joining_date=(
                    data.joining_date
                ),

                relieving_date=(
                    data.relieving_date
                ),

                is_active=(
                    data.relieving_date
                    is None
                ),

                notes=(
                    data.notes
                ),
            )


            db.add(
                staff
            )


            # ----------------------------------------------------
            # FLUSH
            #
            # Gives us staff.id without committing separately.
            # Staff and salary history therefore remain one
            # transaction.
            # ----------------------------------------------------

            db.flush()


            # ----------------------------------------------------
            # INITIAL SALARY EFFECTIVE DATE
            #
            # If Joining Date exists, use it.
            #
            # Otherwise salary begins from the first day of the
            # current month.
            # ----------------------------------------------------

            salary_effective_from = (
                data.joining_date
                or
                StaffService
                .month_start(
                    date.today()
                )
            )


            salary_rate = (
                StaffSalaryRate(
                    staff_id=(
                        staff.id
                    ),

                    monthly_salary=(
                        data.monthly_salary
                    ),

                    effective_from=(
                        salary_effective_from
                    ),

                    effective_to=(
                        data.relieving_date
                    ),
                )
            )


            db.add(
                salary_rate
            )


            db.commit()


            db.refresh(
                staff
            )


            return staff


        except Exception:

            db.rollback()

            raise

    # ============================================================
    # GET ONE
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        staff_id: int,
    ) -> Staff:

        staff = (
            StaffRepository
            .get_by_id(
                db=db,
                staff_id=staff_id,
            )
        )


        if staff is None:

            raise ValueError(
                "Staff member not found."
            )


        return staff

    # ============================================================
    # LIST
    # ============================================================

    @staticmethod
    def get_all(
        db: Session,
        *,
        active_only: bool = False,
        search: str | None = None,
    ) -> list[Staff]:

        return (
            StaffRepository
            .get_all(
                db=db,

                active_only=(
                    active_only
                ),

                search=(
                    search
                ),
            )
        )

    # ============================================================
    # UPDATE
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        staff_id: int,
        data: StaffUpdate,
    ) -> Staff:

        staff = (
            StaffService
            .get_by_id(
                db=db,
                staff_id=staff_id,
            )
        )


        update_data = (
            data.model_dump(
                exclude_unset=True
            )
        )


        # ========================================================
        # FINAL EMPLOYMENT DATES
        # ========================================================

        final_joining_date = (
            update_data.get(
                "joining_date",
                staff.joining_date,
            )
        )


        final_relieving_date = (
            update_data.get(
                "relieving_date",
                staff.relieving_date,
            )
        )


        if (
            final_joining_date
            is not None
            and
            final_relieving_date
            is not None
            and
            final_relieving_date
            < final_joining_date
        ):

            raise ValueError(
                "Relieving date cannot be "
                "before joining date."
            )


        # ========================================================
        # SALARY CHANGE
        #
        # Any salary change becomes effective from the first day
        # of the CURRENT month.
        #
        # Example:
        #
        # Aug-Nov:
        #     ₹25,000
        #
        # December edit:
        #     ₹28,000
        #
        # Old history:
        #     ₹25,000 ... 30-Nov
        #
        # New history:
        #     ₹28,000 ... from 01-Dec
        # ========================================================

        if (
            "monthly_salary"
            in update_data
        ):

            new_salary = Decimal(
                str(
                    update_data[
                        "monthly_salary"
                    ]
                )
            )


            old_salary = Decimal(
                str(
                    staff.monthly_salary
                )
            )


            if (
                new_salary
                != old_salary
            ):

                change_date = (
                    StaffService
                    .month_start(
                        date.today()
                    )
                )


                current_rate = (
                    StaffService
                    .get_current_salary_rate(
                        db=db,
                        staff_id=staff.id,
                    )
                )


                if (
                    current_rate
                    is None
                ):

                    db.add(
                        StaffSalaryRate(
                            staff_id=(
                                staff.id
                            ),

                            monthly_salary=(
                                new_salary
                            ),

                            effective_from=(
                                change_date
                            ),

                            effective_to=None,
                        )
                    )


                elif (
                    current_rate
                    .effective_from
                    == change_date
                ):

                    # --------------------------------------------
                    # Salary was already changed during this
                    # month.
                    #
                    # Update the current-month rate instead of
                    # creating another duplicate history row.
                    # --------------------------------------------

                    current_rate.monthly_salary = (
                        new_salary
                    )


                elif (
                    current_rate
                    .effective_from
                    < change_date
                ):

                    current_rate.effective_to = (
                        change_date
                        -
                        timedelta(
                            days=1
                        )
                    )


                    db.add(
                        StaffSalaryRate(
                            staff_id=(
                                staff.id
                            ),

                            monthly_salary=(
                                new_salary
                            ),

                            effective_from=(
                                change_date
                            ),

                            effective_to=None,
                        )
                    )


                else:

                    raise ValueError(
                        "Salary history contains a "
                        "future effective rate. "
                        "Review the salary history "
                        "before changing this salary."
                    )


                staff.monthly_salary = (
                    new_salary
                )


        # ========================================================
        # NORMAL STAFF FIELDS
        # ========================================================

        if (
            "staff_name"
            in update_data
        ):

            staff_name = (
                update_data[
                    "staff_name"
                ]
            )


            if not staff_name:

                raise ValueError(
                    "Staff name is required."
                )


            staff.staff_name = (
                staff_name
            )


        if (
            "designation"
            in update_data
        ):

            staff.designation = (
                update_data[
                    "designation"
                ]
            )


        if (
            "joining_date"
            in update_data
        ):

            staff.joining_date = (
                update_data[
                    "joining_date"
                ]
            )


        if (
            "relieving_date"
            in update_data
        ):

            staff.relieving_date = (
                update_data[
                    "relieving_date"
                ]
            )


        if (
            "notes"
            in update_data
        ):

            staff.notes = (
                update_data[
                    "notes"
                ]
            )


        if (
            "is_active"
            in update_data
        ):

            staff.is_active = (
                update_data[
                    "is_active"
                ]
            )


        # ========================================================
        # RELIEVING DATE
        #
        # Salary stops at the relieving date.
        # ========================================================

        if (
            staff.relieving_date
            is not None
        ):

            staff.is_active = False


            current_rate = (
                StaffService
                .get_current_salary_rate(
                    db=db,
                    staff_id=staff.id,
                )
            )


            if (
                current_rate
                is not None
            ):

                if (
                    staff.relieving_date
                    <
                    current_rate.effective_from
                ):

                    raise ValueError(
                        "Relieving date cannot be "
                        "before the current salary "
                        "effective date."
                    )


                current_rate.effective_to = (
                    staff.relieving_date
                )


        # ========================================================
        # COMMIT
        # ========================================================

        try:

            db.commit()


            db.refresh(
                staff
            )


            return staff


        except Exception:

            db.rollback()

            raise

    # ============================================================
    # DEACTIVATE
    # ============================================================

    @staticmethod
    def deactivate(
        db: Session,
        staff_id: int,
    ) -> Staff:

        staff = (
            StaffService
            .get_by_id(
                db=db,
                staff_id=staff_id,
            )
        )


        today = (
            date.today()
        )


        staff.is_active = False


        if (
            staff.relieving_date
            is None
        ):

            staff.relieving_date = (
                today
            )


        current_rate = (
            StaffService
            .get_current_salary_rate(
                db=db,
                staff_id=staff.id,
            )
        )


        if (
            current_rate
            is not None
        ):

            if (
                today
                >=
                current_rate
                .effective_from
            ):

                current_rate.effective_to = (
                    today
                )


        try:

            db.commit()


            db.refresh(
                staff
            )


            return staff


        except Exception:

            db.rollback()

            raise