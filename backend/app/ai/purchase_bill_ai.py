import base64
import json

from app.ai.client import client


class PurchaseBillAI:

    @staticmethod
    async def extract_purchase_bill(
        file_bytes: bytes,
        filename: str,
    ):

        image_base64 = base64.b64encode(
            file_bytes,
        ).decode("utf-8")

        response = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are an AI assistant for Glisen ERP.\n\n"
                        "Return ONLY valid JSON.\n\n"
                        "Use EXACTLY this structure:\n\n"
                        "{\n"
                        '  "supplier": {\n'
                        '    "company_name": "",\n'
                        '    "contact_person": "",\n'
                        '    "email": "",\n'
                        '    "phone": "",\n'
                        '    "gst_number": "",\n'
                        '    "address": "",\n'
                        '    "city": "",\n'
                        '    "state": "",\n'
                        '    "pincode": ""\n'
                        "  },\n"
                        '  "purchase_bill": {\n'
                        '    "bill_number": "",\n'
                        '    "bill_date": "",\n'
                        '    "subtotal": 0,\n'
                        '    "total_gst": 0,\n'
                        '    "grand_total": 0,\n'
                        '    "remarks": ""\n'
                        "  },\n"
                        '  "products": []\n'
                        "}\n\n"
                        "Do not use supplier_details, purchase_bill_details "
                        "or product_line_items."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Extract all purchase bill information "
                                "from this document."
                            ),
                        },
                        {
                            "type": "input_image",
                            "image_url": (
                                f"data:image/jpeg;base64,{image_base64}"
                            ),
                        },
                    ],
                },
            ],
        )

        response_text = response.output_text.strip()

        if response_text.startswith("```json"):
            response_text = response_text.replace(
                "```json",
                "",
                1,
            )

        if response_text.endswith("```"):
            response_text = response_text[:-3]

        response_text = response_text.strip()

        try:
            extracted_data = json.loads(
                response_text,
            )

            # Backward compatibility with old AI responses
            if "supplier_details" in extracted_data:

                supplier = extracted_data.get(
                    "supplier_details",
                    {},
                )

                bill = extracted_data.get(
                    "purchase_bill_details",
                    {},
                )

                items = extracted_data.get(
                    "product_line_items",
                    [],
                )

                extracted_data = {
                    "supplier": {
                        "company_name": supplier.get(
                            "name",
                            "",
                        ),
                        "contact_person": "",
                        "email": supplier.get(
                            "email",
                            "",
                        ),
                        "phone": supplier.get(
                            "phone",
                            "",
                        ),
                        "gst_number": supplier.get(
                            "gstin",
                            "",
                        ),
                        "address": supplier.get(
                            "address",
                            "",
                        ),
                        "city": "",
                        "state": "",
                        "pincode": "",
                    },
                    "purchase_bill": {
                        "bill_number": bill.get(
                            "bill_no",
                            bill.get(
                                "bill_number",
                                "",
                            ),
                        ),
                        "bill_date": bill.get(
                            "bill_date",
                            "",
                        ),
                        "subtotal": 0,
                        "total_gst": 0,
                        "grand_total": bill.get(
                            "total_amount",
                            0,
                        ),
                        "remarks": "",
                    },
                    "products": [],
                }

                for item in items:
                    extracted_data["products"].append(
                        {
                            "product_name": item.get(
                                "description",
                                "",
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
                                "",
                            ),
                            "quantity": item.get(
                                "quantity",
                                0,
                            ),
                            "purchase_price": item.get(
                                "rate",
                                0,
                            ),
                            "gst_percentage": 0,
                            "line_total": item.get(
                                "amount",
                                0,
                            ),
                        }
                    )

        except Exception:
            extracted_data = {
                "supplier": {
                    "company_name": "",
                    "contact_person": "",
                    "email": "",
                    "phone": "",
                    "gst_number": "",
                    "address": "",
                    "city": "",
                    "state": "",
                    "pincode": "",
                },
                "purchase_bill": {
                    "bill_number": "",
                    "bill_date": "",
                    "subtotal": 0,
                    "total_gst": 0,
                    "grand_total": 0,
                    "remarks": "",
                },
                "products": [],
            }

        return {
            "status": "success",
            "filename": filename,
            "data": extracted_data,
        }