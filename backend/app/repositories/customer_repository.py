from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.customer import Customer


class CustomerRepository:

    @staticmethod
    def create(
        db: Session,
        customer: Customer,
    ):
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):
        query = db.query(Customer)

        if search:
            keyword = f"%{search}%"

            query = query.filter(
                or_(
                    Customer.customer_code.ilike(keyword),
                    Customer.company_name.ilike(keyword),
                    Customer.contact_person.ilike(keyword),
                    Customer.phone.ilike(keyword),
                )
            )

        return (
            query.order_by(Customer.company_name)
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        customer_id: int,
    ):
        return (
            db.query(Customer)
            .filter(Customer.id == customer_id)
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        customer: Customer,
    ):
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def deactivate(
        db: Session,
        customer: Customer,
    ):
        customer.is_active = False

        db.commit()
        db.refresh(customer)

        return customer