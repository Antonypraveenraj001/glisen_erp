import axios from "axios";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FilePlus2,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import "./FinalBillingPage.css";

import {
  createFinalBillFromProforma,
  createFinalBillPayment,
  getFinalBillById,
  getFinalBillPaymentSummary,
  getFinalBills,
  issueFinalBill,
} from "../../services/finalBillService";

import {
  getProformas,
} from "../../services/proformaService";

import type {
  FinalBill,
} from "../../types/finalBill";

import type {
  FinalBillPaymentSummary,
} from "../../types/finalBillPayment";

import type {
  Proforma,
} from "../../types/proforma";


/* ================================================================
   HELPERS
================================================================ */

function formatCurrency(
  value: string | number
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return `₹${value}`;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    numericValue
  );
}


function formatNumber(
  value: string | number
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(
    numericValue
  );
}


function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN"
  );
}


function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-IN"
  );
}


function getLocalToday() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


function getLocalDateTime() {
  const now =
    new Date();

  const timezoneOffset =
    now.getTimezoneOffset()
    * 60000;

  return new Date(
    now.getTime()
    - timezoneOffset
  )
    .toISOString()
    .slice(
      0,
      16
    );
}


function getStatusClass(
  status: string
) {
  const normalized =
    status
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );

  if (
    normalized ===
    "issued"
  ) {
    return "issued";
  }

  if (
    normalized ===
    "draft"
  ) {
    return "draft";
  }

  if (
    normalized ===
    "cancelled"
  ) {
    return "cancelled";
  }

  return "default";
}


function getInvoiceTypeClass(
  invoiceType: string
) {
  const normalized =
    invoiceType
      .toLowerCase();

  if (
    normalized.includes(
      "credit"
    )
  ) {
    return "credit-note";
  }

  if (
    normalized.includes(
      "revised"
    )
  ) {
    return "revised";
  }

  if (
    normalized.includes(
      "tax"
    )
  ) {
    return "tax-invoice";
  }

  return "default";
}


function getApiErrorMessage(
  error: unknown,
  fallback: string
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
      typeof detail ===
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


function getPaymentStatusColor(
  status: string
) {
  switch (
    status
  ) {
    case "Paid":
      return "#159a5b";

    case "Partially Paid":
      return "#d78500";

    case "Pending":
      return "#d66523";

    case "Not Issued":
      return "#7183a3";

    default:
      return "#7183a3";
  }
}


/* ================================================================
   PAGE
================================================================ */

export default function FinalBillingPage() {

  const [
    bills,
    setBills,
  ] =
    useState<
      FinalBill[]
    >([]);


  const [
    proformas,
    setProformas,
  ] =
    useState<
      Proforma[]
    >([]);


  const [
    paymentSummaries,
    setPaymentSummaries,
  ] =
    useState<
      Record<
        number,
        FinalBillPaymentSummary
      >
    >({});


  const [
    selectedBill,
    setSelectedBill,
  ] =
    useState<
      FinalBill | null
    >(
      null
    );


  const [
    selectedPaymentSummary,
    setSelectedPaymentSummary,
  ] =
    useState<
      FinalBillPaymentSummary
      | null
    >(
      null
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    detailError,
    setDetailError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    detailMessage,
    setDetailMessage,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     CREATE BILL
  ============================================================== */

  const [
    createBillOpen,
    setCreateBillOpen,
  ] =
    useState(false);


  const [
    proformaLoading,
    setProformaLoading,
  ] =
    useState(false);


  const [
    proformaSearch,
    setProformaSearch,
  ] =
    useState("");


  const [
    selectedProformaId,
    setSelectedProformaId,
  ] =
    useState<
      number | null
    >(
      null
    );


  const [
    invoiceDate,
    setInvoiceDate,
  ] =
    useState(
      getLocalToday()
    );


  const [
    creatingBill,
    setCreatingBill,
  ] =
    useState(false);


  const [
    createBillError,
    setCreateBillError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     ISSUE BILL
  ============================================================== */

  const [
    issuingBill,
    setIssuingBill,
  ] =
    useState(false);


  /* ==============================================================
     PAYMENT
  ============================================================== */

  const [
    paymentOpen,
    setPaymentOpen,
  ] =
    useState(false);


  const [
    paymentBill,
    setPaymentBill,
  ] =
    useState<
      FinalBill | null
    >(
      null
    );


  const [
    paymentSummary,
    setPaymentSummary,
  ] =
    useState<
      FinalBillPaymentSummary
      | null
    >(
      null
    );


  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      getLocalDateTime()
    );


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState("");


  const [
    paymentType,
    setPaymentType,
  ] =
    useState("Advance");


  const [
    paymentMode,
    setPaymentMode,
  ] =
    useState("Bank Transfer");


  const [
    paymentReference,
    setPaymentReference,
  ] =
    useState("");


  const [
    paymentNotes,
    setPaymentNotes,
  ] =
    useState("");


  const [
    paymentSaving,
    setPaymentSaving,
  ] =
    useState(false);


  const [
    paymentError,
    setPaymentError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     PROFORMA LOOKUP
  ============================================================== */

  const proformaById =
    useMemo(
      () => {

        return new Map(
          proformas.map(
            proforma => [
              proforma.id,
              proforma,
            ]
          )
        );

      },
      [
        proformas,
      ]
    );


  function getProformaNumber(
    proformaId: number
  ) {
    return (
      proformaById
        .get(
          proformaId
        )
        ?.proforma_number
      ??
      `Proforma ${proformaId}`
    );
  }


  /* ==============================================================
     PAYMENT SUMMARY LOADER
  ============================================================== */

  async function loadPaymentSummaries(
    finalBills: FinalBill[]
  ) {

    const results =
      await Promise.all(
        finalBills.map(
          async bill => {

            try {

              const summary =
                await getFinalBillPaymentSummary(
                  bill.id
                );

              return {
                billId:
                  bill.id,

                summary,
              };

            } catch {

              return {
                billId:
                  bill.id,

                summary:
                  null,
              };

            }

          }
        )
      );


    const map:
      Record<
        number,
        FinalBillPaymentSummary
      > = {};


    results.forEach(
      result => {

        if (
          result.summary
        ) {
          map[
            result.billId
          ] =
            result.summary;
        }

      }
    );


    setPaymentSummaries(
      map
    );
  }


  async function refreshPaymentSummary(
    finalBillId: number
  ) {

    const summary =
      await getFinalBillPaymentSummary(
        finalBillId
      );


    setPaymentSummaries(
      current => ({
        ...current,

        [finalBillId]:
          summary,
      })
    );


    return summary;
  }


  /* ==============================================================
     LOAD
  ============================================================== */

  async function loadBills() {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const [
        billData,
        proformaData,
      ] =
        await Promise.all([
          getFinalBills(),
          getProformas(),
        ]);


      setBills(
        billData
      );


      setProformas(
        proformaData
      );


      await loadPaymentSummaries(
        billData
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load Final Bills."
        )
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadBills();

    },
    []
  );


  /* ==============================================================
     FILTERS
  ============================================================== */

  const filteredBills =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return bills.filter(
          bill => {

            const proformaNumber =
              proformaById
                .get(
                  bill.proforma_id
                )
                ?.proforma_number
              ??
              "";


            const matchesSearch =
              !query
              ||
              bill
                .invoice_number
                .toLowerCase()
                .includes(
                  query
                )
              ||
              bill
                .company_name
                .toLowerCase()
                .includes(
                  query
                )
              ||
              (
                bill.gst_number
                ??
                ""
              )
                .toLowerCase()
                .includes(
                  query
                )
              ||
              proformaNumber
                .toLowerCase()
                .includes(
                  query
                );


            const matchesStatus =
              !statusFilter
              ||
              bill.status
              === statusFilter;


            const matchesType =
              !typeFilter
              ||
              bill.invoice_type
              === typeFilter;


            return (
              matchesSearch
              &&
              matchesStatus
              &&
              matchesType
            );

          }
        );

      },
      [
        bills,
        search,
        statusFilter,
        typeFilter,
        proformaById,
      ]
    );


  /* ==============================================================
     KPI
  ============================================================== */

  const issuedCount =
    useMemo(
      () =>
        bills.filter(
          bill =>
            bill.status
              .toLowerCase()
            === "issued"
        ).length,
      [
        bills,
      ]
    );


  const draftCount =
    useMemo(
      () =>
        bills.filter(
          bill =>
            bill.status
              .toLowerCase()
            === "draft"
        ).length,
      [
        bills,
      ]
    );


  const creditNoteCount =
    useMemo(
      () =>
        bills.filter(
          bill =>
            bill.invoice_type
              .toLowerCase()
              .includes(
                "credit"
              )
        ).length,
      [
        bills,
      ]
    );


  const totalInvoiceValue =
    useMemo(
      () =>
        bills.reduce(
          (
            total,
            bill
          ) =>
            total
            +
            Number(
              bill.grand_total
            ),
          0
        ),
      [
        bills,
      ]
    );


  /* ==============================================================
     BILL DETAIL
  ============================================================== */

  async function openBillDetail(
    bill: FinalBill
  ) {

    try {

      setDetailLoading(
        true
      );

      setError(
        null
      );

      setDetailError(
        null
      );

      setDetailMessage(
        null
      );


      const [
        detail,
        summary,
      ] =
        await Promise.all([
          getFinalBillById(
            bill.id
          ),

          getFinalBillPaymentSummary(
            bill.id
          ),
        ]);


      setSelectedBill(
        detail
      );


      setSelectedPaymentSummary(
        summary
      );


      setPaymentSummaries(
        current => ({
          ...current,

          [bill.id]:
            summary,
        })
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load Final Bill details."
        )
      );

    } finally {

      setDetailLoading(
        false
      );

    }

  }


  function closeDetail() {

    if (
      issuingBill
    ) {
      return;
    }


    setSelectedBill(
      null
    );


    setSelectedPaymentSummary(
      null
    );


    setDetailError(
      null
    );


    setDetailMessage(
      null
    );

  }


  /* ==============================================================
     ISSUE BILL
  ============================================================== */

  async function handleIssueBill() {

    if (
      !selectedBill
    ) {
      return;
    }


    const isCreditNote =
      selectedBill.invoice_type
        .toLowerCase()
        .includes(
          "credit"
        );


    const confirmed =
      window.confirm(
        isCreditNote
          ? (
              "Issue this Credit Note?\n\n"
              +
              "Once issued, it will be included "
              +
              "automatically in GST reporting."
            )
          : (
              "Issue this invoice?\n\n"
              +
              "Once issued, it becomes an official "
              +
              "billing document and will be included "
              +
              "automatically in the Sales GST report."
            )
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setIssuingBill(
        true
      );

      setDetailError(
        null
      );

      setDetailMessage(
        null
      );


      const issued =
        await issueFinalBill(
          selectedBill.id
        );


      setSelectedBill(
        issued
      );


      setBills(
        current =>
          current.map(
            bill =>
              bill.id
              === issued.id
                ? issued
                : bill
          )
      );


      const summary =
        await refreshPaymentSummary(
          issued.id
        );


      setSelectedPaymentSummary(
        summary
      );


      setDetailMessage(
        isCreditNote
          ? (
              "Credit Note issued successfully. "
              +
              "GST reporting will include it automatically."
            )
          : (
              "Invoice issued successfully. "
              +
              "It is now included automatically "
              +
              "in the Sales GST report."
            )
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setDetailError(
        getApiErrorMessage(
          err,
          "Unable to issue this billing document."
        )
      );

    } finally {

      setIssuingBill(
        false
      );

    }

  }


  /* ==============================================================
     CREATE BILL
  ============================================================== */

  async function openCreateBill() {

    setCreateBillOpen(
      true
    );


    setSelectedProformaId(
      null
    );


    setProformaSearch(
      ""
    );


    setInvoiceDate(
      getLocalToday()
    );


    setCreateBillError(
      null
    );


    try {

      setProformaLoading(
        true
      );


      const data =
        await getProformas();


      setProformas(
        data
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setCreateBillError(
        getApiErrorMessage(
          err,
          "Unable to load Proformas."
        )
      );

    } finally {

      setProformaLoading(
        false
      );

    }

  }


  function closeCreateBill() {

    if (
      creatingBill
    ) {
      return;
    }


    setCreateBillOpen(
      false
    );


    setSelectedProformaId(
      null
    );


    setCreateBillError(
      null
    );

  }


  const billedProformaIds =
    useMemo(
      () =>
        new Set(
          bills
            .filter(
              bill =>
                bill.parent_invoice_id
                === null
            )
            .map(
              bill =>
                bill.proforma_id
            )
        ),
      [
        bills,
      ]
    );


  const availableProformas =
    useMemo(
      () => {

        const query =
          proformaSearch
            .trim()
            .toLowerCase();


        return proformas

          .filter(
            proforma =>
              !billedProformaIds
                .has(
                  proforma.id
                )
          )

          .filter(
            proforma => {

              if (
                !query
              ) {
                return true;
              }


              return (
                proforma
                  .proforma_number
                  .toLowerCase()
                  .includes(
                    query
                  )
                ||
                proforma
                  .company_name
                  .toLowerCase()
                  .includes(
                    query
                  )
              );

            }
          )

          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.proforma_date
              ).getTime()
              -
              new Date(
                a.proforma_date
              ).getTime()
          );

      },
      [
        proformas,
        billedProformaIds,
        proformaSearch,
      ]
    );


  const selectedProforma =
    useMemo(
      () =>
        availableProformas.find(
          proforma =>
            proforma.id
            === selectedProformaId
        )
        ??
        null,
      [
        availableProformas,
        selectedProformaId,
      ]
    );


  async function handleCreateBill() {

    if (
      selectedProformaId
      === null
    ) {

      setCreateBillError(
        "Select a Proforma first."
      );

      return;

    }


    try {

      setCreatingBill(
        true
      );

      setCreateBillError(
        null
      );


      const created =
        await createFinalBillFromProforma(
          selectedProformaId,
          {
            invoice_date:
              invoiceDate
              ||
              undefined,
          }
        );


      const summary =
        await getFinalBillPaymentSummary(
          created.id
        );


      setBills(
        current => [
          created,
          ...current,
        ]
      );


      setPaymentSummaries(
        current => ({
          ...current,

          [created.id]:
            summary,
        })
      );


      setCreateBillOpen(
        false
      );


      setSelectedProformaId(
        null
      );


      setSelectedBill(
        created
      );


      setSelectedPaymentSummary(
        summary
      );


      setDetailMessage(
        "Draft invoice created. Review it before issuing."
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setCreateBillError(
        getApiErrorMessage(
          err,
          "Unable to create Final Bill."
        )
      );

    } finally {

      setCreatingBill(
        false
      );

    }

  }


  /* ==============================================================
     PAYMENT MODAL
  ============================================================== */

  async function openPayment(
    bill: FinalBill
  ) {

    try {

      setPaymentError(
        null
      );


      const summary =
        paymentSummaries[
          bill.id
        ]
        ??
        await getFinalBillPaymentSummary(
          bill.id
        );


      if (
        !summary
          .is_effective_invoice
      ) {
        return;
      }


      setPaymentBill(
        bill
      );


      setPaymentSummary(
        summary
      );


      setPaymentDate(
        getLocalDateTime()
      );


      setPaymentAmount(
        ""
      );


      setPaymentType(
        Number(
          summary.paid_amount
        ) > 0
          ? "Part Payment"
          : "Advance"
      );


      setPaymentMode(
        "Bank Transfer"
      );


      setPaymentReference(
        ""
      );


      setPaymentNotes(
        ""
      );


      setPaymentOpen(
        true
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load payment information."
        )
      );

    }

  }


  function closePayment() {

    if (
      paymentSaving
    ) {
      return;
    }


    setPaymentOpen(
      false
    );


    setPaymentBill(
      null
    );


    setPaymentSummary(
      null
    );


    setPaymentError(
      null
    );

  }


  async function handleRecordPayment() {

    if (
      !paymentBill
      ||
      !paymentSummary
    ) {
      return;
    }


    const amount =
      Number(
        paymentAmount
      );


    const balance =
      Number(
        paymentSummary
          .balance_amount
      );


    if (
      Number.isNaN(
        amount
      )
      ||
      amount <= 0
    ) {

      setPaymentError(
        "Enter a payment amount greater than zero."
      );

      return;

    }


    if (
      amount
      > balance
    ) {

      setPaymentError(
        `Payment cannot exceed the balance of ${formatCurrency(
          balance
        )}.`
      );

      return;

    }


    try {

      setPaymentSaving(
        true
      );

      setPaymentError(
        null
      );


      await createFinalBillPayment(
        paymentBill.id,
        {
          payment_date:
            paymentDate,

          amount,

          payment_type:
            paymentType
            ||
            null,

          payment_mode:
            paymentMode
            ||
            null,

          reference_number:
            paymentReference
              .trim()
            ||
            null,

          notes:
            paymentNotes
              .trim()
            ||
            null,
        }
      );


      const refreshedSummary =
        await refreshPaymentSummary(
          paymentBill.id
        );


      setPaymentSummary(
        refreshedSummary
      );


      if (
        selectedBill
        &&
        selectedBill.id
        === paymentBill.id
      ) {

        setSelectedPaymentSummary(
          refreshedSummary
        );


        setDetailMessage(
          refreshedSummary.payment_status
          === "Paid"
            ? (
                "Final payment recorded. "
                +
                "Payment Received ✓"
              )
            : (
                "Payment recorded successfully."
              )
        );

      }


      setPaymentOpen(
        false
      );


      setPaymentBill(
        null
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setPaymentError(
        getApiErrorMessage(
          err,
          "Unable to record customer payment."
        )
      );

    } finally {

      setPaymentSaving(
        false
      );

    }

  }


  /* ==============================================================
     PAYMENT CELL

     IMPORTANT:
     Old / superseded Tax Invoices and Revised Invoices show
     NOTHING in the payment column.

     Only the latest effective invoice shows its payment status.
  ============================================================== */

  function renderPaymentCell(
    bill: FinalBill
  ) {

    const summary =
      paymentSummaries[
        bill.id
      ];


    const isCreditNote =
      bill.invoice_type
        .toLowerCase()
        .includes(
          "credit"
        );


    if (
      isCreditNote
    ) {

      return (
        <div
          style={{
            color:
              "#7183a3",
            fontSize:
              "10px",
            fontWeight:
              700,
          }}
        >
          N/A
        </div>
      );

    }


    if (
      bill.status
        .toLowerCase()
      !== "issued"
    ) {

      return (
        <div
          style={{
            color:
              "#7183a3",
            fontSize:
              "10px",
            fontWeight:
              700,
          }}
        >
          Not Issued
        </div>
      );

    }


    if (
      !summary
    ) {

      return (
        <span
          style={{
            color:
              "#7183a3",
            fontSize:
              "10px",
          }}
        >
          Loading...
        </span>
      );

    }


    /*
     * Historical original invoices / old revisions remain
     * visible for audit history, but payment information
     * belongs only to the current effective invoice.
     *
     * Therefore deliberately render an empty Payment cell.
     */
    if (
      !summary
        .is_effective_invoice
    ) {

      return null;

    }


    const paid =
      Number(
        summary.paid_amount
      );


    const balance =
      Number(
        summary.balance_amount
      );


    const canRecord =
      balance > 0;


    return (
      <div
        style={{
          display:
            "flex",
          flexDirection:
            "column",
          alignItems:
            "flex-start",
          gap:
            "4px",
          minWidth:
            "135px",
        }}
      >

        <strong
          style={{
            color:
              getPaymentStatusColor(
                summary.payment_status
              ),
            fontSize:
              "10px",
          }}
        >

          {
            summary.payment_status
            === "Paid"
              ? "Payment Received ✓"
              : summary.payment_status
          }

        </strong>


        {
          summary.payment_status
          !== "Paid"
          && (
            <span
              style={{
                color:
                  "#7183a3",
                fontSize:
                  "9px",
              }}
            >

              {
                formatCurrency(
                  paid
                )
              }
              {" received"}

              <br />

              {
                formatCurrency(
                  balance
                )
              }
              {" balance"}

            </span>
          )
        }


        {
          canRecord
          && (
            <button
              type="button"
              className="final-billing-view-button"
              onClick={() =>
                void openPayment(
                  bill
                )
              }
              style={{
                marginTop:
                  "3px",
                padding:
                  "4px 8px",
                fontSize:
                  "9px",
              }}
            >

              <WalletCards
                size={12}
              />

              Record Payment

            </button>
          )
        }

      </div>
    );

  }


  /* ==============================================================
     UI
  ============================================================== */

  return (
    <div className="final-billing-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="final-billing-header">

        <div>

          <div className="final-billing-eyebrow">
            SALES & TAX DOCUMENTS
          </div>


          <h1 className="final-billing-title">
            Final Billing
          </h1>


          <p className="final-billing-subtitle">
            Create, review and issue invoices,
            track customer payments and maintain
            GST-ready sales documents.
          </p>

        </div>


        <div
          style={{
            display:
              "flex",
            gap:
              "10px",
            alignItems:
              "center",
          }}
        >

          <button
            type="button"
            className="final-billing-refresh"
            onClick={() =>
              void openCreateBill()
            }
            style={{
              background:
                "#3478ed",
              borderColor:
                "#3478ed",
              color:
                "#ffffff",
            }}
          >

            <FilePlus2
              size={16}
            />

            Create Bill

          </button>


          <button
            type="button"
            className="final-billing-refresh"
            onClick={() =>
              void loadBills()
            }
          >

            <RefreshCw
              size={16}
            />

            Refresh

          </button>

        </div>

      </div>


      {
        error
        && (
          <div className="final-billing-error">
            {error}
          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="final-billing-kpi-grid">

        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Total Documents
            </div>

            <div className="final-billing-kpi-value">
              {bills.length}
            </div>

          </div>


          <div className="final-billing-kpi-icon blue">

            <FileText
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Issued
            </div>

            <div className="final-billing-kpi-value">
              {issuedCount}
            </div>

          </div>


          <div className="final-billing-kpi-icon green">

            <CheckCircle2
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Draft
            </div>

            <div className="final-billing-kpi-value">
              {draftCount}
            </div>

          </div>


          <div className="final-billing-kpi-icon lavender">

            <ReceiptText
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Credit Notes
            </div>

            <div className="final-billing-kpi-value">
              {creditNoteCount}
            </div>

          </div>


          <div className="final-billing-kpi-icon rose">

            <ShieldCheck
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Total Document Value
            </div>

            <div className="final-billing-kpi-value final-billing-kpi-money">

              {
                formatCurrency(
                  totalInvoiceValue
                )
              }

            </div>

          </div>


          <div className="final-billing-kpi-icon amber">

            <BadgeIndianRupee
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          BILL LIST
      ====================================================== */}

      <div className="final-billing-panel">

        <div className="final-billing-panel-header">

          <div>

            <div className="final-billing-panel-title">
              Billing Documents
            </div>


            <div className="final-billing-panel-subtitle">
              Tax invoices, revised invoices,
              credit notes and payment status.
            </div>

          </div>


          <div className="final-billing-record-count">

            {
              filteredBills.length
            }
            {" records"}

          </div>

        </div>


        <div className="final-billing-toolbar">

          <div className="final-billing-search">

            <Search
              size={16}
            />


            <input
              type="text"
              value={
                search
              }
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
              placeholder="Search invoice, customer, GSTIN or Proforma..."
            />


            {
              search
              && (
                <button
                  type="button"
                  className="final-billing-search-clear"
                  onClick={() =>
                    setSearch("")
                  }
                >

                  <X
                    size={15}
                  />

                </button>
              )
            }

          </div>


          <select
            className="final-billing-select"
            value={
              statusFilter
            }
            onChange={
              event =>
                setStatusFilter(
                  event.target.value
                )
            }
          >

            <option value="">
              All Status
            </option>

            <option value="Draft">
              Draft
            </option>

            <option value="Issued">
              Issued
            </option>

          </select>


          <select
            className="final-billing-select"
            value={
              typeFilter
            }
            onChange={
              event =>
                setTypeFilter(
                  event.target.value
                )
            }
          >

            <option value="">
              All Invoice Types
            </option>

            <option value="Tax Invoice">
              Tax Invoice
            </option>

            <option value="Revised Invoice">
              Revised Invoice
            </option>

            <option value="Credit Note">
              Credit Note
            </option>

          </select>

        </div>


        {
          loading
            ? (
              <div className="final-billing-loading">

                <Loader2
                  size={22}
                  className="final-billing-spin"
                />

                Loading Final Bills...

              </div>
            )
            : filteredBills.length
              === 0
              ? (
                <div className="final-billing-empty">

                  <FileText
                    size={25}
                  />

                  No billing documents found.

                </div>
              )
              : (
                <div className="final-billing-table-wrap">

                  <table className="final-billing-table">

                    <thead>

                      <tr>

                        <th>
                          Invoice
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Customer
                        </th>

                        <th>
                          Type
                        </th>

                        <th>
                          Revision
                        </th>

                        <th>
                          Grand Total
                        </th>

                        <th>
                          Payment
                        </th>

                        <th>
                          Status
                        </th>

                        <th className="align-right">
                          View
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {
                        filteredBills.map(
                          bill => (
                            <tr
                              key={
                                bill.id
                              }
                            >

                              <td>

                                <div className="final-billing-invoice-number">

                                  {
                                    bill
                                      .invoice_number
                                  }

                                </div>


                                <div className="final-billing-row-note">

                                  {
                                    getProformaNumber(
                                      bill.proforma_id
                                    )
                                  }

                                </div>

                              </td>


                              <td>

                                {
                                  formatDate(
                                    bill.invoice_date
                                  )
                                }

                              </td>


                              <td>

                                <div className="final-billing-company">

                                  {
                                    bill.company_name
                                  }

                                </div>


                                <div className="final-billing-row-note">

                                  {
                                    bill.gst_number
                                    ||
                                    "No GSTIN"
                                  }

                                </div>

                              </td>


                              <td>

                                <span
                                  className={`final-billing-type ${getInvoiceTypeClass(
                                    bill.invoice_type
                                  )}`}
                                >

                                  {
                                    bill.invoice_type
                                  }

                                </span>

                              </td>


                              <td>

                                R
                                {
                                  bill
                                    .revision_number
                                }

                              </td>


                              <td>

                                <strong>

                                  {
                                    formatCurrency(
                                      bill.grand_total
                                    )
                                  }

                                </strong>

                              </td>


                              <td>

                                {
                                  renderPaymentCell(
                                    bill
                                  )
                                }

                              </td>


                              <td>

                                <span
                                  className={`final-billing-status ${getStatusClass(
                                    bill.status
                                  )}`}
                                >

                                  {
                                    bill.status
                                  }

                                </span>

                              </td>


                              <td className="align-right">

                                <button
                                  type="button"
                                  className="final-billing-view-button"
                                  onClick={() =>
                                    void openBillDetail(
                                      bill
                                    )
                                  }
                                >

                                  Details

                                  <ChevronRight
                                    size={14}
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
              )
        }

      </div>


      {
        detailLoading
        && (
          <div className="final-billing-detail-loading">

            <Loader2
              size={20}
              className="final-billing-spin"
            />

            Loading invoice details...

          </div>
        )
      }


      {/* ======================================================
          CREATE BILL MODAL
      ====================================================== */}

      {
        createBillOpen
        && (
          <div className="final-billing-modal-backdrop">

            <div className="final-billing-modal">

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    CREATE TAX INVOICE
                  </div>


                  <div className="final-billing-modal-title">
                    Create Bill Against Proforma
                  </div>


                  <div className="final-billing-modal-subtitle">
                    Select an unbilled Proforma.
                    Production and Finished Product
                    eligibility will be checked automatically.
                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeCreateBill
                  }
                  disabled={
                    creatingBill
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                createBillError
                && (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {
                      createBillError
                    }
                  </div>
                )
              }


              <div className="final-billing-detail-section">

                <div className="final-billing-section-header">

                  <div>

                    <div className="final-billing-section-title">
                      Available Proformas
                    </div>


                    <div className="final-billing-section-subtitle">
                      Proformas with an existing
                      original Final Bill are hidden.
                    </div>

                  </div>


                  <div className="final-billing-section-count">

                    {
                      availableProformas
                        .length
                    }
                    {" available"}

                  </div>

                </div>


                <div className="final-billing-toolbar">

                  <div className="final-billing-search">

                    <Search
                      size={16}
                    />


                    <input
                      type="text"
                      value={
                        proformaSearch
                      }
                      onChange={
                        event =>
                          setProformaSearch(
                            event.target.value
                          )
                      }
                      placeholder="Search Proforma or customer..."
                    />

                  </div>


                  <input
                    type="date"
                    className="final-billing-select"
                    value={
                      invoiceDate
                    }
                    onChange={
                      event =>
                        setInvoiceDate(
                          event.target.value
                        )
                    }
                  />

                </div>


                {
                  proformaLoading
                    ? (
                      <div className="final-billing-loading">

                        <Loader2
                          size={22}
                          className="final-billing-spin"
                        />

                        Loading Proformas...

                      </div>
                    )
                    : availableProformas.length
                      === 0
                      ? (
                        <div className="final-billing-empty">

                          <FileText
                            size={25}
                          />

                          No unbilled Proformas available.

                        </div>
                      )
                      : (
                        <div className="final-billing-table-wrap">

                          <table className="final-billing-table">

                            <thead>

                              <tr>

                                <th>
                                  Proforma
                                </th>

                                <th>
                                  Date
                                </th>

                                <th>
                                  Customer
                                </th>

                                <th>
                                  Status
                                </th>

                                <th>
                                  Items
                                </th>

                                <th>
                                  Value
                                </th>

                                <th className="align-right">
                                  Select
                                </th>

                              </tr>

                            </thead>


                            <tbody>

                              {
                                availableProformas.map(
                                  proforma => {

                                    const isSelected =
                                      selectedProformaId
                                      === proforma.id;


                                    return (
                                      <tr
                                        key={
                                          proforma.id
                                        }
                                        style={
                                          isSelected
                                            ? {
                                                background:
                                                  "#f1f6ff",
                                              }
                                            : undefined
                                        }
                                      >

                                        <td>

                                          <div className="final-billing-invoice-number">

                                            {
                                              proforma
                                                .proforma_number
                                            }

                                          </div>

                                        </td>


                                        <td>

                                          {
                                            formatDate(
                                              proforma
                                                .proforma_date
                                            )
                                          }

                                        </td>


                                        <td>

                                          <div className="final-billing-company">

                                            {
                                              proforma
                                                .company_name
                                            }

                                          </div>

                                        </td>


                                        <td>

                                          {
                                            proforma.status
                                          }

                                        </td>


                                        <td>

                                          {
                                            proforma
                                              .items
                                              .length
                                          }

                                        </td>


                                        <td>

                                          <strong>

                                            {
                                              formatCurrency(
                                                proforma
                                                  .grand_total
                                              )
                                            }

                                          </strong>

                                        </td>


                                        <td className="align-right">

                                          <button
                                            type="button"
                                            className="final-billing-view-button"
                                            onClick={() =>
                                              setSelectedProformaId(
                                                proforma.id
                                              )
                                            }
                                            style={
                                              isSelected
                                                ? {
                                                    background:
                                                      "#3478ed",
                                                    borderColor:
                                                      "#3478ed",
                                                    color:
                                                      "#ffffff",
                                                  }
                                                : undefined
                                            }
                                          >

                                            {
                                              isSelected
                                                ? "Selected"
                                                : "Select"
                                            }

                                          </button>

                                        </td>

                                      </tr>
                                    );

                                  }
                                )
                              }

                            </tbody>

                          </table>

                        </div>
                      )
                }

              </div>


              {
                selectedProforma
                && (
                  <div
                    className="final-billing-info-grid"
                    style={{
                      gridTemplateColumns:
                        "1fr",
                    }}
                  >

                    <div className="final-billing-info-card">

                      <div className="final-billing-info-title">
                        Selected Proforma
                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Proforma
                        </span>

                        <strong>

                          {
                            selectedProforma
                              .proforma_number
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Customer
                        </span>

                        <strong>

                          {
                            selectedProforma
                              .company_name
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Proforma Total
                        </span>

                        <strong>

                          {
                            formatCurrency(
                              selectedProforma
                                .grand_total
                            )
                          }

                        </strong>

                      </div>

                    </div>

                  </div>
                )
              }


              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap:
                    "10px",
                  padding:
                    "20px",
                  marginTop:
                    "18px",
                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    closeCreateBill
                  }
                  disabled={
                    creatingBill
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={() =>
                    void handleCreateBill()
                  }
                  disabled={
                    selectedProformaId
                    === null
                    ||
                    creatingBill
                  }
                  style={{
                    background:
                      "#3478ed",
                    borderColor:
                      "#3478ed",
                    color:
                      "#ffffff",
                  }}
                >

                  {
                    creatingBill
                      ? (
                        <>

                          <Loader2
                            size={16}
                            className="final-billing-spin"
                          />

                          Creating...

                        </>
                      )
                      : (
                        <>

                          <FilePlus2
                            size={16}
                          />

                          Generate Draft Bill

                        </>
                      )
                  }

                </button>

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          BILL DETAIL
      ====================================================== */}

      {
        selectedBill
        && (
          <div className="final-billing-modal-backdrop">

            <div className="final-billing-modal">

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">

                    {
                      selectedBill
                        .invoice_type
                    }

                  </div>


                  <div className="final-billing-modal-title">

                    {
                      selectedBill
                        .invoice_number
                    }

                  </div>


                  <div className="final-billing-modal-subtitle">

                    {
                      selectedBill
                        .company_name
                    }

                    {" • "}

                    {
                      formatDate(
                        selectedBill
                          .invoice_date
                      )
                    }

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeDetail
                  }
                  disabled={
                    issuingBill
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                detailError
                && (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >

                    {
                      detailError
                    }

                  </div>
                )
              }


              {
                detailMessage
                && (
                  <div
                    style={{
                      margin:
                        "18px 20px 0",
                      padding:
                        "11px 14px",
                      border:
                        "1px solid #ccebdc",
                      borderRadius:
                        "9px",
                      background:
                        "#f2fbf6",
                      color:
                        "#198c56",
                      fontSize:
                        "10px",
                      fontWeight:
                        700,
                    }}
                  >

                    {
                      detailMessage
                    }

                  </div>
                )
              }


              <div className="final-billing-detail-summary">

                <div>

                  <span>
                    Status
                  </span>

                  <strong>

                    {
                      selectedBill.status
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Revision
                  </span>

                  <strong>

                    R
                    {
                      selectedBill
                        .revision_number
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Proforma
                  </span>

                  <strong>

                    {
                      getProformaNumber(
                        selectedBill
                          .proforma_id
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Customer
                  </span>

                  <strong>

                    {
                      selectedBill
                        .company_name
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    GSTIN
                  </span>

                  <strong>

                    {
                      selectedBill
                        .gst_number
                      ||
                      "-"
                    }

                  </strong>

                </div>

              </div>


              <div className="final-billing-info-grid">

                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Customer Details
                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Company
                    </span>

                    <strong>

                      {
                        selectedBill
                          .company_name
                      }

                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Contact
                    </span>

                    <strong>

                      {
                        selectedBill
                          .contact_person
                        ||
                        "-"
                      }

                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Phone
                    </span>

                    <strong>

                      {
                        selectedBill
                          .phone
                        ||
                        "-"
                      }

                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Email
                    </span>

                    <strong>

                      {
                        selectedBill
                          .email
                        ||
                        "-"
                      }

                    </strong>

                  </div>

                </div>


                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Addresses
                  </div>


                  <div className="final-billing-address-block">

                    <span>
                      Billing Address
                    </span>

                    <p>

                      {
                        selectedBill
                          .billing_address
                        ||
                        "-"
                      }

                    </p>

                  </div>


                  <div className="final-billing-address-block">

                    <span>
                      Shipping Address
                    </span>

                    <p>

                      {
                        selectedBill
                          .shipping_address
                        ||
                        "-"
                      }

                    </p>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  ITEMS
              ================================================== */}

              <div className="final-billing-detail-section">

                <div className="final-billing-section-header">

                  <div>

                    <div className="final-billing-section-title">
                      Invoice Items
                    </div>


                    <div className="final-billing-section-subtitle">
                      Quantity, price, discount
                      and GST calculation.
                    </div>

                  </div>


                  <div className="final-billing-section-count">

                    {
                      selectedBill
                        .items
                        .length
                    }
                    {" items"}

                  </div>

                </div>


                <div className="final-billing-table-wrap">

                  <table className="final-billing-table final-billing-detail-table">

                    <thead>

                      <tr>

                        <th>
                          Description
                        </th>

                        <th>
                          HSN
                        </th>

                        <th>
                          Qty
                        </th>

                        <th>
                          Unit
                        </th>

                        <th>
                          Unit Price
                        </th>

                        <th>
                          Discount
                        </th>

                        <th>
                          Taxable
                        </th>

                        <th>
                          GST %
                        </th>

                        <th>
                          CGST
                        </th>

                        <th>
                          SGST
                        </th>

                        <th>
                          IGST
                        </th>

                        <th>
                          Total
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {
                        selectedBill
                          .items
                          .map(
                            item => (
                              <tr
                                key={
                                  item.id
                                }
                              >

                                <td>

                                  <strong>

                                    {
                                      item.description
                                      ||
                                      "-"
                                    }

                                  </strong>

                                </td>


                                <td>

                                  {
                                    item.hsn_code
                                    ||
                                    "-"
                                  }

                                </td>


                                <td>

                                  {
                                    formatNumber(
                                      item.quantity
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    item.unit
                                    ||
                                    "-"
                                  }

                                </td>


                                <td>

                                  {
                                    formatCurrency(
                                      item.unit_price
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    formatCurrency(
                                      item.discount_amount
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    formatCurrency(
                                      item.taxable_amount
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    formatNumber(
                                      item.gst_percent
                                    )
                                  }
                                  %

                                </td>


                                <td>

                                  {
                                    formatCurrency(
                                      item.cgst_amount
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    formatCurrency(
                                      item.sgst_amount
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    formatCurrency(
                                      item.igst_amount
                                    )
                                  }

                                </td>


                                <td>

                                  <strong>

                                    {
                                      formatCurrency(
                                        item.line_total
                                      )
                                    }

                                  </strong>

                                </td>

                              </tr>
                            )
                          )
                      }

                    </tbody>

                  </table>

                </div>

              </div>


              {/* ==================================================
                  TERMS + TOTALS
              ================================================== */}

              <div className="final-billing-bottom-grid">

                <div className="final-billing-terms-card">

                  <div className="final-billing-info-title">
                    Commercial Terms
                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Payment Terms
                    </span>

                    <strong>

                      {
                        selectedBill
                          .payment_terms
                        ||
                        "-"
                      }

                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Delivery Terms
                    </span>

                    <strong>

                      {
                        selectedBill
                          .delivery_terms
                        ||
                        "-"
                      }

                    </strong>

                  </div>


                  <div className="final-billing-address-block">

                    <span>
                      Notes
                    </span>

                    <p>

                      {
                        selectedBill.notes
                        ||
                        "No notes."
                      }

                    </p>

                  </div>

                </div>


                <div className="final-billing-totals-card">

                  <div className="final-billing-total-row">

                    <span>
                      Subtotal
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.subtotal
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      Discount
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill
                            .discount_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      Taxable Amount
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill
                            .taxable_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      CGST
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill
                            .cgst_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      SGST
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill
                            .sgst_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      IGST
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill
                            .igst_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row final">

                    <span>
                      Grand Total
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill
                            .grand_total
                        )
                      }

                    </strong>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  PAYMENT SUMMARY

                  Only shown for CURRENT EFFECTIVE invoice.
                  Old Tax Invoice / R1 / older revisions show no
                  payment section at all.
              ================================================== */}

              {
                selectedPaymentSummary
                &&
                selectedPaymentSummary
                  .is_effective_invoice
                &&
                !selectedBill.invoice_type
                  .toLowerCase()
                  .includes(
                    "credit"
                  )
                && (
                  <div
                    className="final-billing-detail-section"
                    style={{
                      marginTop:
                        "18px",
                    }}
                  >

                    <div className="final-billing-section-header">

                      <div>

                        <div className="final-billing-section-title">

                          <WalletCards
                            size={16}
                            style={{
                              marginRight:
                                "6px",
                            }}
                          />

                          Payment Status

                        </div>


                        <div className="final-billing-section-subtitle">
                          Advance, partial and final customer payments.
                        </div>

                      </div>


                      <strong
                        style={{
                          color:
                            getPaymentStatusColor(
                              selectedPaymentSummary
                                .payment_status
                            ),
                        }}
                      >

                        {
                          selectedPaymentSummary
                            .payment_status
                          === "Paid"
                            ? "Payment Received ✓"
                            : selectedPaymentSummary
                                .payment_status
                        }

                      </strong>

                    </div>


                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(3, minmax(0, 1fr))",
                        gap:
                          "12px",
                        padding:
                          "16px",
                      }}
                    >

                      <div className="final-billing-info-card">

                        <div className="final-billing-info-title">
                          Receivable
                        </div>

                        <strong>

                          {
                            formatCurrency(
                              selectedPaymentSummary
                                .receivable_amount
                            )
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-card">

                        <div className="final-billing-info-title">
                          Received
                        </div>

                        <strong
                          style={{
                            color:
                              "#159a5b",
                          }}
                        >

                          {
                            formatCurrency(
                              selectedPaymentSummary
                                .paid_amount
                            )
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-card">

                        <div className="final-billing-info-title">
                          Balance
                        </div>

                        <strong
                          style={{
                            color:
                              Number(
                                selectedPaymentSummary
                                  .balance_amount
                              ) > 0
                                ? "#d66523"
                                : "#159a5b",
                          }}
                        >

                          {
                            formatCurrency(
                              selectedPaymentSummary
                                .balance_amount
                            )
                          }

                        </strong>

                      </div>

                    </div>


                    {
                      selectedPaymentSummary
                        .payments
                        .length
                      > 0
                      && (
                        <div className="final-billing-table-wrap">

                          <table className="final-billing-table">

                            <thead>

                              <tr>

                                <th>
                                  Date
                                </th>

                                <th>
                                  Type
                                </th>

                                <th>
                                  Mode
                                </th>

                                <th>
                                  Reference
                                </th>

                                <th>
                                  Amount
                                </th>

                              </tr>

                            </thead>


                            <tbody>

                              {
                                selectedPaymentSummary
                                  .payments
                                  .map(
                                    payment => (
                                      <tr
                                        key={
                                          payment.id
                                        }
                                      >

                                        <td>

                                          {
                                            formatDateTime(
                                              payment.payment_date
                                            )
                                          }

                                        </td>


                                        <td>

                                          {
                                            payment.payment_type
                                            ||
                                            "-"
                                          }

                                        </td>


                                        <td>

                                          {
                                            payment.payment_mode
                                            ||
                                            "-"
                                          }

                                        </td>


                                        <td>

                                          {
                                            payment.reference_number
                                            ||
                                            "-"
                                          }

                                        </td>


                                        <td>

                                          <strong>

                                            {
                                              formatCurrency(
                                                payment.amount
                                              )
                                            }

                                          </strong>

                                        </td>

                                      </tr>
                                    )
                                  )
                              }

                            </tbody>

                          </table>

                        </div>
                      )
                    }

                  </div>
                )
              }


              {/* ==================================================
                  ACTIONS
              ================================================== */}

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  alignItems:
                    "center",
                  gap:
                    "10px",
                  marginTop:
                    "20px",
                  paddingTop:
                    "18px",
                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                {
                  selectedBill.status
                    .toLowerCase()
                  === "draft"
                  && (
                    <button
                      type="button"
                      className="final-billing-refresh"
                      disabled={
                        issuingBill
                      }
                      onClick={() =>
                        void handleIssueBill()
                      }
                      style={{
                        background:
                          "#159a5b",
                        borderColor:
                          "#159a5b",
                        color:
                          "#ffffff",
                        minHeight:
                          "42px",
                      }}
                    >

                      {
                        issuingBill
                          ? (
                            <>

                              <Loader2
                                size={16}
                                className="final-billing-spin"
                              />

                              Issuing...

                            </>
                          )
                          : (
                            <>

                              <CheckCircle2
                                size={16}
                              />

                              {
                                selectedBill.invoice_type
                                  .toLowerCase()
                                  .includes(
                                    "credit"
                                  )
                                  ? "Issue Credit Note"
                                  : "Issue Invoice"
                              }

                            </>
                          )
                      }

                    </button>
                  )
                }


                {
                  selectedBill.status
                    .toLowerCase()
                  === "issued"
                  &&
                  !selectedBill.invoice_type
                    .toLowerCase()
                    .includes(
                      "credit"
                    )
                  &&
                  selectedPaymentSummary
                  &&
                  selectedPaymentSummary
                    .is_effective_invoice
                  &&
                  Number(
                    selectedPaymentSummary
                      .balance_amount
                  ) > 0
                  && (
                    <button
                      type="button"
                      className="final-billing-refresh"
                      onClick={() =>
                        void openPayment(
                          selectedBill
                        )
                      }
                      style={{
                        background:
                          "#3478ed",
                        borderColor:
                          "#3478ed",
                        color:
                          "#ffffff",
                      }}
                    >

                      <WalletCards
                        size={16}
                      />

                      Record Payment

                    </button>
                  )
                }


                {
                  selectedPaymentSummary
                  &&
                  selectedPaymentSummary
                    .is_effective_invoice
                  &&
                  selectedPaymentSummary
                    .payment_status
                  === "Paid"
                  && (
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "6px",
                        padding:
                          "9px 13px",
                        border:
                          "1px solid #ccebdc",
                        borderRadius:
                          "9px",
                        background:
                          "#f2fbf6",
                        color:
                          "#159a5b",
                        fontSize:
                          "10px",
                        fontWeight:
                          800,
                      }}
                    >

                      <CheckCircle2
                        size={15}
                      />

                      Payment Received ✓

                    </div>
                  )
                }

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          PAYMENT MODAL
      ====================================================== */}

      {
        paymentOpen
        &&
        paymentBill
        &&
        paymentSummary
        && (
          <div className="final-billing-modal-backdrop">

            <div
              className="final-billing-modal"
              style={{
                maxWidth:
                  "720px",
              }}
            >

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    CUSTOMER PAYMENT
                  </div>


                  <div className="final-billing-modal-title">
                    Record Payment
                  </div>


                  <div className="final-billing-modal-subtitle">

                    {
                      paymentBill
                        .invoice_number
                    }

                    {" • "}

                    {
                      paymentBill
                        .company_name
                    }

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closePayment
                  }
                  disabled={
                    paymentSaving
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                paymentError
                && (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >

                    {
                      paymentError
                    }

                  </div>
                )
              }


              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap:
                    "12px",
                  padding:
                    "20px",
                }}
              >

                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Invoice Total
                  </div>

                  <strong>

                    {
                      formatCurrency(
                        paymentSummary
                          .receivable_amount
                      )
                    }

                  </strong>

                </div>


                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Received
                  </div>

                  <strong
                    style={{
                      color:
                        "#159a5b",
                    }}
                  >

                    {
                      formatCurrency(
                        paymentSummary
                          .paid_amount
                      )
                    }

                  </strong>

                </div>


                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Balance
                  </div>

                  <strong
                    style={{
                      color:
                        "#d66523",
                    }}
                  >

                    {
                      formatCurrency(
                        paymentSummary
                          .balance_amount
                      )
                    }

                  </strong>

                </div>

              </div>


              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap:
                    "14px",
                  padding:
                    "0 20px 20px",
                }}
              >

                <label>

                  <div className="final-billing-info-title">
                    Payment Date *
                  </div>

                  <input
                    type="datetime-local"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentDate
                    }
                    onChange={
                      event =>
                        setPaymentDate(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Amount *
                  </div>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentAmount
                    }
                    onChange={
                      event =>
                        setPaymentAmount(
                          event.target.value
                        )
                    }
                    placeholder="Amount received"
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Payment Type
                  </div>

                  <select
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentType
                    }
                    onChange={
                      event =>
                        setPaymentType(
                          event.target.value
                        )
                    }
                  >

                    <option value="Advance">
                      Advance
                    </option>

                    <option value="Part Payment">
                      Part Payment
                    </option>

                    <option value="Final Payment">
                      Final Payment
                    </option>

                  </select>

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Payment Mode
                  </div>

                  <select
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentMode
                    }
                    onChange={
                      event =>
                        setPaymentMode(
                          event.target.value
                        )
                    }
                  >

                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>

                    <option value="UPI">
                      UPI
                    </option>

                    <option value="Cash">
                      Cash
                    </option>

                    <option value="Cheque">
                      Cheque
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Reference / UTR
                  </div>

                  <input
                    type="text"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentReference
                    }
                    onChange={
                      event =>
                        setPaymentReference(
                          event.target.value
                        )
                    }
                    placeholder="UTR, cheque no., transaction reference"
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Notes
                  </div>

                  <input
                    type="text"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentNotes
                    }
                    onChange={
                      event =>
                        setPaymentNotes(
                          event.target.value
                        )
                    }
                    placeholder="Optional notes"
                  />

                </label>

              </div>


              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  padding:
                    "18px 20px",
                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={() => {

                    setPaymentAmount(
                      paymentSummary
                        .balance_amount
                    );

                    setPaymentType(
                      "Final Payment"
                    );

                  }}
                >

                  <CircleDollarSign
                    size={15}
                  />

                  Use Full Balance

                </button>


                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "10px",
                  }}
                >

                  <button
                    type="button"
                    className="final-billing-refresh"
                    onClick={
                      closePayment
                    }
                    disabled={
                      paymentSaving
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    className="final-billing-refresh"
                    onClick={() =>
                      void handleRecordPayment()
                    }
                    disabled={
                      paymentSaving
                    }
                    style={{
                      background:
                        "#3478ed",
                      borderColor:
                        "#3478ed",
                      color:
                        "#ffffff",
                    }}
                  >

                    {
                      paymentSaving
                        ? (
                          <>

                            <Loader2
                              size={16}
                              className="final-billing-spin"
                            />

                            Saving...

                          </>
                        )
                        : (
                          <>

                            <WalletCards
                              size={16}
                            />

                            Record Payment

                          </>
                        )
                    }

                  </button>

                </div>

              </div>

            </div>

          </div>
        )
      }

    </div>
  );
}