from datetime import datetime

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.repositories.enquiry_repository import EnquiryRepository
from app.schemas.enquiry import EnquiryCreate, EnquiryUpdate


class EnquiryService:

    @staticmethod
    def _generate_enquiry_number(
        db: Session,
    ) -> str:
        current_year = datetime.now().year

        prefix = f"ENQ-{current_year}-"

        existing = (
            db.query(Enquiry)
            .filter(
                Enquiry.enquiry_number.like(
                    f"{prefix}%"
                )
            )
            .order_by(
                Enquiry.id.desc()
            )
            .first()
        )

        if existing is None:
            sequence = 1
        else:
            try:
                sequence = (
                    int(
                        existing.enquiry_number.split("-")[-1]
                    )
                    + 1
                )
            except (ValueError, IndexError):
                sequence = 1

        return f"{prefix}{sequence:04d}"

    @staticmethod
    def create(
        db: Session,
        enquiry_data: EnquiryCreate,
    ):
        customer = (
            db.query(Customer)
            .filter(
                Customer.id == enquiry_data.customer_id
            )
            .first()
        )

        if customer is None:
            return None, "Customer not found"

        enquiry_number = (
            EnquiryService._generate_enquiry_number(db)
        )

        enquiry = Enquiry(
            enquiry_number=enquiry_number,
            enquiry_date=enquiry_data.enquiry_date,
            customer_id=enquiry_data.customer_id,
            company_name=enquiry_data.company_name,
            contact_person=enquiry_data.contact_person,
            phone=enquiry_data.phone,
            email=enquiry_data.email,
            machine_name=enquiry_data.machine_name,
            machine_model=enquiry_data.machine_model,
            application=enquiry_data.application,
            quantity=enquiry_data.quantity,
            requirements=enquiry_data.requirements,
            remarks=enquiry_data.remarks,
            status=enquiry_data.status,
        )

        return (
            EnquiryRepository.create(
                db,
                enquiry,
            ),
            None,
        )

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
        status: str | None = None,
    ):
        return EnquiryRepository.get_all(
            db,
            search,
            status,
        )

    @staticmethod
    def get_by_id(
        db: Session,
        enquiry_id: int,
    ):
        return EnquiryRepository.get_by_id(
            db,
            enquiry_id,
        )

    @staticmethod
    def update(
        db: Session,
        enquiry_id: int,
        enquiry_data: EnquiryUpdate,
    ):
        enquiry = EnquiryRepository.get_by_id(
            db,
            enquiry_id,
        )

        if enquiry is None:
            return None, "Enquiry not found"

        if enquiry_data.customer_id is not None:
            customer = (
                db.query(Customer)
                .filter(
                    Customer.id == enquiry_data.customer_id
                )
                .first()
            )

            if customer is None:
                return None, "Customer not found"

        update_data = enquiry_data.model_dump(
            exclude_unset=True
        )

        for field, value in update_data.items():
            setattr(
                enquiry,
                field,
                value,
            )

        return (
            EnquiryRepository.update(
                db,
                enquiry,
            ),
            None,
        )

    @staticmethod
    def delete(
        db: Session,
        enquiry_id: int,
    ):
        enquiry = EnquiryRepository.get_by_id(
            db,
            enquiry_id,
        )

        if enquiry is None:
            return None

        EnquiryRepository.delete(
            db,
            enquiry,
        )

        return enquiry