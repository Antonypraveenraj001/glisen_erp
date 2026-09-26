from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.staff import Staff


class StaffRepository:

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        staff: Staff,
    ) -> Staff:

        db.add(
            staff
        )

        db.commit()

        db.refresh(
            staff
        )

        return staff

    # ============================================================
    # GET ONE
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        staff_id: int,
    ) -> Staff | None:

        return (
            db.query(
                Staff
            )
            .filter(
                Staff.id
                == staff_id
            )
            .first()
        )

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

        query = (
            db.query(
                Staff
            )
        )

        if active_only:

            query = (
                query.filter(
                    Staff.is_active
                    == True
                )
            )

        if search:

            keyword = (
                f"%{search.strip()}%"
            )

            query = (
                query.filter(
                    or_(
                        Staff.staff_name
                        .ilike(
                            keyword
                        ),

                        Staff.designation
                        .ilike(
                            keyword
                        ),

                        Staff.notes
                        .ilike(
                            keyword
                        ),
                    )
                )
            )

        return (
            query
            .order_by(
                Staff.is_active.desc(),
                Staff.staff_name.asc(),
                Staff.id.asc(),
            )
            .all()
        )

    # ============================================================
    # UPDATE
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        staff: Staff,
    ) -> Staff:

        db.commit()

        db.refresh(
            staff
        )

        return staff