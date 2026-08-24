from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.enquiry import Enquiry


class EnquiryRepository:

    @staticmethod
    def create(
        db: Session,
        enquiry: Enquiry,
    ):
        db.add(enquiry)
        db.commit()
        db.refresh(enquiry)

        return enquiry

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
        status: str | None = None,
    ):
        query = db.query(Enquiry)

        if search:
            keyword = f"%{search}%"

            query = query.filter(
                or_(
                    Enquiry.enquiry_number.ilike(keyword),
                    Enquiry.company_name.ilike(keyword),
                    Enquiry.contact_person.ilike(keyword),
                    Enquiry.phone.ilike(keyword),
                    Enquiry.machine_name.ilike(keyword),
                    Enquiry.machine_model.ilike(keyword),
                )
            )

        if status:
            query = query.filter(
                Enquiry.status == status
            )

        return (
            query
            .order_by(
                Enquiry.enquiry_date.desc(),
                Enquiry.id.desc(),
            )
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        enquiry_id: int,
    ):
        return (
            db.query(Enquiry)
            .filter(Enquiry.id == enquiry_id)
            .first()
        )

    @staticmethod
    def get_by_number(
        db: Session,
        enquiry_number: str,
    ):
        return (
            db.query(Enquiry)
            .filter(
                Enquiry.enquiry_number == enquiry_number
            )
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        enquiry: Enquiry,
    ):
        db.commit()
        db.refresh(enquiry)

        return enquiry

    @staticmethod
    def delete(
        db: Session,
        enquiry: Enquiry,
    ):
        db.delete(enquiry)
        db.commit()