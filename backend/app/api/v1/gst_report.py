from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from fastapi.responses import (
    StreamingResponse,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
)
from app.dependencies.database import (
    get_db,
)
from app.schemas.gst_report import (
    GSTReportResponse,
    PurchaseGSTReportResponse,
)
from app.services.gst_report_excel_service import (
    GSTReportExcelService,
)
from app.services.gst_report_service import (
    GSTReportService,
)


router = APIRouter(
    prefix="/gst-report",
    tags=[
        "GST Report",
    ],
)


# ================================================================
# SALES GST
# ================================================================

@router.get(
    "",
    response_model=GSTReportResponse,
)
def get_gst_report(
    start_date: date | None = Query(
        None,
        description="Report start date",
    ),
    end_date: date | None = Query(
        None,
        description="Report end date",
    ),
    db: Session = Depends(
        get_db
    ),
    current_user=Depends(
        get_current_user
    ),
):
    try:

        return (
            GSTReportService
            .get_report(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# SALES GST EXCEL
# ================================================================

@router.get(
    "/export-excel",
    response_class=StreamingResponse,
)
def export_gst_report_excel(
    start_date: date | None = Query(
        None,
        description="Report start date",
    ),
    end_date: date | None = Query(
        None,
        description="Report end date",
    ),
    db: Session = Depends(
        get_db
    ),
    current_user=Depends(
        get_current_user
    ),
):
    try:

        report = (
            GSTReportService
            .get_report(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )


        excel_file = (
            GSTReportExcelService
            .build_excel(
                report=report
            )
        )


        if (
            start_date
            and end_date
        ):

            filename = (
                "sales_gst_"
                f"{start_date.isoformat()}_to_"
                f"{end_date.isoformat()}.xlsx"
            )

        else:

            filename = (
                "sales_gst_report.xlsx"
            )


        return StreamingResponse(
            excel_file,
            media_type=(
                "application/"
                "vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{filename}"'
                )
            },
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# PURCHASE GST
# ================================================================

@router.get(
    "/purchase",
    response_model=(
        PurchaseGSTReportResponse
    ),
)
def get_purchase_gst_report(
    start_date: date | None = Query(
        None,
        description="Report start date",
    ),
    end_date: date | None = Query(
        None,
        description="Report end date",
    ),
    db: Session = Depends(
        get_db
    ),
    current_user=Depends(
        get_current_user
    ),
):
    try:

        return (
            GSTReportService
            .get_purchase_report(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# PURCHASE GST EXCEL
# ================================================================

@router.get(
    "/purchase/export-excel",
    response_class=StreamingResponse,
)
def export_purchase_gst_excel(
    start_date: date | None = Query(
        None,
        description="Report start date",
    ),
    end_date: date | None = Query(
        None,
        description="Report end date",
    ),
    db: Session = Depends(
        get_db
    ),
    current_user=Depends(
        get_current_user
    ),
):
    try:

        report = (
            GSTReportService
            .get_purchase_report(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )


        excel_file = (
            GSTReportExcelService
            .build_purchase_excel(
                report=report
            )
        )


        if (
            start_date
            and end_date
        ):

            filename = (
                "purchase_gst_"
                f"{start_date.isoformat()}_to_"
                f"{end_date.isoformat()}.xlsx"
            )

        else:

            filename = (
                "purchase_gst_report.xlsx"
            )


        return StreamingResponse(
            excel_file,
            media_type=(
                "application/"
                "vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{filename}"'
                )
            },
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc