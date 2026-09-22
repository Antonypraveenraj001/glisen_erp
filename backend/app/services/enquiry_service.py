from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.final_bill import FinalBill
from app.models.proforma import Proforma

from app.repositories.enquiry_repository import (
    EnquiryRepository,
)

from app.schemas.enquiry import (
    EnquiryCreate,
    EnquiryUpdate,
)


class EnquiryService:

    # ============================================================
    # NORMALIZE GSTIN
    # ============================================================

    @staticmethod
    def _normalize_gst_number(
        gst_number: str | None,
    ) -> str:

        normalized = (
            gst_number
            or ""
        ).strip().upper()

        if not normalized:
            raise ValueError(
                "GST Number is required."
            )

        return normalized

    # ============================================================
    # CUSTOMER CODE
    # ============================================================

    @staticmethod
    def _generate_customer_code(
        db: Session,
    ) -> str:

        customers = (
            db.query(
                Customer.customer_code
            )
            .filter(
                Customer.customer_code.like(
                    "CUST%"
                )
            )
            .all()
        )

        highest_number = 0

        for row in customers:

            code = (
                row[0]
                or ""
            ).strip().upper()

            suffix = (
                code[4:]
                if code.startswith(
                    "CUST"
                )
                else ""
            )

            if (
                suffix.isdigit()
            ):

                highest_number = max(
                    highest_number,
                    int(
                        suffix
                    ),
                )

        next_number = (
            highest_number
            + 1
        )

        return (
            f"CUST{next_number:03d}"
        )

    # ============================================================
    # FIND CUSTOMER BY GSTIN
    # ============================================================

    @staticmethod
    def _find_customer_by_gst(
        db: Session,
        gst_number: str,
    ) -> Customer | None:

        normalized_gst = (
            EnquiryService
            ._normalize_gst_number(
                gst_number
            )
        )

        return (
            db.query(Customer)
            .filter(
                func.upper(
                    func.trim(
                        Customer.gst_number
                    )
                )
                == normalized_gst
            )
            .first()
        )

    # ============================================================
    # CREATE OR REUSE CUSTOMER
    # ============================================================

    @staticmethod
    def _get_or_create_customer(
        db: Session,
        *,
        company_name: str,
        gst_number: str,
        contact_person: str | None,
        phone: str | None,
        email: str | None,
        address: str | None,
        city: str | None,
        state: str | None,
        pincode: str | None,
    ) -> Customer:

        normalized_gst = (
            EnquiryService
            ._normalize_gst_number(
                gst_number
            )
        )

        customer = (
            EnquiryService
            ._find_customer_by_gst(
                db=db,
                gst_number=(
                    normalized_gst
                ),
            )
        )

        # ========================================================
        # EXISTING CUSTOMER
        #
        # Update master with the latest Enquiry details.
        # is_active is intentionally NOT used to block anything.
        # ========================================================

        if (
            customer
            is not None
        ):

            customer.company_name = (
                company_name.strip()
            )

            customer.contact_person = (
                contact_person
            )

            customer.phone = (
                phone
            )

            customer.email = (
                email
            )

            customer.gst_number = (
                normalized_gst
            )

            customer.address = (
                address
            )

            customer.city = (
                city
            )

            customer.state = (
                state
            )

            customer.pincode = (
                pincode
            )

            db.flush()

            return customer

        # ========================================================
        # NEW CUSTOMER
        # ========================================================

        customer = Customer(
            customer_code=(
                EnquiryService
                ._generate_customer_code(
                    db
                )
            ),
            company_name=(
                company_name.strip()
            ),
            contact_person=(
                contact_person
            ),
            phone=(
                phone
            ),
            email=(
                email
            ),
            gst_number=(
                normalized_gst
            ),
            address=(
                address
            ),
            city=(
                city
            ),
            state=(
                state
            ),
            pincode=(
                pincode
            ),

            # Kept only as legacy/archive metadata.
            # It must not control sales or billing.
            is_active=True,
        )

        db.add(
            customer
        )

        db.flush()

        return customer

    # ============================================================
    # ENQUIRY NUMBER
    # ============================================================

    @staticmethod
    def _generate_enquiry_number(
        db: Session,
    ) -> str:

        current_year = (
            datetime.now().year
        )

        prefix = (
            f"ENQ-{current_year}-"
        )

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

        if (
            existing
            is None
        ):

            sequence = 1

        else:

            try:

                sequence = (
                    int(
                        existing
                        .enquiry_number
                        .split(
                            "-"
                        )[-1]
                    )
                    + 1
                )

            except (
                ValueError,
                IndexError,
            ):

                sequence = 1

        return (
            f"{prefix}{sequence:04d}"
        )

    # ============================================================
    # CREATE ENQUIRY
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        enquiry_data: EnquiryCreate,
    ):

        try:

            gst_number = (
                EnquiryService
                ._normalize_gst_number(
                    enquiry_data
                    .gst_number
                )
            )

            customer = (
                EnquiryService
                ._get_or_create_customer(
                    db=db,
                    company_name=(
                        enquiry_data
                        .company_name
                    ),
                    gst_number=(
                        gst_number
                    ),
                    contact_person=(
                        enquiry_data
                        .contact_person
                    ),
                    phone=(
                        enquiry_data
                        .phone
                    ),
                    email=(
                        enquiry_data
                        .email
                    ),
                    address=(
                        enquiry_data
                        .address
                    ),
                    city=(
                        enquiry_data
                        .city
                    ),
                    state=(
                        enquiry_data
                        .state
                    ),
                    pincode=(
                        enquiry_data
                        .pincode
                    ),
                )
            )

            enquiry_number = (
                EnquiryService
                ._generate_enquiry_number(
                    db
                )
            )

            enquiry = Enquiry(
                enquiry_number=(
                    enquiry_number
                ),
                enquiry_date=(
                    enquiry_data
                    .enquiry_date
                ),
                customer_id=(
                    customer.id
                ),
                company_name=(
                    enquiry_data
                    .company_name
                    .strip()
                ),
                contact_person=(
                    enquiry_data
                    .contact_person
                ),
                phone=(
                    enquiry_data
                    .phone
                ),
                email=(
                    enquiry_data
                    .email
                ),
                gst_number=(
                    gst_number
                ),
                address=(
                    enquiry_data
                    .address
                ),
                city=(
                    enquiry_data
                    .city
                ),
                state=(
                    enquiry_data
                    .state
                ),
                pincode=(
                    enquiry_data
                    .pincode
                ),
                machine_name=(
                    enquiry_data
                    .machine_name
                ),
                machine_model=(
                    enquiry_data
                    .machine_model
                ),
                application=(
                    enquiry_data
                    .application
                ),
                quantity=(
                    enquiry_data
                    .quantity
                ),
                requirements=(
                    enquiry_data
                    .requirements
                ),
                remarks=(
                    enquiry_data
                    .remarks
                ),
                status=(
                    enquiry_data
                    .status
                ),
            )

            db.add(
                enquiry
            )

            db.commit()

            db.refresh(
                enquiry
            )

            return (
                enquiry,
                None,
            )

        except ValueError as exc:

            db.rollback()

            return (
                None,
                str(
                    exc
                ),
            )

        except Exception:

            db.rollback()

            raise

    # ============================================================
    # GET ALL
    # ============================================================

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
        status: str | None = None,
    ):

        return (
            EnquiryRepository
            .get_all(
                db,
                search,
                status,
            )
        )

    # ============================================================
    # GET BY ID
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        enquiry_id: int,
    ):

        return (
            EnquiryRepository
            .get_by_id(
                db,
                enquiry_id,
            )
        )

    # ============================================================
    # UPDATE ENQUIRY
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        enquiry_id: int,
        enquiry_data: EnquiryUpdate,
    ):

        try:

            enquiry = (
                EnquiryRepository
                .get_by_id(
                    db,
                    enquiry_id,
                )
            )

            if (
                enquiry
                is None
            ):

                return (
                    None,
                    "Enquiry not found",
                )

            update_data = (
                enquiry_data
                .model_dump(
                    exclude_unset=True
                )
            )

            # ====================================================
            # BUILD FINAL CUSTOMER SNAPSHOT
            # ====================================================

            company_name = (
                update_data.get(
                    "company_name",
                    enquiry.company_name,
                )
            )

            gst_number = (
                update_data.get(
                    "gst_number",
                    enquiry.gst_number,
                )
            )

            contact_person = (
                update_data.get(
                    "contact_person",
                    enquiry.contact_person,
                )
            )

            phone = (
                update_data.get(
                    "phone",
                    enquiry.phone,
                )
            )

            email = (
                update_data.get(
                    "email",
                    enquiry.email,
                )
            )

            address = (
                update_data.get(
                    "address",
                    enquiry.address,
                )
            )

            city = (
                update_data.get(
                    "city",
                    enquiry.city,
                )
            )

            state = (
                update_data.get(
                    "state",
                    enquiry.state,
                )
            )

            pincode = (
                update_data.get(
                    "pincode",
                    enquiry.pincode,
                )
            )

            normalized_gst = (
                EnquiryService
                ._normalize_gst_number(
                    gst_number
                )
            )

            # ====================================================
            # CREATE / REUSE CUSTOMER BY GSTIN
            # ====================================================

            customer = (
                EnquiryService
                ._get_or_create_customer(
                    db=db,
                    company_name=(
                        company_name
                    ),
                    gst_number=(
                        normalized_gst
                    ),
                    contact_person=(
                        contact_person
                    ),
                    phone=(
                        phone
                    ),
                    email=(
                        email
                    ),
                    address=(
                        address
                    ),
                    city=(
                        city
                    ),
                    state=(
                        state
                    ),
                    pincode=(
                        pincode
                    ),
                )
            )

            # ====================================================
            # UPDATE ENQUIRY
            # ====================================================

            enquiry.customer_id = (
                customer.id
            )

            for (
                field,
                value,
            ) in update_data.items():

                setattr(
                    enquiry,
                    field,
                    value,
                )

            # Always store normalized GST.
            enquiry.gst_number = (
                normalized_gst
            )

            # ====================================================
            # SYNC UNBILLED PROFORMAS
            #
            # If customer identity was corrected in Enquiry,
            # existing unbilled Proformas must follow it.
            #
            # Once an original Final Bill exists, transaction
            # history is left untouched.
            # ====================================================

            proformas = (
                db.query(Proforma)
                .filter(
                    Proforma.enquiry_id
                    == enquiry.id
                )
                .all()
            )

            for proforma in proformas:

                existing_final_bill = (
                    db.query(
                        FinalBill.id
                    )
                    .filter(
                        FinalBill.proforma_id
                        == proforma.id,

                        FinalBill.parent_invoice_id
                        .is_(None),
                    )
                    .first()
                )

                if (
                    existing_final_bill
                    is not None
                ):
                    continue

                proforma.customer_id = (
                    customer.id
                )

                proforma.company_name = (
                    company_name
                )

                proforma.contact_person = (
                    contact_person
                )

                proforma.phone = (
                    phone
                )

                proforma.email = (
                    email
                )

                if (
                    address
                ):

                    proforma.billing_address = (
                        address
                    )

                    proforma.shipping_address = (
                        address
                    )

            db.commit()

            db.refresh(
                enquiry
            )

            return (
                enquiry,
                None,
            )

        except ValueError as exc:

            db.rollback()

            return (
                None,
                str(
                    exc
                ),
            )

        except Exception:

            db.rollback()

            raise

    # ============================================================
    # DELETE
    # ============================================================

    @staticmethod
    def delete(
        db: Session,
        enquiry_id: int,
    ):

        enquiry = (
            EnquiryRepository
            .get_by_id(
                db,
                enquiry_id,
            )
        )

        if (
            enquiry
            is None
        ):
            return None

        EnquiryRepository.delete(
            db,
            enquiry,
        )

        return enquiry