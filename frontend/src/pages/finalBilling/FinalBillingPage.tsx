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
  FilePlus2,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import "./FinalBillingPage.css";

import {
  createFinalBillFromProforma,
  getFinalBillById,
  getFinalBills,
} from "../../services/finalBillService";

import {
  getProformas,
} from "../../services/proformaService";

import type {
  FinalBill,
} from "../../types/finalBill";

import type {
  Proforma,
} from "../../types/proforma";


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
  value: string
) {
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
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}


export default function FinalBillingPage() {
  const [
    bills,
    setBills,
  ] =
    useState<FinalBill[]>([]);

  const [
    selectedBill,
    setSelectedBill,
  ] =
    useState<FinalBill | null>(
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
    useState<string | null>(
      null
    );

  /*
   * ============================================================
   * CREATE BILL STATES
   * ============================================================
   */

  const [
    createBillOpen,
    setCreateBillOpen,
  ] =
    useState(false);

  const [
    proformas,
    setProformas,
  ] =
    useState<Proforma[]>([]);

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
    useState<number | null>(
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
    useState<string | null>(
      null
    );


  /*
   * ============================================================
   * LOAD FINAL BILLS
   * ============================================================
   */

  async function loadBills() {
    try {
      setLoading(true);

      setError(null);

      const data =
        await getFinalBills();

      setBills(data);
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "Unable to load final bills."
        )
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(
    () => {
      void loadBills();
    },
    []
  );


  /*
   * ============================================================
   * BILL FILTERS
   * ============================================================
   */

  const filteredBills =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return bills.filter(
          (bill) => {
            const matchesSearch =
              !query ||
              bill.invoice_number
                .toLowerCase()
                .includes(
                  query
                ) ||
              bill.company_name
                .toLowerCase()
                .includes(
                  query
                ) ||
              String(
                bill.proforma_id
              ).includes(
                query
              ) ||
              (
                bill.gst_number ??
                ""
              )
                .toLowerCase()
                .includes(
                  query
                );

            const matchesStatus =
              !statusFilter ||
              bill.status ===
                statusFilter;

            const matchesType =
              !typeFilter ||
              bill.invoice_type ===
                typeFilter;

            return (
              matchesSearch &&
              matchesStatus &&
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
      ]
    );


  /*
   * ============================================================
   * KPI VALUES
   * ============================================================
   */

  const issuedCount =
    useMemo(
      () =>
        bills.filter(
          (bill) =>
            bill.status
              .toLowerCase() ===
            "issued"
        ).length,
      [
        bills,
      ]
    );


  const draftCount =
    useMemo(
      () =>
        bills.filter(
          (bill) =>
            bill.status
              .toLowerCase() ===
            "draft"
        ).length,
      [
        bills,
      ]
    );


  const creditNoteCount =
    useMemo(
      () =>
        bills.filter(
          (bill) =>
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
            total +
            Number(
              bill.grand_total
            ),
          0
        ),
      [
        bills,
      ]
    );


  /*
   * ============================================================
   * FINAL BILL DETAIL
   * ============================================================
   */

  async function openBillDetail(
    bill: FinalBill
  ) {
    try {
      setDetailLoading(
        true
      );

      setError(null);

      const detail =
        await getFinalBillById(
          bill.id
        );

      setSelectedBill(
        detail
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "Unable to load final bill details."
        )
      );
    } finally {
      setDetailLoading(
        false
      );
    }
  }


  function closeDetail() {
    setSelectedBill(
      null
    );
  }


  /*
   * ============================================================
   * CREATE BILL
   * ============================================================
   */

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
    } catch (err) {
      console.error(err);

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


  /*
   * Original Tax Invoice /
   * first Final Bill has no parent.
   *
   * Revised invoices and credit
   * notes have parent_invoice_id.
   *
   * Therefore only the original
   * document should block another
   * Final Bill from being generated
   * for the same Proforma.
   */

  const billedProformaIds =
    useMemo(
      () => {
        return new Set(
          bills
            .filter(
              (bill) =>
                bill
                  .parent_invoice_id ===
                null
            )
            .map(
              (bill) =>
                bill.proforma_id
            )
        );
      },
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
            (proforma) =>
              !billedProformaIds
                .has(
                  proforma.id
                )
          )
          .filter(
            (proforma) => {
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
                  ) ||
                proforma
                  .company_name
                  .toLowerCase()
                  .includes(
                    query
                  ) ||
                String(
                  proforma.id
                ).includes(
                  query
                ) ||
                String(
                  proforma.customer_id
                ).includes(
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
              ).getTime() -
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
        availableProformas
          .find(
            (proforma) =>
              proforma.id ===
              selectedProformaId
          ) ??
        null,
      [
        availableProformas,
        selectedProformaId,
      ]
    );


  async function handleCreateBill() {
    if (
      selectedProformaId ===
      null
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
              invoiceDate ||
              undefined,
          }
        );

      setBills(
        (
          currentBills
        ) => [
          created,
          ...currentBills,
        ]
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
    } catch (err) {
      console.error(err);

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
            Create Final Bills from completed
            Proformas and review tax invoices,
            revised invoices, credit notes,
            GST values and customer billing
            details.
          </p>
        </div>


        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
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


      {error && (
        <div className="final-billing-error">
          {error}
        </div>
      )}


      {/* ======================================================
          KPI CARDS
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
              {formatCurrency(
                totalInvoiceValue
              )}
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
              Tax invoices, revisions,
              and credit notes.
            </div>
          </div>


          <div className="final-billing-record-count">
            {filteredBills.length}
            {" "}
            records
          </div>

        </div>


        <div className="final-billing-toolbar">

          <div className="final-billing-search">
            <Search
              size={16}
            />

            <input
              type="text"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search invoice, customer, GSTIN or proforma..."
            />

            {search && (
              <button
                type="button"
                className="final-billing-search-clear"
                onClick={() =>
                  setSearch(
                    ""
                  )
                }
              >
                <X
                  size={15}
                />
              </button>
            )}
          </div>


          <select
            className="final-billing-select"
            value={statusFilter}
            onChange={(
              event
            ) =>
              setStatusFilter(
                event
                  .target
                  .value
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
            value={typeFilter}
            onChange={(
              event
            ) =>
              setTypeFilter(
                event
                  .target
                  .value
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


        {loading ? (
          <div className="final-billing-loading">
            <Loader2
              size={22}
              className="final-billing-spin"
            />

            Loading final bills...
          </div>
        ) : filteredBills.length ===
          0 ? (
          <div className="final-billing-empty">
            <FileText
              size={25}
            />

            No billing documents found.
          </div>
        ) : (
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
                    Taxable
                  </th>

                  <th>
                    GST
                  </th>

                  <th>
                    Grand Total
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
                {filteredBills.map(
                  (
                    bill
                  ) => (
                    <tr
                      key={bill.id}
                    >

                      <td>
                        <div className="final-billing-invoice-number">
                          {
                            bill
                              .invoice_number
                          }
                        </div>

                        <div className="final-billing-row-note">
                          Proforma #
                          {
                            bill
                              .proforma_id
                          }
                        </div>
                      </td>


                      <td>
                        {formatDate(
                          bill
                            .invoice_date
                        )}
                      </td>


                      <td>
                        <div className="final-billing-company">
                          {
                            bill
                              .company_name
                          }
                        </div>

                        <div className="final-billing-row-note">
                          {
                            bill
                              .gst_number ||
                            "No GSTIN"
                          }
                        </div>
                      </td>


                      <td>
                        <span
                          className={`final-billing-type ${getInvoiceTypeClass(
                            bill
                              .invoice_type
                          )}`}
                        >
                          {
                            bill
                              .invoice_type
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
                        {formatCurrency(
                          bill
                            .taxable_amount
                        )}
                      </td>


                      <td>
                        {formatCurrency(
                          bill
                            .tax_amount
                        )}
                      </td>


                      <td>
                        <strong>
                          {formatCurrency(
                            bill
                              .grand_total
                          )}
                        </strong>
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
                )}
              </tbody>

            </table>

          </div>
        )}

      </div>


      {detailLoading && (
        <div className="final-billing-detail-loading">
          <Loader2
            size={20}
            className="final-billing-spin"
          />

          Loading invoice details...
        </div>
      )}


      {/* ======================================================
          CREATE BILL MODAL
      ====================================================== */}

      {createBillOpen && (
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
                  Production and finished-goods
                  eligibility will be verified
                  before the Draft invoice is created.
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


            {createBillError && (
              <div
                className="final-billing-error"
                style={{
                  margin:
                    "18px 20px 0",
                }}
              >
                {createBillError}
              </div>
            )}


            <div className="final-billing-detail-section">

              <div className="final-billing-section-header">

                <div>
                  <div className="final-billing-section-title">
                    Available Proformas
                  </div>

                  <div className="final-billing-section-subtitle">
                    Proformas that already
                    have an original Final
                    Bill are hidden automatically.
                  </div>
                </div>


                <div className="final-billing-section-count">
                  {
                    availableProformas
                      .length
                  }
                  {" "}
                  available
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
                    onChange={(
                      event
                    ) =>
                      setProformaSearch(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search Proforma or customer..."
                  />

                  {proformaSearch && (
                    <button
                      type="button"
                      className="final-billing-search-clear"
                      onClick={() =>
                        setProformaSearch(
                          ""
                        )
                      }
                    >
                      <X
                        size={15}
                      />
                    </button>
                  )}
                </div>


                <input
                  type="date"
                  className="final-billing-select"
                  value={
                    invoiceDate
                  }
                  onChange={(
                    event
                  ) =>
                    setInvoiceDate(
                      event
                        .target
                        .value
                    )
                  }
                />


                <div
                  className="final-billing-record-count"
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    minHeight:
                      "40px",
                  }}
                >
                  Invoice Date
                </div>

              </div>


              {proformaLoading ? (
                <div className="final-billing-loading">
                  <Loader2
                    size={22}
                    className="final-billing-spin"
                  />

                  Loading Proformas...
                </div>
              ) : availableProformas.length ===
                0 ? (
                <div className="final-billing-empty">
                  <FileText
                    size={25}
                  />

                  No unbilled Proformas available.
                </div>
              ) : (
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
                      {availableProformas.map(
                        (
                          proforma
                        ) => {
                          const isSelected =
                            selectedProformaId ===
                            proforma.id;

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

                                <div className="final-billing-row-note">
                                  ID #
                                  {
                                    proforma
                                      .id
                                  }
                                </div>
                              </td>


                              <td>
                                {formatDate(
                                  proforma
                                    .proforma_date
                                )}
                              </td>


                              <td>
                                <div className="final-billing-company">
                                  {
                                    proforma
                                      .company_name
                                  }
                                </div>

                                <div className="final-billing-row-note">
                                  Customer #
                                  {
                                    proforma
                                      .customer_id
                                  }
                                </div>
                              </td>


                              <td>
                                {
                                  proforma
                                    .status
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
                                  {formatCurrency(
                                    proforma
                                      .grand_total
                                  )}
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
                      )}
                    </tbody>

                  </table>

                </div>
              )}

            </div>


            {selectedProforma && (
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
                      {formatCurrency(
                        selectedProforma
                          .grand_total
                      )}
                    </strong>
                  </div>

                </div>

              </div>
            )}


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
                  selectedProformaId ===
                    null ||
                  creatingBill
                }
                style={{
                  background:
                    "#3478ed",
                  borderColor:
                    "#3478ed",
                  color:
                    "#ffffff",
                  opacity:
                    selectedProformaId ===
                      null ||
                    creatingBill
                      ? 0.55
                      : 1,
                  cursor:
                    selectedProformaId ===
                      null ||
                    creatingBill
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {creatingBill ? (
                  <>
                    <Loader2
                      size={16}
                      className="final-billing-spin"
                    />

                    Creating...
                  </>
                ) : (
                  <>
                    <FilePlus2
                      size={16}
                    />

                    Generate Draft Bill
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}


      {/* ======================================================
          FINAL BILL DETAIL MODAL
      ====================================================== */}

      {selectedBill && (
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
              >
                <X
                  size={18}
                />
              </button>

            </div>


            <div className="final-billing-detail-summary">

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {
                    selectedBill
                      .status
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
                  #
                  {
                    selectedBill
                      .proforma_id
                  }
                </strong>
              </div>


              <div>
                <span>
                  Customer ID
                </span>

                <strong>
                  {
                    selectedBill
                      .customer_id
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
                      .gst_number ||
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
                        .contact_person ||
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
                        .phone ||
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
                        .email ||
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
                        .billing_address ||
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
                        .shipping_address ||
                      "-"
                    }
                  </p>
                </div>

              </div>

            </div>


            <div className="final-billing-detail-section">

              <div className="final-billing-section-header">

                <div>
                  <div className="final-billing-section-title">
                    Invoice Items
                  </div>

                  <div className="final-billing-section-subtitle">
                    Product quantities,
                    pricing and GST calculation.
                  </div>
                </div>


                <div className="final-billing-section-count">
                  {
                    selectedBill
                      .items
                      .length
                  }
                  {" "}
                  items
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
                    {selectedBill
                      .items
                      .map(
                        (
                          item
                        ) => (
                          <tr
                            key={
                              item.id
                            }
                          >

                            <td>
                              <strong>
                                {
                                  item
                                    .description ||
                                  `Product #${item.product_id ?? "-"}`
                                }
                              </strong>
                            </td>


                            <td>
                              {
                                item
                                  .hsn_code ||
                                "-"
                              }
                            </td>


                            <td>
                              {formatNumber(
                                item
                                  .quantity
                              )}
                            </td>


                            <td>
                              {
                                item
                                  .unit ||
                                "-"
                              }
                            </td>


                            <td>
                              {formatCurrency(
                                item
                                  .unit_price
                              )}
                            </td>


                            <td>
                              {formatCurrency(
                                item
                                  .discount_amount
                              )}
                            </td>


                            <td>
                              {formatCurrency(
                                item
                                  .taxable_amount
                              )}
                            </td>


                            <td>
                              {formatNumber(
                                item
                                  .gst_percent
                              )}
                              %
                            </td>


                            <td>
                              {formatCurrency(
                                item
                                  .cgst_amount
                              )}
                            </td>


                            <td>
                              {formatCurrency(
                                item
                                  .sgst_amount
                              )}
                            </td>


                            <td>
                              {formatCurrency(
                                item
                                  .igst_amount
                              )}
                            </td>


                            <td>
                              <strong>
                                {formatCurrency(
                                  item
                                    .line_total
                                )}
                              </strong>
                            </td>

                          </tr>
                        )
                      )}
                  </tbody>

                </table>

              </div>

            </div>


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
                        .payment_terms ||
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
                        .delivery_terms ||
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
                      selectedBill
                        .notes ||
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
                    {formatCurrency(
                      selectedBill
                        .subtotal
                    )}
                  </strong>
                </div>


                <div className="final-billing-total-row">
                  <span>
                    Discount
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedBill
                        .discount_amount
                    )}
                  </strong>
                </div>


                <div className="final-billing-total-row">
                  <span>
                    Taxable Amount
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedBill
                        .taxable_amount
                    )}
                  </strong>
                </div>


                <div className="final-billing-total-row">
                  <span>
                    CGST
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedBill
                        .cgst_amount
                    )}
                  </strong>
                </div>


                <div className="final-billing-total-row">
                  <span>
                    SGST
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedBill
                        .sgst_amount
                    )}
                  </strong>
                </div>


                <div className="final-billing-total-row">
                  <span>
                    IGST
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedBill
                        .igst_amount
                    )}
                  </strong>
                </div>


                <div className="final-billing-total-row final">
                  <span>
                    Grand Total
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedBill
                        .grand_total
                    )}
                  </strong>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}