class ProductMapper:

    @staticmethod
    def get_unit(unit: str) -> str:

        if not unit:
            return "NOS"

        unit = unit.strip().upper()

        mapping = {
            "KG": "KG",
            "KGS": "KG",
            "NOS": "NOS",
            "NO": "NOS",
            "PCS": "NOS",
            "PIECES": "NOS",
            "PC": "NOS",
            "MTR": "MTR",
            "METER": "MTR",
            "METERS": "MTR",
            "LTR": "LTR",
            "LITER": "LTR",
            "LITRE": "LTR",
            "BOX": "BOX",
            "SET": "SET",
        }

        return mapping.get(unit, "NOS")

    @staticmethod
    def get_category(
        product_name: str,
        description: str,
    ) -> str:

        text = (
            f"{product_name} {description}"
        ).lower()

        if any(
            word in text
            for word in [
                "round bar",
                "flat bar",
                "sheet",
                "plate",
                "pipe",
                "rod",
                "steel",
                "aluminium",
                "aluminum",
                "ms ",
                "ss ",
            ]
        ):
            return "Raw Material"

        if "bearing" in text:
            return "Bearing"

        if any(
            word in text
            for word in [
                "bolt",
                "nut",
                "washer",
                "screw",
            ]
        ):
            return "Hardware"

        if any(
            word in text
            for word in [
                "motor",
                "pump",
                "gearbox",
                "compressor",
            ]
        ):
            return "Machinery"

        if any(
            word in text
            for word in [
                "tool",
                "drill",
                "cutter",
            ]
        ):
            return "Tool"

        if any(
            word in text
            for word in [
                "oil",
                "grease",
                "lubricant",
            ]
        ):
            return "Consumable"

        return "General"