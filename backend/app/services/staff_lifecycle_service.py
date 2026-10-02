from datetime import (
    date,
    timedelta,
)

from sqlalchemy.orm import Session

from app.models.staff import Staff
from app.models.staff_salary_rate import (
    StaffSalaryRate,
)


class StaffLifecycleService:

    @staticmethod
    def get_visible_staff(
        db: Session,
        staff_id: int,
    ) -> Staff:

        staff = (
            db.query(
                Staff
            )
            .filter(
                Staff.id == staff_id,
                Staff.is_deleted.is_(False),
            )
            .first()
        )

        if staff is None:
            raise ValueError(
                "Staff member not found."
            )

        return staff


    @staticmethod
    def get_latest_salary_rate(
        db: Session,
        staff_id: int,
    ) -> StaffSalaryRate | None:

        return (
            db.query(
                StaffSalaryRate
            )
            .filter(
                StaffSalaryRate.staff_id
                == staff_id
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
    def reactivate(
        db: Session,
        staff_id: int,
    ) -> Staff:

        staff = (
            StaffLifecycleService
            .get_visible_staff(
                db=db,
                staff_id=staff_id,
            )
        )

        if staff.is_active:
            return staff

        today = date.today()

        latest_rate = (
            StaffLifecycleService
            .get_latest_salary_rate(
                db=db,
                staff_id=staff.id,
            )
        )

        staff.is_active = True
        staff.relieving_date = None

        if latest_rate is None:

            db.add(
                StaffSalaryRate(
                    staff_id=staff.id,
                    monthly_salary=(
                        staff.monthly_salary
                    ),
                    effective_from=today,
                    effective_to=None,
                )
            )

        elif (
            latest_rate.effective_to
            is not None
        ):

            # If the employee was just marked inactive,
            # reactivation behaves as an undo and reopens
            # the same salary period.
            if (
                latest_rate.effective_to
                >=
                today - timedelta(days=1)
            ):

                latest_rate.effective_to = None

            else:

                existing_today_rate = (
                    db.query(
                        StaffSalaryRate
                    )
                    .filter(
                        StaffSalaryRate.staff_id
                        == staff.id,

                        StaffSalaryRate
                        .effective_from
                        == today,
                    )
                    .first()
                )

                if existing_today_rate:

                    existing_today_rate.monthly_salary = (
                        staff.monthly_salary
                    )

                    existing_today_rate.effective_to = None

                else:

                    db.add(
                        StaffSalaryRate(
                            staff_id=staff.id,
                            monthly_salary=(
                                staff.monthly_salary
                            ),
                            effective_from=today,
                            effective_to=None,
                        )
                    )

        try:

            db.commit()
            db.refresh(staff)
            return staff

        except Exception:

            db.rollback()
            raise


    @staticmethod
    def delete_from_master(
        db: Session,
        staff_id: int,
    ) -> None:

        staff = (
            StaffLifecycleService
            .get_visible_staff(
                db=db,
                staff_id=staff_id,
            )
        )

        today = date.today()

        staff.is_deleted = True
        staff.is_active = False

        if staff.relieving_date is None:
            staff.relieving_date = today

        latest_rate = (
            StaffLifecycleService
            .get_latest_salary_rate(
                db=db,
                staff_id=staff.id,
            )
        )

        if (
            latest_rate is not None
            and
            latest_rate.effective_to is None
        ):

            latest_rate.effective_to = (
                staff.relieving_date
                or today
            )

        try:

            db.commit()

        except Exception:

            db.rollback()
            raise
