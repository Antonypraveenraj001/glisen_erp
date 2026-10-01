import asyncio
import copy
import logging

from datetime import datetime

from sqlalchemy.orm import Session

from app.ai.purchase_bill_validator import (
    PurchaseBillValidator,
)

from app.database.session import (
    SessionLocal,
)

from app.models.purchase_bill_ai_draft import (
    PurchaseBillAIBatch,
    PurchaseBillAIDraft,
)

from app.repositories.product_repository import (
    ProductRepository,
)

from app.repositories.supplier_repository import (
    SupplierRepository,
)

from app.schemas.purchase_bill_ai_confirm import (
    PurchaseBillAIConfirmRequest,
)

from app.services.purchase_bill_ai_confirm_service import (
    PurchaseBillAIConfirmService,
)

from app.services.purchase_bill_ai_service import (
    PurchaseBillAIService,
)


logger = logging.getLogger(
    __name__
)


ACTIVE_DRAFT_STATUSES = {
    "QUEUED",
    "PROCESSING",
    "READY",
    "FAILED",
}


TERMINAL_DRAFT_STATUSES = {
    "CONFIRMED",
    "CANCELLED",
}


class PurchaseBillAIBatchService:

    # ============================================================
    # CREATE BATCH
    # ============================================================

    @staticmethod
    def create_batch(
        db: Session,
        current_user_id: int,
        files: list[
            tuple[
                str,
                bytes,
            ]
        ],
    ):

        if not files:

            raise ValueError(
                "At least one purchase bill file is required."
            )

        batch = PurchaseBillAIBatch(
            total_files=len(
                files
            ),
            created_by=(
                current_user_id
            ),
        )

        db.add(
            batch
        )

        db.flush()

        work_items = []

        for (
            index,
            file_data,
        ) in enumerate(
            files,
            start=1,
        ):

            (
                filename,
                file_bytes,
            ) = file_data

            draft = PurchaseBillAIDraft(
                batch_id=(
                    batch.id
                ),

                sequence_number=(
                    index
                ),

                original_filename=(
                    filename
                    or
                    f"purchase_bill_{index}"
                ),

                status=(
                    "QUEUED"
                ),

                extracted_data=(
                    None
                ),

                error_message=(
                    None
                ),

                confirmed_purchase_bill_id=(
                    None
                ),

                created_by=(
                    current_user_id
                ),
            )

            db.add(
                draft
            )

            db.flush()

            work_items.append(
                {
                    "draft_id":
                        draft.id,

                    "filename":
                        draft.original_filename,

                    "file_bytes":
                        file_bytes,
                }
            )

        db.commit()

        db.refresh(
            batch
        )

        return (
            {
                "batch_id":
                    batch.id,

                "total_files":
                    batch.total_files,

                "queued":
                    batch.total_files,

                "message": (
                    f"{batch.total_files} purchase bill"
                    f"{'s' if batch.total_files != 1 else ''} "
                    "queued for AI extraction."
                ),
            },

            work_items,
        )

    # ============================================================
    # DELETE EMPTY BATCH
    #
    # Once every temporary draft belonging to a batch has either
    # been confirmed or cancelled, even the batch header is no
    # longer required.
    # ============================================================

    @staticmethod
    def _delete_empty_batch(
        db: Session,
        batch_id: int,
    ):

        remaining_draft = (
            db.query(
                PurchaseBillAIDraft.id
            )
            .filter(
                PurchaseBillAIDraft.batch_id
                ==
                batch_id
            )
            .first()
        )

        if (
            remaining_draft
            is not None
        ):
            return

        batch = (
            db.query(
                PurchaseBillAIBatch
            )
            .filter(
                PurchaseBillAIBatch.id
                ==
                batch_id
            )
            .first()
        )

        if (
            batch
            is
            None
        ):
            return

        db.delete(
            batch
        )

        db.commit()

    # ============================================================
    # CLEAN OLD TERMINAL DRAFTS
    #
    # This automatically removes CONFIRMED / CANCELLED records
    # created by the earlier version of this feature.
    #
    # Therefore the old rows currently visible in your screenshot
    # will disappear permanently after this code is running.
    # ============================================================

    @staticmethod
    def cleanup_terminal_drafts(
        db: Session,
    ):

        terminal_drafts = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.status.in_(
                    TERMINAL_DRAFT_STATUSES
                )
            )
            .all()
        )

        if (
            not terminal_drafts
        ):
            return

        batch_ids = {
            draft.batch_id
            for draft in terminal_drafts
        }

        for draft in terminal_drafts:

            db.delete(
                draft
            )

        db.commit()

        for batch_id in batch_ids:

            PurchaseBillAIBatchService._delete_empty_batch(
                db=db,
                batch_id=batch_id,
            )

    # ============================================================
    # PROCESS BATCH
    # ============================================================

    @staticmethod
    def process_batch(
        work_items: list[
            dict
        ],
    ):

        for work_item in work_items:

            PurchaseBillAIBatchService._process_one(
                draft_id=(
                    work_item[
                        "draft_id"
                    ]
                ),

                filename=(
                    work_item[
                        "filename"
                    ]
                ),

                file_bytes=(
                    work_item[
                        "file_bytes"
                    ]
                ),
            )

    # ============================================================
    # PROCESS ONE BILL
    # ============================================================

    @staticmethod
    def _process_one(
        draft_id: int,
        filename: str,
        file_bytes: bytes,
    ):

        db = SessionLocal()

        try:

            draft = (
                db.query(
                    PurchaseBillAIDraft
                )
                .filter(
                    PurchaseBillAIDraft.id
                    ==
                    draft_id
                )
                .first()
            )

            # It may have been cancelled while waiting.
            if (
                draft
                is
                None
            ):
                return

            if (
                draft.status
                !=
                "QUEUED"
            ):
                return

            # ====================================================
            # EMPTY FILE
            # ====================================================

            if not file_bytes:

                now = (
                    datetime.now()
                )

                draft.status = (
                    "FAILED"
                )

                draft.error_message = (
                    "Uploaded file was empty."
                )

                draft.processing_started_at = (
                    now
                )

                draft.processing_completed_at = (
                    now
                )

                db.commit()

                return

            # ====================================================
            # PROCESSING
            # ====================================================

            draft.status = (
                "PROCESSING"
            )

            draft.processing_started_at = (
                datetime.now()
            )

            draft.error_message = (
                None
            )

            db.commit()

            # ====================================================
            # AI EXTRACTION
            # ====================================================

            try:

                ai_result = asyncio.run(
                    PurchaseBillAIService.extract(
                        db=db,

                        file_bytes=(
                            file_bytes
                        ),

                        filename=(
                            filename
                        ),
                    )
                )

            except Exception:

                db.rollback()

                logger.exception(
                    "Purchase Bill AI extraction failed "
                    "for draft %s (%s).",
                    draft_id,
                    filename,
                )

                db.expire_all()

                failed_draft = (
                    db.query(
                        PurchaseBillAIDraft
                    )
                    .filter(
                        PurchaseBillAIDraft.id
                        ==
                        draft_id
                    )
                    .first()
                )

                # User may have cancelled it meanwhile.
                if (
                    failed_draft
                    is
                    None
                ):
                    return

                failed_draft.status = (
                    "FAILED"
                )

                failed_draft.extracted_data = (
                    None
                )

                failed_draft.error_message = (
                    "AI extraction failed. "
                    "Re-upload this bill if you want "
                    "to try again."
                )

                failed_draft.processing_completed_at = (
                    datetime.now()
                )

                db.commit()

                return

            # ====================================================
            # READY
            # ====================================================

            db.expire_all()

            ready_draft = (
                db.query(
                    PurchaseBillAIDraft
                )
                .filter(
                    PurchaseBillAIDraft.id
                    ==
                    draft_id
                )
                .first()
            )

            # Cancelled during AI processing.
            if (
                ready_draft
                is
                None
            ):
                return

            ready_draft.extracted_data = (
                ai_result.get(
                    "data",
                    {},
                )
            )

            ready_draft.status = (
                "READY"
            )

            ready_draft.error_message = (
                None
            )

            ready_draft.processing_completed_at = (
                datetime.now()
            )

            db.commit()

        except Exception:

            db.rollback()

            logger.exception(
                "Unexpected Purchase Bill batch "
                "processing error for draft %s.",
                draft_id,
            )

            try:

                db.expire_all()

                emergency_draft = (
                    db.query(
                        PurchaseBillAIDraft
                    )
                    .filter(
                        PurchaseBillAIDraft.id
                        ==
                        draft_id
                    )
                    .first()
                )

                if (
                    emergency_draft
                    is
                    None
                ):
                    return

                emergency_draft.status = (
                    "FAILED"
                )

                emergency_draft.extracted_data = (
                    None
                )

                emergency_draft.error_message = (
                    "Extraction could not be completed."
                )

                emergency_draft.processing_completed_at = (
                    datetime.now()
                )

                db.commit()

            except Exception:

                db.rollback()

                logger.exception(
                    "Unable to update failed Purchase Bill "
                    "AI draft %s.",
                    draft_id,
                )

        finally:

            db.close()

    # ============================================================
    # REFRESH SUPPLIER / PRODUCT MATCHES
    # ============================================================

    @staticmethod
    def _refresh_matches(
        db: Session,
        data: dict,
    ):

        supplier = (
            data.get(
                "supplier",
                {},
            )
        )

        products = (
            data.get(
                "products",
                [],
            )
        )

        # ========================================================
        # SUPPLIER
        # ========================================================

        supplier_match = (
            None
        )

        supplier_match_type = (
            None
        )

        gst_number = str(
            supplier.get(
                "gst_number",
                "",
            )
            or
            ""
        ).strip()

        if gst_number:

            supplier_match = (
                SupplierRepository
                .get_by_gst_number(
                    db=db,

                    gst_number=(
                        gst_number
                    ),
                )
            )

            if supplier_match:

                supplier_match_type = (
                    "gst_number"
                )

        if (
            supplier_match
            is
            None
        ):

            company_name = str(
                supplier.get(
                    "company_name",
                    "",
                )
                or
                ""
            ).strip()

            if company_name:

                supplier_match = (
                    SupplierRepository
                    .get_by_company_name(
                        db=db,

                        company_name=(
                            company_name
                        ),
                    )
                )

                if supplier_match:

                    supplier_match_type = (
                        "company_name"
                    )

        supplier[
            "existing_supplier"
        ] = (
            supplier_match
            is not None
        )

        supplier[
            "supplier_id"
        ] = (
            supplier_match.id
            if supplier_match
            else None
        )

        supplier[
            "match_type"
        ] = (
            supplier_match_type
        )

        # ========================================================
        # PRODUCTS
        # ========================================================

        for product in products:

            product_match = (
                None
            )

            product_match_type = (
                None
            )

            product_name = str(
                product.get(
                    "product_name",
                    "",
                )
                or
                ""
            ).strip()

            hsn_code = str(
                product.get(
                    "hsn_code",
                    "",
                )
                or
                ""
            ).strip()

            if product_name:

                product_match = (
                    ProductRepository
                    .get_by_name(
                        db=db,

                        product_name=(
                            product_name
                        ),
                    )
                )

                if product_match:

                    product_match_type = (
                        "product_name"
                    )

            # HSN is fallback only when no product name exists.
            if (
                product_match
                is
                None
                and
                not product_name
                and
                hsn_code
            ):

                product_match = (
                    ProductRepository
                    .get_by_hsn_code(
                        db=db,

                        hsn_code=(
                            hsn_code
                        ),
                    )
                )

                if product_match:

                    product_match_type = (
                        "hsn_code_fallback"
                    )

            product[
                "existing_product"
            ] = (
                product_match
                is not None
            )

            product[
                "product_id"
            ] = (
                product_match.id
                if product_match
                else None
            )

            product[
                "match_type"
            ] = (
                product_match_type
            )

        return data

    # ============================================================
    # UPDATE READY DRAFT
    # ============================================================

    @staticmethod
    def update_draft(
        db: Session,
        draft_id: int,
        data: dict,
    ):

        draft = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.id
                ==
                draft_id
            )
            .with_for_update()
            .first()
        )

        if (
            draft
            is
            None
        ):
            return None

        if (
            draft.status
            !=
            "READY"
        ):

            raise ValueError(
                "Only READY Purchase Bill drafts can be edited."
            )

        clean_data = (
            copy.deepcopy(
                data
            )
        )

        clean_data = (
            PurchaseBillValidator
            .validate(
                clean_data
            )
        )

        clean_data = (
            PurchaseBillAIBatchService
            ._refresh_matches(
                db=db,

                data=(
                    clean_data
                ),
            )
        )

        draft.extracted_data = (
            clean_data
        )

        draft.error_message = (
            None
        )

        db.commit()

        db.refresh(
            draft
        )

        return (
            PurchaseBillAIBatchService
            .get_draft(
                db=db,

                draft_id=(
                    draft.id
                ),
            )
        )

    # ============================================================
    # CANCEL DRAFT
    #
    # CANCEL = DELETE TEMPORARY DRAFT COMPLETELY.
    # ============================================================

    @staticmethod
    def cancel_draft(
        db: Session,
        draft_id: int,
    ):

        draft = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.id
                ==
                draft_id
            )
            .with_for_update()
            .first()
        )

        if (
            draft
            is
            None
        ):
            return None

        if (
            draft.status
            ==
            "CONFIRMED"
        ):

            raise ValueError(
                "This draft has already been confirmed. "
                "Cancel the actual Purchase Bill instead."
            )

        batch_id = (
            draft.batch_id
        )

        deleted_at = (
            datetime.now()
        )

        # Temporary response only.
        response = (
            PurchaseBillAIBatchService
            .build_draft_summary(
                draft
            )
        )

        response[
            "status"
        ] = (
            "CANCELLED"
        )

        response[
            "cancelled_at"
        ] = (
            deleted_at
        )

        response[
            "updated_at"
        ] = (
            deleted_at
        )

        response[
            "extracted_data"
        ] = (
            None
        )

        db.delete(
            draft
        )

        db.commit()

        PurchaseBillAIBatchService._delete_empty_batch(
            db=db,
            batch_id=batch_id,
        )

        return response

    # ============================================================
    # CONFIRM READY DRAFT
    #
    # 1. Create the real Purchase Bill / Supplier / Product / Stock.
    # 2. Mark temporary row CONFIRMED for duplicate protection.
    # 3. Immediately delete the temporary row.
    # 4. Delete empty batch header.
    # ============================================================

    @staticmethod
    def confirm_draft(
        db: Session,
        draft_id: int,
        current_user_id: int,
    ):

        draft = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.id
                ==
                draft_id
            )
            .with_for_update()
            .first()
        )

        if (
            draft
            is
            None
        ):
            return None

        if (
            draft.status
            !=
            "READY"
        ):

            raise ValueError(
                "Only READY Purchase Bill drafts can be confirmed."
            )

        if (
            not draft.extracted_data
        ):

            raise ValueError(
                "This draft does not contain extracted Purchase Bill data."
            )

        batch_id = (
            draft.batch_id
        )

        confirm_request = (
            PurchaseBillAIConfirmRequest
            .model_validate(
                draft.extracted_data
            )
        )

        # ========================================================
        # CREATE REAL PURCHASE TRANSACTION
        # ========================================================

        result = (
            PurchaseBillAIConfirmService
            .confirm(
                db=db,

                data=(
                    confirm_request
                ),

                current_user_id=(
                    current_user_id
                ),
            )
        )

        # Confirmation service commits internally.
        db.expire_all()

        temporary_draft = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.id
                ==
                draft_id
            )
            .with_for_update()
            .first()
        )

        if (
            temporary_draft
            is
            None
        ):

            return {
                "success":
                    True,

                "draft_id":
                    draft_id,

                "status":
                    "CONFIRMED",

                "purchase_bill_id":
                    result[
                        "purchase_bill_id"
                    ],

                "bill_number":
                    result[
                        "bill_number"
                    ],

                "supplier_id":
                    result[
                        "supplier_id"
                    ],

                "grand_total":
                    result[
                        "grand_total"
                    ],
            }

        # ========================================================
        # DUPLICATE-CONFIRM PROTECTION
        #
        # Commit terminal state before deletion.
        # If the final delete ever fails unexpectedly, this row
        # cannot accidentally be confirmed twice and will be
        # removed automatically by cleanup_terminal_drafts().
        # ========================================================

        temporary_draft.status = (
            "CONFIRMED"
        )

        temporary_draft.confirmed_purchase_bill_id = (
            result[
                "purchase_bill_id"
            ]
        )

        temporary_draft.confirmed_at = (
            datetime.now()
        )

        db.commit()

        # ========================================================
        # REMOVE TEMPORARY DATA
        # ========================================================

        db.delete(
            temporary_draft
        )

        db.commit()

        PurchaseBillAIBatchService._delete_empty_batch(
            db=db,
            batch_id=batch_id,
        )

        return {
            "success":
                True,

            "draft_id":
                draft_id,

            "status":
                "CONFIRMED",

            "purchase_bill_id":
                result[
                    "purchase_bill_id"
                ],

            "bill_number":
                result[
                    "bill_number"
                ],

            "supplier_id":
                result[
                    "supplier_id"
                ],

            "grand_total":
                result[
                    "grand_total"
                ],
        }

    # ============================================================
    # BUILD SUMMARY
    # ============================================================

    @staticmethod
    def build_draft_summary(
        draft:
            PurchaseBillAIDraft,
    ):

        extracted_data = (
            draft.extracted_data
            if isinstance(
                draft.extracted_data,
                dict,
            )
            else {}
        )

        supplier_data = (
            extracted_data.get(
                "supplier",
                {},
            )
            if extracted_data
            else {}
        )

        purchase_bill_data = (
            extracted_data.get(
                "purchase_bill",
                {},
            )
            if extracted_data
            else {}
        )

        return {
            "id":
                draft.id,

            "batch_id":
                draft.batch_id,

            "sequence_number":
                draft.sequence_number,

            "original_filename":
                draft.original_filename,

            "status":
                draft.status,

            "supplier_name":
                supplier_data.get(
                    "company_name",
                    "",
                )
                or
                "",

            "bill_number":
                purchase_bill_data.get(
                    "bill_number",
                    "",
                )
                or
                "",

            "bill_date":
                purchase_bill_data.get(
                    "bill_date",
                    "",
                )
                or
                "",

            "grand_total":
                purchase_bill_data.get(
                    "grand_total",
                    0,
                )
                or
                0,

            "error_message":
                draft.error_message,

            "confirmed_purchase_bill_id":
                draft.confirmed_purchase_bill_id,

            "processing_started_at":
                draft.processing_started_at,

            "processing_completed_at":
                draft.processing_completed_at,

            "confirmed_at":
                draft.confirmed_at,

            "cancelled_at":
                draft.cancelled_at,

            "created_at":
                draft.created_at,

            "updated_at":
                draft.updated_at,
        }

    # ============================================================
    # LIST ACTIVE TEMPORARY DRAFTS
    # ============================================================

    @staticmethod
    def get_drafts(
        db: Session,
        status: str | None = None,
    ):

        PurchaseBillAIBatchService.cleanup_terminal_drafts(
            db=db
        )

        query = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.status.in_(
                    ACTIVE_DRAFT_STATUSES
                )
            )
        )

        if status:

            normalized_status = (
                status
                .strip()
                .upper()
            )

            if (
                normalized_status
                not in
                ACTIVE_DRAFT_STATUSES
            ):

                raise ValueError(
                    "Invalid active Purchase Bill draft status."
                )

            query = (
                query.filter(
                    PurchaseBillAIDraft.status
                    ==
                    normalized_status
                )
            )

        drafts = (
            query
            .order_by(
                PurchaseBillAIDraft.id
                .desc()
            )
            .all()
        )

        return [
            PurchaseBillAIBatchService
            .build_draft_summary(
                draft
            )
            for draft in drafts
        ]

    # ============================================================
    # GET ONE DRAFT
    # ============================================================

    @staticmethod
    def get_draft(
        db: Session,
        draft_id: int,
    ):

        draft = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.id
                ==
                draft_id,

                PurchaseBillAIDraft.status.in_(
                    ACTIVE_DRAFT_STATUSES
                ),
            )
            .first()
        )

        if (
            draft
            is
            None
        ):
            return None

        result = (
            PurchaseBillAIBatchService
            .build_draft_summary(
                draft
            )
        )

        result[
            "extracted_data"
        ] = (
            draft.extracted_data
        )

        return result

    # ============================================================
    # GET ACTIVE DRAFTS FOR ONE BATCH
    # ============================================================

    @staticmethod
    def get_batch(
        db: Session,
        batch_id: int,
    ):

        PurchaseBillAIBatchService.cleanup_terminal_drafts(
            db=db
        )

        batch = (
            db.query(
                PurchaseBillAIBatch
            )
            .filter(
                PurchaseBillAIBatch.id
                ==
                batch_id
            )
            .first()
        )

        if (
            batch
            is
            None
        ):
            return None

        drafts = (
            db.query(
                PurchaseBillAIDraft
            )
            .filter(
                PurchaseBillAIDraft.batch_id
                ==
                batch.id,

                PurchaseBillAIDraft.status.in_(
                    ACTIVE_DRAFT_STATUSES
                ),
            )
            .order_by(
                PurchaseBillAIDraft
                .sequence_number
                .asc()
            )
            .all()
        )

        counts = {
            "QUEUED": 0,
            "PROCESSING": 0,
            "READY": 0,
            "FAILED": 0,
        }

        for draft in drafts:

            if (
                draft.status
                in
                counts
            ):

                counts[
                    draft.status
                ] += 1

        return {
            "batch_id":
                batch.id,

            "total_files":
                len(
                    drafts
                ),

            "queued":
                counts[
                    "QUEUED"
                ],

            "processing":
                counts[
                    "PROCESSING"
                ],

            "ready":
                counts[
                    "READY"
                ],

            "failed":
                counts[
                    "FAILED"
                ],

            # Kept only because the existing response
            # schema currently expects these fields.
            "confirmed":
                0,

            "cancelled":
                0,

            "created_at":
                batch.created_at,

            "drafts": [
                PurchaseBillAIBatchService
                .build_draft_summary(
                    draft
                )
                for draft in drafts
            ],
        }