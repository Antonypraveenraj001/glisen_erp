from app.database.session import SessionLocal
from app.models.final_bill import FinalBill
from app.services.final_bill_service import FinalBillService


def main():
    db = SessionLocal()

    try:
        final_bills = (
            db.query(FinalBill)
            .order_by(FinalBill.id.asc())
            .all()
        )

        if not final_bills:
            print("No final bills found.")
            return

        print(
            f"Found {len(final_bills)} final bills."
        )

        for final_bill in final_bills:
            print(
                f"Recalculating "
                f"{final_bill.invoice_number}..."
            )

            FinalBillService.recalculate_bill_totals(
                db=db,
                final_bill=final_bill,
            )

            print(
                f"  CGST: {final_bill.cgst_amount}"
            )
            print(
                f"  SGST: {final_bill.sgst_amount}"
            )
            print(
                f"  IGST: {final_bill.igst_amount}"
            )
            print(
                f"  GST: {final_bill.tax_amount}"
            )
            print(
                f"  Grand Total: "
                f"{final_bill.grand_total}"
            )

        db.commit()

        print()
        print(
            "Final Bill GST recalculation "
            "completed successfully."
        )

    except Exception as exc:
        db.rollback()

        print()
        print(
            "GST recalculation failed:"
        )
        print(str(exc))

        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()