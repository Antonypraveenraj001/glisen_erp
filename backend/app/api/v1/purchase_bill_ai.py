from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)

from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)

from app.dependencies.permissions import (
    require_permission,
)

from app.models.user import (
    User,
)

from app.schemas.purchase_bill_ai import (
    PurchaseBillAIBatchResponse,
    PurchaseBillAIBatchStartResponse,
    PurchaseBillAIDataResponse,
    PurchaseBillAIDraftDetailResponse,
    PurchaseBillAIDraftSummaryResponse,
    PurchaseBillAIResponse,
)

from app.schemas.purchase_bill_ai_confirm import (
    PurchaseBillAIConfirmRequest,
)

from app.services.purchase_bill_ai_batch_service import (
    PurchaseBillAIBatchService,
)

from app.services.purchase_bill_ai_confirm_service import (
    PurchaseBillAIConfirmService,
)

from app.services.purchase_bill_ai_service import (
    PurchaseBillAIService,
)


router = APIRouter(
    prefix="/purchase-bills",
    tags=[
        "Purchase Bill Processing"
    ],
)


# ================================================================
# LEGACY SINGLE FILE EXTRACTION
# ================================================================

@router.post(
    "/extract",
    response_model=(
        PurchaseBillAIResponse
    ),
)
async def extract_purchase_bill(
    file:
        UploadFile = File(...),

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    file_bytes = (
        await file.read()
    )

    return (
        await PurchaseBillAIService
        .extract(
            db=db,

            file_bytes=(
                file_bytes
            ),

            filename=(
                file.filename
                or
                "purchase_bill"
            ),
        )
    )


# ================================================================
# MULTI FILE EXTRACTION
# ================================================================

@router.post(
    "/extract-batch",
    response_model=(
        PurchaseBillAIBatchStartResponse
    ),
)
async def extract_purchase_bill_batch(
    background_tasks:
        BackgroundTasks,

    files:
        list[
            UploadFile
        ] = File(...),

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    if not files:

        raise HTTPException(
            status_code=400,

            detail=(
                "At least one Purchase Bill "
                "image is required."
            ),
        )

    prepared_files: list[
        tuple[
            str,
            bytes,
        ]
    ] = []

    for (
        index,
        upload,
    ) in enumerate(
        files,
        start=1,
    ):

        file_bytes = (
            await upload.read()
        )

        filename = (
            upload.filename
            or
            f"purchase_bill_{index}"
        )

        prepared_files.append(
            (
                filename,
                file_bytes,
            )
        )

    try:

        response, work_items = (
            PurchaseBillAIBatchService
            .create_batch(
                db=db,

                current_user_id=(
                    current_user.id
                ),

                files=(
                    prepared_files
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc

    background_tasks.add_task(
        PurchaseBillAIBatchService
        .process_batch,
        work_items,
    )

    return response


# ================================================================
# LIST DRAFTS
# ================================================================

@router.get(
    "/ai-drafts",
    response_model=list[
        PurchaseBillAIDraftSummaryResponse
    ],
)
def list_purchase_bill_ai_drafts(
    status:
        str | None = Query(
            default=None
        ),

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    try:

        return (
            PurchaseBillAIBatchService
            .get_drafts(
                db=db,
                status=status,
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
# GET ONE DRAFT
# ================================================================

@router.get(
    "/ai-drafts/{draft_id}",
    response_model=(
        PurchaseBillAIDraftDetailResponse
    ),
)
def get_purchase_bill_ai_draft(
    draft_id:
        int,

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    draft = (
        PurchaseBillAIBatchService
        .get_draft(
            db=db,
            draft_id=draft_id,
        )
    )

    if draft is None:

        raise HTTPException(
            status_code=404,

            detail=(
                "Purchase Bill AI draft not found."
            ),
        )

    return draft


# ================================================================
# UPDATE READY DRAFT
# ================================================================

@router.put(
    "/ai-drafts/{draft_id}",
    response_model=(
        PurchaseBillAIDraftDetailResponse
    ),
)
def update_purchase_bill_ai_draft(
    draft_id:
        int,

    request:
        PurchaseBillAIDataResponse,

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    try:

        draft = (
            PurchaseBillAIBatchService
            .update_draft(
                db=db,

                draft_id=(
                    draft_id
                ),

                data=(
                    request.model_dump()
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc

    if draft is None:

        raise HTTPException(
            status_code=404,

            detail=(
                "Purchase Bill AI draft not found."
            ),
        )

    return draft


# ================================================================
# CANCEL DRAFT
# ================================================================

@router.post(
    "/ai-drafts/{draft_id}/cancel",
    response_model=(
        PurchaseBillAIDraftDetailResponse
    ),
)
def cancel_purchase_bill_ai_draft(
    draft_id:
        int,

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    try:

        draft = (
            PurchaseBillAIBatchService
            .cancel_draft(
                db=db,
                draft_id=draft_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc

    if draft is None:

        raise HTTPException(
            status_code=404,

            detail=(
                "Purchase Bill AI draft not found."
            ),
        )

    return draft


# ================================================================
# CONFIRM READY DRAFT
# ================================================================

@router.post(
    "/ai-drafts/{draft_id}/confirm",
)
def confirm_purchase_bill_ai_draft(
    draft_id:
        int,

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.create"
            )
        ),
):

    try:

        result = (
            PurchaseBillAIBatchService
            .confirm_draft(
                db=db,

                draft_id=(
                    draft_id
                ),

                current_user_id=(
                    current_user.id
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        ) from exc

    if result is None:

        raise HTTPException(
            status_code=404,

            detail=(
                "Purchase Bill AI draft not found."
            ),
        )

    return result


# ================================================================
# BATCH STATUS
# ================================================================

@router.get(
    "/ai-batches/{batch_id}",
    response_model=(
        PurchaseBillAIBatchResponse
    ),
)
def get_purchase_bill_ai_batch(
    batch_id:
        int,

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.ai_scan"
            )
        ),
):

    batch = (
        PurchaseBillAIBatchService
        .get_batch(
            db=db,
            batch_id=batch_id,
        )
    )

    if batch is None:

        raise HTTPException(
            status_code=404,

            detail=(
                "Purchase Bill AI batch not found."
            ),
        )

    return batch


# ================================================================
# EXISTING MANUAL / SINGLE EXTRACTION CONFIRM
# ================================================================

@router.post(
    "/confirm",
)
def confirm_purchase_bill(
    request:
        PurchaseBillAIConfirmRequest,

    db:
        Session = Depends(
            get_db
        ),

    current_user:
        User = Depends(
            require_permission(
                "purchase_bills.create"
            )
        ),
):

    return (
        PurchaseBillAIConfirmService
        .confirm(
            db=db,

            data=request,

            current_user_id=(
                current_user.id
            ),
        )
    )