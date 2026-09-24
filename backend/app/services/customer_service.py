from sqlalchemy.orm import Session

from app.repositories.customer_repository import (
    CustomerRepository,
)

from app.schemas.customer import (
    CustomerUpdate,
)


class CustomerService:

    # ============================================================
    # GET ALL
    # ============================================================

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):

        return (
            CustomerRepository
            .get_all(
                db,
                search,
            )
        )

    # ============================================================
    # GET BY ID
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        customer_id: int,
    ):

        return (
            CustomerRepository
            .get_by_id(
                db,
                customer_id,
            )
        )

    # ============================================================
    # UPDATE DIRECTORY DETAILS
    #
    # Customer Code, GSTIN and is_active are intentionally NOT
    # editable here.
    #
    # GSTIN/customer identity must originate from Enquiry.
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        customer_id: int,
        customer_data: CustomerUpdate,
    ):

        customer = (
            CustomerRepository
            .get_by_id(
                db,
                customer_id,
            )
        )

        if (
            customer
            is None
        ):
            return None

        update_data = (
            customer_data
            .model_dump(
                exclude_unset=True
            )
        )

        allowed_fields = {
            "company_name",
            "contact_person",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "pincode",
        }

        for (
            field_name,
            value,
        ) in update_data.items():

            if (
                field_name
                not in allowed_fields
            ):
                continue

            if (
                field_name
                == "company_name"
            ):

                if (
                    value is None
                    or
                    not value.strip()
                ):
                    raise ValueError(
                        "Company name cannot be empty."
                    )

                value = (
                    value.strip()
                )

            setattr(
                customer,
                field_name,
                value,
            )

        return (
            CustomerRepository
            .update(
                db,
                customer,
            )
        )