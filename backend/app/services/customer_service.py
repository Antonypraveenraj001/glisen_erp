from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:

    @staticmethod
    def create(
        db: Session,
        customer: CustomerCreate,
    ):

        db_customer = Customer(
            customer_code=customer.customer_code,
            company_name=customer.company_name,
            contact_person=customer.contact_person,
            email=customer.email,
            phone=customer.phone,
            gst_number=customer.gst_number,
            address=customer.address,
            city=customer.city,
            state=customer.state,
            pincode=customer.pincode,
            is_active=customer.is_active,
        )

        return CustomerRepository.create(
            db,
            db_customer,
        )

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):
        return CustomerRepository.get_all(
            db,
            search,
        )

    @staticmethod
    def get_by_id(
        db: Session,
        customer_id: int,
    ):
        return CustomerRepository.get_by_id(
            db,
            customer_id,
        )

    @staticmethod
    def update(
        db: Session,
        customer_id: int,
        customer_data: CustomerUpdate,
    ):
        customer = CustomerRepository.get_by_id(
            db,
            customer_id,
        )

        if customer is None:
            return None

        customer.customer_code = customer_data.customer_code
        customer.company_name = customer_data.company_name
        customer.contact_person = customer_data.contact_person
        customer.email = customer_data.email
        customer.phone = customer_data.phone
        customer.gst_number = customer_data.gst_number
        customer.address = customer_data.address
        customer.city = customer_data.city
        customer.state = customer_data.state
        customer.pincode = customer_data.pincode
        customer.is_active = customer_data.is_active

        return CustomerRepository.update(
            db,
            customer,
        )

    @staticmethod
    def deactivate(
        db: Session,
        customer_id: int,
    ):
        customer = CustomerRepository.get_by_id(
            db,
            customer_id,
        )

        if customer is None:
            return None

        return CustomerRepository.deactivate(
            db,
            customer,
        )