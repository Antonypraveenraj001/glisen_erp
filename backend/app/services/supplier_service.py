from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
)


class SupplierService:

    @staticmethod
    def create(
        db: Session,
        supplier: SupplierCreate,
    ):

        db_supplier = Supplier(
            supplier_code=supplier.supplier_code,
            company_name=supplier.company_name,
            contact_person=supplier.contact_person,
            email=supplier.email,
            phone=supplier.phone,
            gst_number=supplier.gst_number,
            address=supplier.address,
            city=supplier.city,
            state=supplier.state,
            pincode=supplier.pincode,
            is_active=supplier.is_active,
        )

        return SupplierRepository.create(
            db,
            db_supplier,
        )

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):
        return SupplierRepository.get_all(
            db,
            search,
        )

    @staticmethod
    def get_by_id(
        db: Session,
        supplier_id: int,
    ):
        return SupplierRepository.get_by_id(
            db,
            supplier_id,
        )

    @staticmethod
    def update(
        db: Session,
        supplier_id: int,
        supplier_data: SupplierUpdate,
    ):

        supplier = SupplierRepository.get_by_id(
            db,
            supplier_id,
        )

        if supplier is None:
            return None

        supplier.supplier_code = supplier_data.supplier_code
        supplier.company_name = supplier_data.company_name
        supplier.contact_person = supplier_data.contact_person
        supplier.email = supplier_data.email
        supplier.phone = supplier_data.phone
        supplier.gst_number = supplier_data.gst_number
        supplier.address = supplier_data.address
        supplier.city = supplier_data.city
        supplier.state = supplier_data.state
        supplier.pincode = supplier_data.pincode
        supplier.is_active = supplier_data.is_active

        return SupplierRepository.update(
            db,
            supplier,
        )

    @staticmethod
    def deactivate(
        db: Session,
        supplier_id: int,
    ):

        supplier = SupplierRepository.get_by_id(
            db,
            supplier_id,
        )

        if supplier is None:
            return None

        return SupplierRepository.deactivate(
            db,
            supplier,
        )