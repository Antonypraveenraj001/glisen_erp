import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
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
  getFinalBillById,
  getFinalBills,
} from "../../services/finalBillService";

import type {
  FinalBill,
} from "../../types/finalBill";


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


function getStatusClass(
  status: string
) {
  const normalized =
    status
      .toLowerCase()
      .replace(/\s+/g, "-");

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
        "Unable to load final bills."
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void loadBills();
  }, []);


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
                .includes(query) ||
              bill.company_name
                .toLowerCase()
                .includes(query) ||
              String(
                bill.proforma_id
              ).includes(query) ||
              (
                bill.gst_number ??
                ""
              )
                .toLowerCase()
                .includes(query);

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


  const issuedCount =
    useMemo(
      () =>
        bills.filter(
          (bill) =>
            bill.status
              .toLowerCase() ===
            "issued"
        ).length,
      [bills]
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
      [bills]
    );


  const creditNoteCount =
    useMemo(
      () =>
        bills.filter(
          (bill) =>
            bill.invoice_type
              .toLowerCase()
              .includes("credit")
        ).length,
      [bills]
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
      [bills]
    );


  async function openBillDetail(
    bill: FinalBill
  ) {
    try {
      setDetailLoading(true);
      setError(null);

      const detail =
        await getFinalBillById(
          bill.id
        );

      setSelectedBill(detail);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load final bill details."
      );
    } finally {
      setDetailLoading(false);
    }
  }


  function closeDetail() {
    setSelectedBill(null);
  }


  return (
    <div className="final-billing-page">

      <div className="final-billing-header">
        <div>
          <div className="final-billing-eyebrow">
            SALES & TAX DOCUMENTS
          </div>

          <h1 className="final-billing-title">
            Final Billing
          </h1>

          <p className="final-billing-subtitle">
            Review tax invoices,
            revised invoices, credit
            notes, GST values, and
            customer billing details.
          </p>
        </div>

        <button
          type="button"
          className="final-billing-refresh"
          onClick={() =>
            void loadBills()
          }
        >
          <RefreshCw size={16} />

          Refresh
        </button>
      </div>


      {error && (
        <div className="final-billing-error">
          {error}
        </div>
      )}


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
            <FileText size={20} />
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
            <CheckCircle2 size={20} />
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
            <ReceiptText size={20} />
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
            <ShieldCheck size={20} />
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
            <Search size={16} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search invoice, customer, GSTIN or proforma..."
            />

            {search && (
              <button
                type="button"
                className="final-billing-search-clear"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={15} />
              </button>
            )}
          </div>


          <select
            className="final-billing-select"
            value={statusFilter}
            onChange={(event) =>
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
            value={typeFilter}
            onChange={(event) =>
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
            <FileText size={25} />

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
                  (bill) => (
                    <tr key={bill.id}>

                      <td>
                        <div className="final-billing-invoice-number">
                          {
                            bill.invoice_number
                          }
                        </div>

                        <div className="final-billing-row-note">
                          Proforma #
                          {
                            bill.proforma_id
                          }
                        </div>
                      </td>


                      <td>
                        {formatDate(
                          bill.invoice_date
                        )}
                      </td>


                      <td>
                        <div className="final-billing-company">
                          {
                            bill.company_name
                          }
                        </div>

                        <div className="final-billing-row-note">
                          {
                            bill.gst_number ||
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
                        R{
                          bill.revision_number
                        }
                      </td>


                      <td>
                        {formatCurrency(
                          bill.taxable_amount
                        )}
                      </td>


                      <td>
                        {formatCurrency(
                          bill.tax_amount
                        )}
                      </td>


                      <td>
                        <strong>
                          {formatCurrency(
                            bill.grand_total
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
                <X size={18} />
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
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  item.description ||
                                  `Product #${item.product_id ?? "-"}`
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                item.hsn_code ||
                                "-"
                              }
                            </td>

                            <td>
                              {formatNumber(
                                item.quantity
                              )}
                            </td>

                            <td>
                              {
                                item.unit ||
                                "-"
                              }
                            </td>

                            <td>
                              {formatCurrency(
                                item.unit_price
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.discount_amount
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.taxable_amount
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.gst_percent
                              )}
                              %
                            </td>

                            <td>
                              {formatCurrency(
                                item.cgst_amount
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.sgst_amount
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.igst_amount
                              )}
                            </td>

                            <td>
                              <strong>
                                {formatCurrency(
                                  item.line_total
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