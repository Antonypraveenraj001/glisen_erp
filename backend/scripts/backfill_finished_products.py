from app.database.session import SessionLocal
from app.models.finished_goods_receipt import FinishedGoodsReceipt
from app.services.finished_product import FinishedProductService


def main():
    db = SessionLocal()

    try:
        service = FinishedProductService(db)

        receipts = (
            db.query(FinishedGoodsReceipt)
            .order_by(FinishedGoodsReceipt.id.asc())
            .all()
        )

        if not receipts:
            print("No Finished Goods Receipts found.")
            return

        print(
            f"Found {len(receipts)} Finished Goods Receipt(s)."
        )

        created_count = 0
        skipped_count = 0

        for receipt in receipts:
            print()
            print(
                f"Checking {receipt.receipt_number}..."
            )

            existing = (
                service.get_by_finished_goods_receipt(
                    receipt.id
                )
            )

            if existing is not None:
                print(
                    "  Skipped - Finished Product already exists:"
                )
                print(
                    f"  {existing.finished_product_number}"
                )

                skipped_count += 1
                continue

            production_order = receipt.production_order

            if production_order is None:
                raise ValueError(
                    f"Production Order not found for "
                    f"{receipt.receipt_number}."
                )

            finished_product = (
                service.create_from_receipt(
                    production_order=production_order,
                    finished_goods_receipt=receipt,
                    created_by=receipt.received_by,
                )
            )

            print(
                "  Created:"
            )
            print(
                f"  {finished_product.finished_product_number}"
            )
            print(
                f"  Production Order ID: "
                f"{finished_product.production_order_id}"
            )
            print(
                f"  Product Master ID: "
                f"{finished_product.product_master_id}"
            )

            created_count += 1

        db.commit()

        print()
        print(
            "Finished Product backfill completed successfully."
        )
        print(
            f"Created: {created_count}"
        )
        print(
            f"Skipped: {skipped_count}"
        )

    except Exception as exc:
        db.rollback()

        print()
        print(
            "Finished Product backfill failed:"
        )
        print(
            str(exc)
        )

        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()