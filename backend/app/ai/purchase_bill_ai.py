import base64
import json

from app.ai.client import client
from app.ai.prompts.purchase_bill_prompt import (
    PURCHASE_BILL_PROMPT,
)


class PurchaseBillAI:

    @staticmethod
    async def extract_purchase_bill(
        file_bytes: bytes,
        filename: str,
    ):

        image_base64 = base64.b64encode(
            file_bytes
        ).decode("utf-8")

        response = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "system",
                    "content": PURCHASE_BILL_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Extract all purchase bill "
                                "information from this document "
                                "according to the required JSON "
                                "structure and calculation rules."
                            ),
                        },
                        {
                            "type": "input_image",
                            "image_url": (
                                "data:image/jpeg;base64,"
                                f"{image_base64}"
                            ),
                        },
                    ],
                },
            ],
        )

        response_text = (
            response.output_text.strip()
        )

        # ----------------------------------------
        # Remove accidental Markdown JSON fences
        # ----------------------------------------

        if response_text.startswith(
            "```json"
        ):
            response_text = (
                response_text[
                    len("```json"):
                ]
            )

        elif response_text.startswith(
            "```"
        ):
            response_text = (
                response_text[
                    len("```"):
                ]
            )

        if response_text.endswith(
            "```"
        ):
            response_text = (
                response_text[:-3]
            )

        response_text = response_text.strip()

        # ----------------------------------------
        # Parse AI JSON
        # ----------------------------------------

        try:
            extracted_data = json.loads(
                response_text
            )

        except json.JSONDecodeError as exc:

            raise ValueError(
                "Purchase Bill AI returned "
                "invalid JSON."
            ) from exc

        # ----------------------------------------
        # Ensure required top-level structure
        # ----------------------------------------

        if not isinstance(
            extracted_data,
            dict,
        ):
            raise ValueError(
                "Purchase Bill AI returned "
                "an invalid response structure."
            )

        if "supplier" not in extracted_data:
            extracted_data["supplier"] = {}

        if "purchase_bill" not in extracted_data:
            extracted_data[
                "purchase_bill"
            ] = {}

        if "products" not in extracted_data:
            extracted_data["products"] = []

        # ----------------------------------------
        # Supplier defaults
        # ----------------------------------------

        supplier = extracted_data[
            "supplier"
        ]

        if not isinstance(
            supplier,
            dict,
        ):
            supplier = {}

        supplier_defaults = {
            "company_name": "",
            "contact_person": "",
            "email": "",
            "phone": "",
            "gst_number": "",
            "address": "",
            "city": "",
            "state": "",
            "pincode": "",
        }

        for field, default in (
            supplier_defaults.items()
        ):
            supplier.setdefault(
                field,
                default,
            )

        extracted_data[
            "supplier"
        ] = supplier

        # ----------------------------------------
        # Purchase bill defaults
        # ----------------------------------------

        purchase_bill = (
            extracted_data[
                "purchase_bill"
            ]
        )

        if not isinstance(
            purchase_bill,
            dict,
        ):
            purchase_bill = {}

        purchase_bill_defaults = {
            "bill_number": "",
            "bill_date": "",
            "subtotal": 0,
            "total_gst": 0,
            "grand_total": 0,
            "remarks": "",
        }

        for field, default in (
            purchase_bill_defaults.items()
        ):
            purchase_bill.setdefault(
                field,
                default,
            )

        extracted_data[
            "purchase_bill"
        ] = purchase_bill

        # ----------------------------------------
        # Product defaults
        # ----------------------------------------

        products = extracted_data[
            "products"
        ]

        if not isinstance(
            products,
            list,
        ):
            products = []

        normalized_products = []

        product_defaults = {
            "product_name": "",
            "description": "",
            "hsn_code": "",
            "unit": "",
            "quantity": 0,
            "purchase_price": 0,
            "gst_percentage": 0,
            "line_total": 0,
        }

        for product in products:

            if not isinstance(
                product,
                dict,
            ):
                continue

            normalized_product = {}

            for field, default in (
                product_defaults.items()
            ):
                normalized_product[
                    field
                ] = product.get(
                    field,
                    default,
                )

            normalized_products.append(
                normalized_product
            )

        extracted_data[
            "products"
        ] = normalized_products

        # ----------------------------------------
        # Backward compatibility
        #
        # Supports older AI response names
        # if they are ever returned.
        # ----------------------------------------

        if (
            not extracted_data["supplier"]
            and "supplier_details"
            in extracted_data
        ):

            old_supplier = (
                extracted_data.get(
                    "supplier_details",
                    {},
                )
            )

            extracted_data[
                "supplier"
            ] = {
                "company_name": old_supplier.get(
                    "name",
                    "",
                ),
                "contact_person": "",
                "email": old_supplier.get(
                    "email",
                    "",
                ),
                "phone": old_supplier.get(
                    "phone",
                    "",
                ),
                "gst_number": old_supplier.get(
                    "gstin",
                    "",
                ),
                "address": old_supplier.get(
                    "address",
                    "",
                ),
                "city": "",
                "state": "",
                "pincode": "",
            }

        if (
            not extracted_data[
                "purchase_bill"
            ]
            and "purchase_bill_details"
            in extracted_data
        ):

            old_bill = (
                extracted_data.get(
                    "purchase_bill_details",
                    {},
                )
            )

            extracted_data[
                "purchase_bill"
            ] = {
                "bill_number": old_bill.get(
                    "bill_number",
                    old_bill.get(
                        "bill_no",
                        "",
                    ),
                ),
                "bill_date": old_bill.get(
                    "bill_date",
                    "",
                ),
                "subtotal": old_bill.get(
                    "subtotal",
                    0,
                ),
                "total_gst": old_bill.get(
                    "total_gst",
                    0,
                ),
                "grand_total": old_bill.get(
                    "total_amount",
                    0,
                ),
                "remarks": old_bill.get(
                    "remarks",
                    "",
                ),
            }

        if (
            not extracted_data["products"]
            and "product_line_items"
            in extracted_data
        ):

            old_items = (
                extracted_data.get(
                    "product_line_items",
                    [],
                )
            )

            converted_products = []

            for item in old_items:

                if not isinstance(
                    item,
                    dict,
                ):
                    continue

                converted_products.append(
                    {
                        "product_name": item.get(
                            "product_name",
                            item.get(
                                "description",
                                "",
                            ),
                        ),
                        "description": item.get(
                            "description",
                            "",
                        ),
                        "hsn_code": str(
                            item.get(
                                "hsn_code",
                                "",
                            )
                        ),
                        "unit": item.get(
                            "uom",
                            item.get(
                                "unit",
                                "",
                            ),
                        ),
                        "quantity": item.get(
                            "quantity",
                            0,
                        ),
                        "purchase_price": item.get(
                            "rate",
                            item.get(
                                "purchase_price",
                                0,
                            ),
                        ),
                        "gst_percentage": item.get(
                            "gst_percentage",
                            0,
                        ),
                        "line_total": item.get(
                            "amount",
                            item.get(
                                "line_total",
                                0,
                            ),
                        ),
                    }
                )

            extracted_data[
                "products"
            ] = converted_products

        # ----------------------------------------
        # Normalize simple values
        # ----------------------------------------

        for product in extracted_data[
            "products"
        ]:

            product["product_name"] = str(
                product.get(
                    "product_name",
                    "",
                )
            ).strip()

            product["description"] = str(
                product.get(
                    "description",
                    "",
                )
            ).strip()

            product["hsn_code"] = str(
                product.get(
                    "hsn_code",
                    "",
                )
            ).strip()

            product["unit"] = str(
                product.get(
                    "unit",
                    "",
                )
            ).strip()

        return {
            "status": "success",
            "filename": filename,
            "data": extracted_data,
        }