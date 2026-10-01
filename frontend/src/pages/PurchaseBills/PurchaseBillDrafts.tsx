import axios from "axios";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import "./PurchaseBillDrafts.css";

import {
  cancelPurchaseBillAIDraft,
  confirmPurchaseBillAIDraft,
  getPurchaseBillAIBatch,
  getPurchaseBillAIDraft,
  getPurchaseBillAIDrafts,
  updatePurchaseBillAIDraft,
} from "../../services/purchaseBillService";

import {
  getBusinessSettings,
} from "../../services/settingsService";

import type {
  AIProduct,
  AIPurchaseBill,
  AISupplier,
  PurchaseBillAIDataResponse,
  PurchaseBillAIDraftDetail,
  PurchaseBillAIDraftSummary,
} from "../../types/purchaseBill";


const FALLBACK_PAGE_SIZE =
  10;


type ActiveDraftStatus =
  | "QUEUED"
  | "PROCESSING"
  | "READY"
  | "FAILED";


type StatusFilter =
  | "ALL"
  | ActiveDraftStatus;


/* ================================================================
   HELPERS
================================================================ */

function formatCurrency(
  value:
    number |
    string
) {

  return new Intl.NumberFormat(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(
    Number(
      value
      ||
      0
    )
  );

}


function formatDateTime(
  value:
    string |
    null
) {

  if (
    !value
  ) {
    return "—";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );

}


function cloneData(
  data:
    PurchaseBillAIDataResponse
):
PurchaseBillAIDataResponse {

  return JSON.parse(
    JSON.stringify(
      data
    )
  ) as PurchaseBillAIDataResponse;

}


function getApiErrorMessage(
  error:
    unknown,

  fallback:
    string
) {

  if (
    axios.isAxiosError(
      error
    )
  ) {

    const detail =
      error.response
        ?.data
        ?.detail;


    if (
      typeof detail
      ===
      "string"
    ) {

      return detail;

    }

  }


  if (
    error instanceof Error
    &&
    error.message
  ) {

    return error.message;

  }


  return fallback;

}


/* ================================================================
   PAGE
================================================================ */

export default function PurchaseBillDrafts() {

  const navigate =
    useNavigate();


  const [
    searchParams,
  ] =
    useSearchParams();


  const batchParam =
    searchParams.get(
      "batch"
    );


  const parsedBatchId =
    batchParam
      ? Number(
          batchParam
        )
      : null;


  const batchId =
    parsedBatchId
    !==
    null
    &&
    Number.isInteger(
      parsedBatchId
    )
    &&
    parsedBatchId > 0
      ? parsedBatchId
      : null;


  const [
    drafts,
    setDrafts,
  ] =
    useState<
      PurchaseBillAIDraftSummary[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );


  const [
    pageSize,
    setPageSize,
  ] =
    useState(
      FALLBACK_PAGE_SIZE
    );


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1
    );


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      StatusFilter
    >(
      "ALL"
    );


  /* ==============================================================
     REVIEW / EDIT MODAL
  ============================================================== */

  const [
    selectedDraft,
    setSelectedDraft,
  ] =
    useState<
      PurchaseBillAIDraftDetail |
      null
    >(
      null
    );


  const [
    editData,
    setEditData,
  ] =
    useState<
      PurchaseBillAIDataResponse |
      null
    >(
      null
    );


  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      false
    );


  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      "save"
      |
      "confirm"
      |
      "cancel"
      |
      null
    >(
      null
    );


  /* ==============================================================
     SETTINGS PAGE SIZE
  ============================================================== */

  useEffect(
    () => {

      async function loadPageSize() {

        try {

          const settings =
            await getBusinessSettings();


          const configuredPageSize =
            Number(
              settings.default_page_size
            );


          if (
            Number.isInteger(
              configuredPageSize
            )
            &&
            configuredPageSize >= 5
            &&
            configuredPageSize <= 100
          ) {

            setPageSize(
              configuredPageSize
            );

          }

        } catch (
          err
        ) {

          console.error(
            "Unable to load Extracted Bill page size:",
            err
          );

        }

      }


      void loadPageSize();

    },
    []
  );


  /* ==============================================================
     FILTER ACTIVE DRAFTS ONLY
  ============================================================== */

  function activeOnly(
    source:
      PurchaseBillAIDraftSummary[]
  ) {

    return source.filter(
      draft =>
        draft.status
        ===
        "QUEUED"
        ||
        draft.status
        ===
        "PROCESSING"
        ||
        draft.status
        ===
        "READY"
        ||
        draft.status
        ===
        "FAILED"
    );

  }


  /* ==============================================================
     FETCH DRAFTS
  ============================================================== */

  const fetchDraftData =
    useCallback(
      async () => {

        if (
          batchId
        ) {

          try {

            const batch =
              await getPurchaseBillAIBatch(
                batchId
              );


            return activeOnly(
              batch.drafts
            );

          } catch (
            err
          ) {

            /*
             * If every draft in the temporary batch
             * was confirmed/cancelled, the batch itself
             * is deleted. Return to the general queue.
             */

            if (
              axios.isAxiosError(
                err
              )
              &&
              err.response?.status
              ===
              404
            ) {

              navigate(
                "/purchase-bills/drafts",
                {
                  replace:
                    true,
                }
              );


              return [];

            }


            throw err;

          }

        }


        const result =
          await getPurchaseBillAIDrafts();


        return activeOnly(
          result
        );

      },
      [
        batchId,
        navigate,
      ]
    );


  const loadDrafts =
    useCallback(
      async (
        mainLoader =
          false
      ) => {

        try {

          if (
            mainLoader
          ) {

            setLoading(
              true
            );

          } else {

            setRefreshing(
              true
            );

          }


          setError(
            ""
          );


          const result =
            await fetchDraftData();


          setDrafts(
            result
          );


          return result;

        } catch (
          err
        ) {

          console.error(
            "Unable to load Purchase Bill drafts:",
            err
          );


          setError(
            getApiErrorMessage(
              err,
              "Unable to load extracted Purchase Bill drafts."
            )
          );


          return [];

        } finally {

          setLoading(
            false
          );


          setRefreshing(
            false
          );

        }

      },
      [
        fetchDraftData,
      ]
    );


  useEffect(
    () => {

      void loadDrafts(
        true
      );

    },
    [
      loadDrafts,
    ]
  );


  /* ==============================================================
     BACKGROUND POLLING
  ============================================================== */

  const hasActiveExtraction =
    useMemo(
      () =>
        drafts.some(
          draft =>
            draft.status
            ===
            "QUEUED"
            ||
            draft.status
            ===
            "PROCESSING"
        ),
      [
        drafts,
      ]
    );


  useEffect(
    () => {

      if (
        !hasActiveExtraction
      ) {
        return;
      }


      const timer =
        window.setInterval(
          () => {

            void loadDrafts(
              false
            );

          },
          3000
        );


      return () => {

        window.clearInterval(
          timer
        );

      };

    },
    [
      hasActiveExtraction,
      loadDrafts,
    ]
  );


  /* ==============================================================
     KPI COUNTS
  ============================================================== */

  const counts =
    useMemo(
      () => ({

        total:
          drafts.length,

        processing:
          drafts.filter(
            draft =>
              draft.status
              ===
              "QUEUED"
              ||
              draft.status
              ===
              "PROCESSING"
          ).length,

        ready:
          drafts.filter(
            draft =>
              draft.status
              ===
              "READY"
          ).length,

        failed:
          drafts.filter(
            draft =>
              draft.status
              ===
              "FAILED"
          ).length,

      }),
      [
        drafts,
      ]
    );


  /* ==============================================================
     FILTER
  ============================================================== */

  const filteredDrafts =
    useMemo(
      () => {

        if (
          statusFilter
          ===
          "ALL"
        ) {

          return drafts;

        }


        return drafts.filter(
          draft =>
            draft.status
            ===
            statusFilter
        );

      },
      [
        drafts,
        statusFilter,
      ]
    );


  useEffect(
    () => {

      setCurrentPage(
        1
      );

    },
    [
      statusFilter,
      pageSize,
      batchId,
    ]
  );


  /* ==============================================================
     PAGINATION
  ============================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredDrafts.length
        /
        pageSize
      )
    );


  useEffect(
    () => {

      if (
        currentPage
        >
        totalPages
      ) {

        setCurrentPage(
          totalPages
        );

      }

    },
    [
      currentPage,
      totalPages,
    ]
  );


  const paginatedDrafts =
    useMemo(
      () => {

        const start =
          (
            currentPage
            -
            1
          )
          *
          pageSize;


        return filteredDrafts.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        filteredDrafts,
        currentPage,
        pageSize,
      ]
    );


  const firstRecord =
    filteredDrafts.length
    >
    0
      ? (
          (
            currentPage
            -
            1
          )
          *
          pageSize
        )
        +
        1
      : 0;


  const lastRecord =
    Math.min(
      currentPage
      *
      pageSize,

      filteredDrafts.length
    );


  /* ==============================================================
     OPEN DRAFT
  ============================================================== */

  async function openDraft(
    draftId:
      number
  ) {

    try {

      setDetailLoading(
        true
      );


      setError(
        ""
      );


      const result =
        await getPurchaseBillAIDraft(
          draftId
        );


      setSelectedDraft(
        result
      );


      if (
        result.extracted_data
      ) {

        setEditData(
          cloneData(
            result.extracted_data
          )
        );

      } else {

        setEditData(
          null
        );

      }

    } catch (
      err
    ) {

      console.error(
        "Unable to open Purchase Bill draft:",
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to open the extracted Purchase Bill."
        )
      );

    } finally {

      setDetailLoading(
        false
      );

    }

  }


  function closeDraft() {

    if (
      actionLoading
    ) {
      return;
    }


    setSelectedDraft(
      null
    );


    setEditData(
      null
    );

  }


  /* ==============================================================
     EDIT SUPPLIER
  ============================================================== */

  function updateSupplier(
    field:
      keyof AISupplier,

    value:
      string
  ) {

    if (
      !editData
    ) {
      return;
    }


    const supplier = {
      ...editData.supplier,

      [field]:
        value,
    };


    if (
      field
      ===
      "company_name"
      ||
      field
      ===
      "gst_number"
    ) {

      supplier.existing_supplier =
        false;

      supplier.supplier_id =
        null;

      supplier.match_type =
        null;

    }


    setEditData({
      ...editData,

      supplier,
    });

  }


  /* ==============================================================
     EDIT BILL
  ============================================================== */

  function updateBill(
    field:
      keyof AIPurchaseBill,

    value:
      string |
      number
  ) {

    if (
      !editData
    ) {
      return;
    }


    setEditData({
      ...editData,

      purchase_bill: {
        ...editData.purchase_bill,

        [field]:
          value,
      },
    });

  }


  /* ==============================================================
     EDIT PRODUCT
  ============================================================== */

  function updateProduct(
    index:
      number,

    field:
      keyof AIProduct,

    value:
      string |
      number
  ) {

    if (
      !editData
    ) {
      return;
    }


    const products =
      editData.products.map(
        (
          product,
          productIndex
        ) => {

          if (
            productIndex
            !==
            index
          ) {

            return product;

          }


          const updatedProduct = {
            ...product,

            [field]:
              value,
          };


          if (
            field
            ===
            "product_name"
            ||
            field
            ===
            "hsn_code"
          ) {

            updatedProduct.existing_product =
              false;

            updatedProduct.product_id =
              null;

            updatedProduct.match_type =
              null;

          }


          if (
            field
            ===
            "quantity"
            ||
            field
            ===
            "purchase_price"
          ) {

            updatedProduct.line_total =
              Number(
                updatedProduct.quantity
                ||
                0
              )
              *
              Number(
                updatedProduct.purchase_price
                ||
                0
              );

          }


          return updatedProduct;

        }
      );


    const subtotal =
      products.reduce(
        (
          total,
          product
        ) =>
          total
          +
          Number(
            product.line_total
            ||
            0
          ),

        0
      );


    const totalGst =
      products.reduce(
        (
          total,
          product
        ) =>
          total
          +
          (
            Number(
              product.line_total
              ||
              0
            )
            *
            Number(
              product.gst_percentage
              ||
              0
            )
            /
            100
          ),

        0
      );


    setEditData({
      ...editData,

      products,

      purchase_bill: {
        ...editData.purchase_bill,

        subtotal,

        total_gst:
          totalGst,

        grand_total:
          subtotal
          +
          totalGst,
      },
    });

  }


  function addProduct() {

    if (
      !editData
    ) {
      return;
    }


    const product:
      AIProduct =
      {
        product_name:
          "",

        description:
          "",

        hsn_code:
          "",

        unit:
          "",

        quantity:
          0,

        purchase_price:
          0,

        gst_percentage:
          0,

        line_total:
          0,

        existing_product:
          false,

        product_id:
          null,

        match_type:
          null,
      };


    setEditData({
      ...editData,

      products: [
        ...editData.products,
        product,
      ],
    });

  }


  function removeProduct(
    index:
      number
  ) {

    if (
      !editData
    ) {
      return;
    }


    const products =
      editData.products.filter(
        (
          _,
          productIndex
        ) =>
          productIndex
          !==
          index
      );


    const subtotal =
      products.reduce(
        (
          total,
          product
        ) =>
          total
          +
          Number(
            product.line_total
            ||
            0
          ),

        0
      );


    const totalGst =
      products.reduce(
        (
          total,
          product
        ) =>
          total
          +
          (
            Number(
              product.line_total
              ||
              0
            )
            *
            Number(
              product.gst_percentage
              ||
              0
            )
            /
            100
          ),

        0
      );


    setEditData({
      ...editData,

      products,

      purchase_bill: {
        ...editData.purchase_bill,

        subtotal,

        total_gst:
          totalGst,

        grand_total:
          subtotal
          +
          totalGst,
      },
    });

  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function saveDraft() {

    if (
      !selectedDraft
      ||
      !editData
    ) {
      return null;
    }


    try {

      setActionLoading(
        "save"
      );


      setError(
        ""
      );


      setSuccess(
        ""
      );


      const result =
        await updatePurchaseBillAIDraft(
          selectedDraft.id,
          editData
        );


      setSelectedDraft(
        result
      );


      if (
        result.extracted_data
      ) {

        setEditData(
          cloneData(
            result.extracted_data
          )
        );

      }


      setSuccess(
        `Draft ${result.bill_number || `#${result.id}`} saved.`
      );


      await loadDrafts(
        false
      );


      return result;

    } catch (
      err
    ) {

      console.error(
        "Unable to save Purchase Bill draft:",
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to save the Purchase Bill draft."
        )
      );


      return null;

    } finally {

      setActionLoading(
        null
      );

    }

  }


  /* ==============================================================
     AFTER CONFIRM / CANCEL
  ============================================================== */

  async function refreshAfterRemoval(
    removedDraftId:
      number,

    openNext:
      boolean
  ) {

    const remainingLocal =
      drafts.filter(
        draft =>
          draft.id
          !==
          removedDraftId
      );


    setDrafts(
      remainingLocal
    );


    setSelectedDraft(
      null
    );


    setEditData(
      null
    );


    /*
     * The backend deletes an empty batch.
     * Leave the now-finished batch URL before refreshing.
     */

    if (
      batchId
      &&
      remainingLocal.length
      ===
      0
    ) {

      navigate(
        "/purchase-bills/drafts",
        {
          replace:
            true,
        }
      );


      return;

    }


    const latest =
      await loadDrafts(
        false
      );


    if (
      openNext
    ) {

      const nextReady =
        latest.find(
          draft =>
            draft.status
            ===
            "READY"
        );


      if (
        nextReady
      ) {

        await openDraft(
          nextReady.id
        );

      }

    }

  }


  /* ==============================================================
     CONFIRM
  ============================================================== */

  async function confirmDraft() {

    if (
      !selectedDraft
      ||
      !editData
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Confirm Purchase Bill ${editData.purchase_bill.bill_number || ""}?\n\n`
        +
        "This will create the Purchase Bill, update/create the "
        +
        "Supplier and Products, increase Stock and create the "
        +
        "Stock Movement ledger entries.\n\n"
        +
        "The temporary extracted draft will then be removed."
      );


    if (
      !confirmed
    ) {
      return;
    }


    const draftId =
      selectedDraft.id;


    try {

      setActionLoading(
        "confirm"
      );


      setError(
        ""
      );


      setSuccess(
        ""
      );


      /*
       * Save latest edits before confirming.
       */

      await updatePurchaseBillAIDraft(
        draftId,
        editData
      );


      const result =
        await confirmPurchaseBillAIDraft(
          draftId
        );


      setSuccess(
        `Purchase Bill ${result.bill_number} confirmed successfully.`
      );


      await refreshAfterRemoval(
        draftId,
        true
      );

    } catch (
      err
    ) {

      console.error(
        "Unable to confirm Purchase Bill draft:",
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to confirm the Purchase Bill draft."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }

  }


  /* ==============================================================
     CANCEL / REMOVE
  ============================================================== */

  async function cancelDraft(
    draftId:
      number,

    openNext:
      boolean
  ) {

    const confirmed =
      window.confirm(
        "Remove this temporary Purchase Bill draft?\n\n"
        +
        "The extracted data will be permanently deleted. "
        +
        "No Supplier, Purchase Bill or Stock transaction will "
        +
        "be created."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setActionLoading(
        "cancel"
      );


      setError(
        ""
      );


      setSuccess(
        ""
      );


      await cancelPurchaseBillAIDraft(
        draftId
      );


      setSuccess(
        "Temporary Purchase Bill draft removed."
      );


      await refreshAfterRemoval(
        draftId,
        openNext
      );

    } catch (
      err
    ) {

      console.error(
        "Unable to remove Purchase Bill draft:",
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to remove the Purchase Bill draft."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="pb-drafts-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="pb-drafts-header">

        <div>

          <div className="pb-drafts-eyebrow">
            PURCHASE BILL AI
          </div>


          <h1 className="pb-drafts-title">
            Extracted Bills
          </h1>


          <p className="pb-drafts-subtitle">

            {
              batchId
                ? (
                    <>
                      Reviewing temporary extraction
                      Batch #{batchId}.
                    </>
                  )
                : (
                    <>
                      Temporary workspace for bills waiting
                      for review and confirmation.
                    </>
                  )
            }

          </p>

        </div>


        <div className="pb-drafts-header-actions">

          {
            batchId
            &&
            (
              <button
                type="button"
                className="pb-drafts-secondary-button"
                onClick={
                  () =>
                    navigate(
                      "/purchase-bills/drafts"
                    )
                }
              >
                All Drafts
              </button>
            )
          }


          <button
            type="button"
            className="pb-drafts-primary-button"
            onClick={
              () =>
                navigate(
                  "/purchase-bills/scan"
                )
            }
          >

            <Upload
              size={15}
            />

            Upload Bills

          </button>


          <button
            type="button"
            className="pb-drafts-secondary-button"
            onClick={
              () =>
                navigate(
                  "/purchase-bills"
                )
            }
          >
            Purchase Bills
          </button>

        </div>

      </div>


      {/* ======================================================
          INFO
      ====================================================== */}

      <div className="pb-drafts-info">

        <FileText
          size={17}
        />


        <div>

          <strong>
            Temporary extraction workspace
          </strong>


          <span>
            A draft disappears after it is confirmed or removed.
            Confirmed transactions are available from the normal
            Purchase Bills module.
          </span>

        </div>

      </div>


      {/* ======================================================
          MESSAGES
      ====================================================== */}

      {
        success
        &&
        (
          <div className="pb-drafts-success">
            {success}
          </div>
        )
      }


      {
        error
        &&
        (
          <div className="pb-drafts-error">
            {error}
          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="pb-drafts-kpi-grid">

        <div className="pb-drafts-kpi-card">

          <div>

            <div className="pb-drafts-kpi-label">
              Active Drafts
            </div>

            <div className="pb-drafts-kpi-value">
              {counts.total}
            </div>

          </div>


          <div className="pb-drafts-kpi-icon blue">

            <FileText
              size={20}
            />

          </div>

        </div>


        <div className="pb-drafts-kpi-card">

          <div>

            <div className="pb-drafts-kpi-label">
              Processing
            </div>

            <div className="pb-drafts-kpi-value">
              {counts.processing}
            </div>

          </div>


          <div className="pb-drafts-kpi-icon lavender">

            <Clock3
              size={20}
            />

          </div>

        </div>


        <div className="pb-drafts-kpi-card">

          <div>

            <div className="pb-drafts-kpi-label">
              Ready for Review
            </div>

            <div className="pb-drafts-kpi-value">
              {counts.ready}
            </div>

          </div>


          <div className="pb-drafts-kpi-icon green">

            <CheckCircle2
              size={20}
            />

          </div>

        </div>


        <div className="pb-drafts-kpi-card">

          <div>

            <div className="pb-drafts-kpi-label">
              Failed
            </div>

            <div className="pb-drafts-kpi-value">
              {counts.failed}
            </div>

          </div>


          <div className="pb-drafts-kpi-icon rose">

            <AlertTriangle
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          PANEL
      ====================================================== */}

      <section className="pb-drafts-panel">

        <div className="pb-drafts-panel-header">

          <div>

            <div className="pb-drafts-panel-title">
              Temporary Draft Queue
            </div>


            <div className="pb-drafts-panel-subtitle">
              Review READY drafts, remove unwanted drafts,
              or wait for processing to finish.
            </div>

          </div>


          <div className="pb-drafts-panel-badge">
            {drafts.length} active
          </div>

        </div>


        {/* ====================================================
            TOOLBAR
        ==================================================== */}

        <div className="pb-drafts-toolbar">

          <select
            className="pb-drafts-select"
            value={
              statusFilter
            }
            onChange={(event) => {
              setStatusFilter(
                event.target.value as StatusFilter
              );
            }}
          >
            <option value="ALL">
              All Active Drafts
            </option>

            <option value="QUEUED">
              Queued
            </option>

            <option value="PROCESSING">
              Processing
            </option>

            <option value="READY">
              Ready
            </option>

            <option value="FAILED">
              Failed
            </option>
          </select>


          <button
            type="button"
            className="pb-drafts-secondary-button"
            disabled={
              refreshing
            }
            onClick={
              () =>
                void loadDrafts(
                  false
                )
            }
          >

            {
              refreshing
                ? (
                    <Loader2
                      size={15}
                      className="pb-drafts-spin"
                    />
                  )
                : (
                    <RefreshCw
                      size={15}
                    />
                  )
            }

            Refresh

          </button>

        </div>


        {/* ====================================================
            TABLE / STATE
        ==================================================== */}

        {
          loading
            ? (
                <div className="pb-drafts-state">

                  <Loader2
                    size={22}
                    className="pb-drafts-spin"
                  />

                  Loading temporary drafts...

                </div>
              )
            : filteredDrafts.length
              ===
              0
                ? (
                    <div className="pb-drafts-empty">

                      <div className="pb-drafts-empty-icon">

                        <FileText
                          size={25}
                        />

                      </div>


                      <strong>
                        No temporary drafts
                      </strong>


                      <span>
                        Upload Purchase Bill images to start a
                        new extraction batch.
                      </span>


                      <button
                        type="button"
                        className="pb-drafts-primary-button"
                        onClick={
                          () =>
                            navigate(
                              "/purchase-bills/scan"
                            )
                        }
                      >
                        <Upload
                          size={15}
                        />

                        Upload Bills
                      </button>

                    </div>
                  )
                : (
                    <>

                      <div className="pb-drafts-table-wrap">

                        <table className="pb-drafts-table">

                          <thead>

                            <tr>

                              <th>
                                Source File
                              </th>

                              <th>
                                Bill
                              </th>

                              <th>
                                Supplier
                              </th>

                              <th>
                                Grand Total
                              </th>

                              <th>
                                Status
                              </th>

                              <th>
                                Updated
                              </th>

                              <th className="pb-drafts-align-right">
                                Actions
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              paginatedDrafts.map(
                                draft => (

                                  <tr
                                    key={
                                      draft.id
                                    }
                                  >

                                    <td>

                                      <div className="pb-drafts-file">

                                        <div className="pb-drafts-file-icon">

                                          <FileText
                                            size={16}
                                          />

                                        </div>


                                        <div>

                                          <div className="pb-drafts-file-name">
                                            {
                                              draft.original_filename
                                            }
                                          </div>


                                          <div className="pb-drafts-file-meta">

                                            Batch #
                                            {draft.batch_id}

                                            <span>
                                              •
                                            </span>

                                            Draft #
                                            {draft.id}

                                          </div>

                                        </div>

                                      </div>

                                    </td>


                                    <td>

                                      <div className="pb-drafts-bill-number">
                                        {
                                          draft.bill_number
                                          ||
                                          "Waiting for extraction"
                                        }
                                      </div>


                                      <div className="pb-drafts-cell-meta">
                                        {
                                          draft.bill_date
                                          ||
                                          "—"
                                        }
                                      </div>

                                    </td>


                                    <td>

                                      <div className="pb-drafts-supplier-name">
                                        {
                                          draft.supplier_name
                                          ||
                                          "—"
                                        }
                                      </div>

                                    </td>


                                    <td>

                                      <strong className="pb-drafts-total">

                                        {
                                          draft.status
                                          ===
                                          "READY"
                                            ? formatCurrency(
                                                draft.grand_total
                                              )
                                            : "—"
                                        }

                                      </strong>

                                    </td>


                                    <td>

                                      <span
                                        className={
                                          `pb-drafts-status ${
                                            draft.status.toLowerCase()
                                          }`
                                        }
                                      >
                                        {
                                          draft.status
                                        }
                                      </span>


                                      {
                                        draft.status
                                        ===
                                        "FAILED"
                                        &&
                                        draft.error_message
                                        &&
                                        (
                                          <div className="pb-drafts-failure-message">
                                            {
                                              draft.error_message
                                            }
                                          </div>
                                        )
                                      }

                                    </td>


                                    <td>
                                      {
                                        formatDateTime(
                                          draft.updated_at
                                        )
                                      }
                                    </td>


                                    <td className="pb-drafts-align-right">

                                      <div className="pb-drafts-row-actions">

                                        {
                                          draft.status
                                          ===
                                          "READY"
                                          &&
                                          (
                                            <button
                                              type="button"
                                              className="pb-drafts-review-button"
                                              onClick={
                                                () =>
                                                  void openDraft(
                                                    draft.id
                                                  )
                                              }
                                            >

                                              <Edit3
                                                size={14}
                                              />

                                              Review / Edit

                                            </button>
                                          )
                                        }


                                        <button
                                          type="button"
                                          className="pb-drafts-remove-button"
                                          disabled={
                                            actionLoading
                                            !==
                                            null
                                          }
                                          onClick={
                                            () =>
                                              void cancelDraft(
                                                draft.id,
                                                false
                                              )
                                          }
                                        >

                                          <Trash2
                                            size={14}
                                          />

                                          Remove

                                        </button>

                                      </div>

                                    </td>

                                  </tr>

                                )
                              )
                            }

                          </tbody>

                        </table>

                      </div>


                      {/* ========================================
                          PAGINATION
                      ======================================== */}

                      <div className="pb-drafts-pagination">

                        <div className="pb-drafts-pagination-summary">

                          Showing{" "}

                          <strong>
                            {firstRecord}
                          </strong>

                          {"–"}

                          <strong>
                            {lastRecord}
                          </strong>

                          {" of "}

                          <strong>
                            {filteredDrafts.length}
                          </strong>

                          {" drafts • "}

                          {pageSize}

                          {" per page"}

                        </div>


                        <div className="pb-drafts-pagination-actions">

                          <button
                            type="button"
                            className="pb-drafts-secondary-button"
                            disabled={
                              currentPage
                              <=
                              1
                            }
                            onClick={
                              () =>
                                setCurrentPage(
                                  page =>
                                    Math.max(
                                      1,
                                      page - 1
                                    )
                                )
                            }
                          >
                            Previous
                          </button>


                          <span>
                            Page{" "}

                            <strong>
                              {currentPage}
                            </strong>

                            {" of "}

                            <strong>
                              {totalPages}
                            </strong>
                          </span>


                          <button
                            type="button"
                            className="pb-drafts-secondary-button"
                            disabled={
                              currentPage
                              >=
                              totalPages
                            }
                            onClick={
                              () =>
                                setCurrentPage(
                                  page =>
                                    Math.min(
                                      totalPages,
                                      page + 1
                                    )
                                )
                            }
                          >
                            Next
                          </button>

                        </div>

                      </div>

                    </>
                  )
        }

      </section>


      {/* ======================================================
          ACTIVE PROCESSING NOTE
      ====================================================== */}

      {
        hasActiveExtraction
        &&
        (
          <div className="pb-drafts-processing-note">

            <Loader2
              size={15}
              className="pb-drafts-spin"
            />


            <div>

              <strong>
                Extraction is continuing in the background.
              </strong>

              <span>
                You can leave this page and continue using
                other ERP modules.
              </span>

            </div>

          </div>
        )
      }


      {/* ======================================================
          REVIEW / EDIT MODAL
      ====================================================== */}

      {
        (
          selectedDraft
          ||
          detailLoading
        )
        &&
        (
          <div className="pb-drafts-modal-backdrop">

            <div className="pb-drafts-modal">

              {/* ==================================================
                  MODAL HEADER
              ================================================== */}

              <div className="pb-drafts-modal-header">

                <div>

                  <div className="pb-drafts-modal-eyebrow">
                    READY DRAFT
                  </div>


                  <div className="pb-drafts-modal-title">
                    Review Purchase Bill
                  </div>


                  <div className="pb-drafts-modal-subtitle">
                    {
                      selectedDraft
                        ?.original_filename
                      ||
                      "Loading extracted bill..."
                    }
                  </div>

                </div>


                <button
                  type="button"
                  className="pb-drafts-modal-close"
                  onClick={
                    closeDraft
                  }
                  disabled={
                    actionLoading
                    !==
                    null
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                detailLoading
                  ? (
                      <div className="pb-drafts-modal-state">

                        <Loader2
                          size={24}
                          className="pb-drafts-spin"
                        />

                        Loading extracted details...

                      </div>
                    )
                  : editData
                    ? (
                        <div className="pb-drafts-modal-body">

                          {/* ======================================
                              SUPPLIER
                          ====================================== */}

                          <section className="pb-drafts-form-section">

                            <div className="pb-drafts-form-section-header">

                              <div className="pb-drafts-form-icon blue">

                                <Building2
                                  size={17}
                                />

                              </div>


                              <div>

                                <div className="pb-drafts-form-title">
                                  Supplier
                                </div>

                                <div className="pb-drafts-form-subtitle">
                                  Seller / invoice issuer details
                                </div>

                              </div>

                            </div>


                            <div className="pb-drafts-form-grid">

                              <EditorField
                                label="Company Name"
                                value={
                                  editData.supplier.company_name
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "company_name",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="GST Number"
                                value={
                                  editData.supplier.gst_number
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "gst_number",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="Contact Person"
                                value={
                                  editData.supplier.contact_person
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "contact_person",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="Phone"
                                value={
                                  editData.supplier.phone
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "phone",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="Email"
                                value={
                                  editData.supplier.email
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "email",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="City"
                                value={
                                  editData.supplier.city
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "city",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="State"
                                value={
                                  editData.supplier.state
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "state",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="Pincode"
                                value={
                                  editData.supplier.pincode
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "pincode",
                                      value
                                    )
                                }
                              />

                            </div>


                            <div className="pb-drafts-form-full">

                              <EditorField
                                label="Address"
                                value={
                                  editData.supplier.address
                                }
                                onChange={
                                  value =>
                                    updateSupplier(
                                      "address",
                                      value
                                    )
                                }
                              />

                            </div>

                          </section>


                          {/* ======================================
                              BILL
                          ====================================== */}

                          <section className="pb-drafts-form-section">

                            <div className="pb-drafts-form-section-header">

                              <div className="pb-drafts-form-icon lavender">

                                <ReceiptText
                                  size={17}
                                />

                              </div>


                              <div>

                                <div className="pb-drafts-form-title">
                                  Purchase Bill
                                </div>

                                <div className="pb-drafts-form-subtitle">
                                  Invoice number, date and commercial totals
                                </div>

                              </div>

                            </div>


                            <div className="pb-drafts-form-grid">

                              <EditorField
                                label="Bill Number"
                                value={
                                  editData.purchase_bill.bill_number
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "bill_number",
                                      value
                                    )
                                }
                              />


                              <EditorField
                                label="Bill Date"
                                value={
                                  editData.purchase_bill.bill_date
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "bill_date",
                                      value
                                    )
                                }
                              />


                              <NumberEditor
                                label="Credit Days"
                                value={
                                  editData.purchase_bill.credit_days
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "credit_days",
                                      value
                                    )
                                }
                              />


                              <NumberEditor
                                label="Subtotal"
                                value={
                                  editData.purchase_bill.subtotal
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "subtotal",
                                      value
                                    )
                                }
                              />


                              <NumberEditor
                                label="Total GST"
                                value={
                                  editData.purchase_bill.total_gst
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "total_gst",
                                      value
                                    )
                                }
                              />


                              <NumberEditor
                                label="Grand Total"
                                value={
                                  editData.purchase_bill.grand_total
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "grand_total",
                                      value
                                    )
                                }
                              />

                            </div>


                            <div className="pb-drafts-form-full">

                              <EditorField
                                label="Remarks"
                                value={
                                  editData.purchase_bill.remarks
                                }
                                onChange={
                                  value =>
                                    updateBill(
                                      "remarks",
                                      value
                                    )
                                }
                              />

                            </div>

                          </section>


                          {/* ======================================
                              PRODUCTS
                          ====================================== */}

                          <section className="pb-drafts-form-section products">

                            <div className="pb-drafts-products-header">

                              <div className="pb-drafts-form-section-header">

                                <div className="pb-drafts-form-icon green">

                                  <Package
                                    size={17}
                                  />

                                </div>


                                <div>

                                  <div className="pb-drafts-form-title">
                                    Products / Items
                                  </div>

                                  <div className="pb-drafts-form-subtitle">
                                    Verify exact product variants,
                                    quantities, rates and GST
                                  </div>

                                </div>

                              </div>


                              <button
                                type="button"
                                className="pb-drafts-secondary-button"
                                onClick={
                                  addProduct
                                }
                              >

                                <Plus
                                  size={14}
                                />

                                Add Product

                              </button>

                            </div>


                            <div className="pb-drafts-product-table-wrap">

                              <table className="pb-drafts-product-table">

                                <thead>

                                  <tr>

                                    <th>
                                      Product
                                    </th>

                                    <th>
                                      Description
                                    </th>

                                    <th>
                                      HSN
                                    </th>

                                    <th>
                                      Unit
                                    </th>

                                    <th>
                                      Qty
                                    </th>

                                    <th>
                                      Price
                                    </th>

                                    <th>
                                      GST %
                                    </th>

                                    <th>
                                      Line Total
                                    </th>

                                    <th>
                                      Action
                                    </th>

                                  </tr>

                                </thead>


                                <tbody>

                                  {
                                    editData.products.map(
                                      (
                                        product,
                                        index
                                      ) => (

                                        <tr
                                          key={
                                            index
                                          }
                                        >

                                          <td>

                                            <input
                                              value={
                                                product.product_name
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "product_name",
                                                    event.target.value
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              value={
                                                product.description
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "description",
                                                    event.target.value
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              value={
                                                product.hsn_code
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "hsn_code",
                                                    event.target.value
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              value={
                                                product.unit
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "unit",
                                                    event.target.value
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              type="number"
                                              step="0.001"
                                              value={
                                                product.quantity
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "quantity",
                                                    Number(
                                                      event.target.value
                                                    )
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              type="number"
                                              step="0.01"
                                              value={
                                                product.purchase_price
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "purchase_price",
                                                    Number(
                                                      event.target.value
                                                    )
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              type="number"
                                              step="0.01"
                                              value={
                                                product.gst_percentage
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "gst_percentage",
                                                    Number(
                                                      event.target.value
                                                    )
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <input
                                              type="number"
                                              step="0.01"
                                              value={
                                                product.line_total
                                              }
                                              onChange={
                                                event =>
                                                  updateProduct(
                                                    index,
                                                    "line_total",
                                                    Number(
                                                      event.target.value
                                                    )
                                                  )
                                              }
                                            />

                                          </td>


                                          <td>

                                            <button
                                              type="button"
                                              className="pb-drafts-product-remove"
                                              title="Remove product"
                                              onClick={
                                                () =>
                                                  removeProduct(
                                                    index
                                                  )
                                              }
                                            >

                                              <Trash2
                                                size={15}
                                              />

                                            </button>

                                          </td>

                                        </tr>

                                      )
                                    )
                                  }

                                </tbody>

                              </table>

                            </div>

                          </section>

                        </div>
                      )
                    : null
              }


              {/* ==================================================
                  MODAL ACTIONS
              ================================================== */}

              {
                editData
                &&
                selectedDraft
                &&
                (
                  <div className="pb-drafts-modal-actions">

                    <button
                      type="button"
                      className="pb-drafts-danger-button"
                      disabled={
                        actionLoading
                        !==
                        null
                      }
                      onClick={
                        () =>
                          void cancelDraft(
                            selectedDraft.id,
                            true
                          )
                      }
                    >

                      <Trash2
                        size={15}
                      />

                      {
                        actionLoading
                        ===
                        "cancel"
                          ? "Removing..."
                          : "Remove Draft"
                      }

                    </button>


                    <div className="pb-drafts-modal-action-right">

                      <button
                        type="button"
                        className="pb-drafts-secondary-button"
                        disabled={
                          actionLoading
                          !==
                          null
                        }
                        onClick={
                          closeDraft
                        }
                      >
                        Close
                      </button>


                      <button
                        type="button"
                        className="pb-drafts-save-button"
                        disabled={
                          actionLoading
                          !==
                          null
                        }
                        onClick={
                          () =>
                            void saveDraft()
                        }
                      >

                        {
                          actionLoading
                          ===
                          "save"
                            ? (
                                <Loader2
                                  size={15}
                                  className="pb-drafts-spin"
                                />
                              )
                            : (
                                <Save
                                  size={15}
                                />
                              )
                        }

                        {
                          actionLoading
                          ===
                          "save"
                            ? "Saving..."
                            : "Save Draft"
                        }

                      </button>


                      <button
                        type="button"
                        className="pb-drafts-confirm-button"
                        disabled={
                          actionLoading
                          !==
                          null
                        }
                        onClick={
                          () =>
                            void confirmDraft()
                        }
                      >

                        {
                          actionLoading
                          ===
                          "confirm"
                            ? (
                                <Loader2
                                  size={15}
                                  className="pb-drafts-spin"
                                />
                              )
                            : (
                                <CheckCircle2
                                  size={15}
                                />
                              )
                        }

                        {
                          actionLoading
                          ===
                          "confirm"
                            ? "Confirming..."
                            : "Confirm Purchase Bill"
                        }

                      </button>

                    </div>

                  </div>
                )
              }

            </div>

          </div>
        )
      }

    </div>
  );

}


/* ================================================================
   TEXT FIELD
================================================================ */

function EditorField(
  {
    label,
    value,
    onChange,
  }:
  {
    label:
      string;

    value:
      string;

    onChange:
      (
        value:
          string
      ) => void;
  }
) {

  return (
    <label className="pb-drafts-field">

      <span>
        {label}
      </span>


      <input
        type="text"
        value={
          value
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
      />

    </label>
  );

}


/* ================================================================
   NUMBER FIELD
================================================================ */

function NumberEditor(
  {
    label,
    value,
    onChange,
  }:
  {
    label:
      string;

    value:
      number;

    onChange:
      (
        value:
          number
      ) => void;
  }
) {

  return (
    <label className="pb-drafts-field">

      <span>
        {label}
      </span>


      <input
        type="number"
        step="0.01"
        value={
          value
        }
        onChange={
          event =>
            onChange(
              Number(
                event.target.value
              )
            )
        }
      />

    </label>
  );

}