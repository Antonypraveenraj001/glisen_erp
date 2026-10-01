from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.responses import (
    Response,
)

from app.dependencies.permissions import (
    require_any_permission,
)

from app.models.user import (
    User,
)

from app.schemas.pdf_document import (
    PdfDocumentRenderRequest,
)

from app.services.pdf_document_service import (
    PdfDocumentService,
)


router = APIRouter(
    prefix="/documents",
    tags=[
        "PDF Documents",
    ],
)


# ================================================================
# RENDER ERP DOCUMENT AS PDF
#
# Used by:
#
#     Proforma
#     Final Billing
#
# The frontend first builds the exact same A4 HTML used for Print.
#
# This endpoint only converts that HTML into PDF.
# ================================================================

@router.post(
    "/pdf",
)
async def render_pdf_document(
    payload:
        PdfDocumentRenderRequest,

    current_user: User = Depends(
        require_any_permission(
            "proformas.view",
            "final_billing.view",
        )
    ),
):

    try:

        pdf_bytes = (
            await PdfDocumentService
            .render_html(
                payload.html
            )
        )

        return Response(
            content=pdf_bytes,

            media_type=(
                "application/pdf"
            ),

            headers={
                "Content-Disposition":
                    'attachment; filename="document.pdf"',
            },
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),

            detail=str(
                exc
            ),
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),

            detail=str(
                exc
            ),
        ) from exc