import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Factory,
  FileText,
  Loader2,
  PackageCheck,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "./FinishedProductDetailPage.css";

import {
  getFinishedProductTraceability,
} from "../../services/finishedProductService";

import type {
  FinishedProductTraceability,
} from "../../types/finishedProduct";


/* ================================================================
   HELPERS
================================================================ */

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


function getStatusClass(
  value: string
) {
  const status =
    value
      .trim()
      .toLowerCase();

  if (
    status === "issued"
    ||
    status === "completed"
  ) {
    return "green";
  }

  if (
    status === "draft"
  ) {
    return "amber";
  }

  return "blue";
}


/* ================================================================
   PAGE
================================================================ */

export default function FinishedProductDetailPage() {

  const {
    id,
  } =
    useParams();


  const navigate =
    useNavigate();


  const [
    traceability,
    setTraceability,
  ] =
    useState<
      FinishedProductTraceability
      | null
    >(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     LOAD
  ============================================================== */

  useEffect(
    () => {

      async function load() {

        const finishedProductId =
          Number(id);


        if (
          !Number.isInteger(
            finishedProductId
          )
          ||
          finishedProductId <= 0
        ) {

          setError(
            "Invalid Finished Product."
          );

          setLoading(
            false
          );

          return;

        }


        try {

          setLoading(
            true
          );

          setError(
            null
          );


          const data =
            await getFinishedProductTraceability(
              finishedProductId
            );


          setTraceability(
            data
          );

        } catch (
          err
        ) {

          console.error(
            err
          );


          setError(
            "Unable to load Finished Product traceability."
          );

        } finally {

          setLoading(
            false
          );

        }

      }


      void load();

    },
    [
      id,
    ]
  );


  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {

    return (
      <div className="fp-detail-state">

        <Loader2
          size={24}
          className="fp-detail-spin"
        />

        Loading complete product traceability...

      </div>
    );

  }


  /* ==============================================================
     ERROR
  ============================================================== */

  if (
    error
    ||
    !traceability
  ) {

    return (
      <div className="fp-detail-page">

        <button
          type="button"
          className="fp-detail-back"
          onClick={() =>
            navigate(
              "/finished-products"
            )
          }
        >

          <ArrowLeft
            size={16}
          />

          Finished Products

        </button>


        <div className="fp-detail-error">

          {
            error
            ??
            "Finished Product not found."
          }

        </div>

      </div>
    );

  }


  /* ==============================================================
     DATA
  ============================================================== */

  const {
    finished_product,
    product_master,
    enquiry,
    proforma,
    production_order,
    production_materials,
    shop_floor_issues,
    production_operations,
    finished_goods_receipt,
    cost_summary,
    billing,
  } =
    traceability;


  /*
   * Manufactured Finished Product is the source of truth.
   */
  const productName =
    finished_product.product_name
    ||
    production_order.product_name
    ||
    product_master?.product_name
    ||
    "Manufactured Product";


  const productUnit =
    finished_product.unit
    ||
    production_order.unit
    ||
    product_master?.unit
    ||
    "Nos";


  const legacyProductMeta =
    product_master
      ? [
          product_master.product_code,
          product_master.category,
          product_master.hsn_code
            ? `HSN ${product_master.hsn_code}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ")
      : null;


  /*
   * IMPORTANT:
   *
   * The Enquiry snapshot is used for transactional
   * customer display.
   *
   * We intentionally do NOT use traceability.customer
   * here because older enquiries may contain an incorrect
   * historical Customer ID.
   *
   * Enquiry represents the customer information actually
   * captured for this sale.
   */
  const customerName =
    enquiry.company_name
    || proforma.company_name
    || "-";


  const customerContact =
    enquiry.contact_person
    || "-";


  const customerPhone =
    enquiry.phone
    || "-";


  const customerEmail =
    enquiry.email
    || "-";


  const customerGST =
    enquiry.gst_number
    || "-";


  const customerAddress = [
    enquiry.address,
    enquiry.city,
    enquiry.state,
    enquiry.pincode,
  ]
    .filter(Boolean)
    .join(", ")
    || "-";


  return (
    <div className="fp-detail-page">

      {/* ======================================================
          BACK
      ====================================================== */}

      <button
        type="button"
        className="fp-detail-back"
        onClick={() =>
          navigate(
            "/finished-products"
          )
        }
      >

        <ArrowLeft
          size={16}
        />

        Finished Products

      </button>


      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="fp-detail-hero">

        <div>

          <div className="fp-detail-eyebrow">
            PRODUCT TRACEABILITY RECORD
          </div>


          <h1>

            {
              finished_product
                .finished_product_number
            }

          </h1>


          <div className="fp-detail-product-name">

            {
              productName
            }

          </div>


          <div className="fp-detail-product-meta">

            {
              legacyProductMeta
              ??
              `${production_order.production_number} • ${proforma.proforma_number}`
            }

          </div>

        </div>


        <div className="fp-detail-hero-badge">

          <PackageCheck
            size={22}
          />


          <div>

            <span>
              Finished Quantity
            </span>


            <strong>

              {
                formatNumber(
                  cost_summary
                    .finished_quantity
                )
              }

              {" "}

              {
                productUnit
              }

            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          COST SUMMARY
      ====================================================== */}

      <section className="fp-detail-kpi-grid">

        <div className="fp-detail-kpi-card">

          <div className="fp-detail-kpi-icon blue">

            <ShoppingCart
              size={19}
            />

          </div>


          <div>

            <span>
              Material Cost
            </span>


            <strong>

              {
                formatCurrency(
                  cost_summary
                    .actual_material_cost
                )
              }

            </strong>

          </div>

        </div>


        <div className="fp-detail-kpi-card">

          <div className="fp-detail-kpi-icon lavender">

            <Wrench
              size={19}
            />

          </div>


          <div>

            <span>
              Operation Cost
            </span>


            <strong>

              {
                formatCurrency(
                  cost_summary
                    .actual_operation_cost
                )
              }

            </strong>

          </div>

        </div>


        <div className="fp-detail-kpi-card highlight">

          <div className="fp-detail-kpi-icon green">

            <Factory
              size={19}
            />

          </div>


          <div>

            <span>
              Actual Production Cost
            </span>


            <strong>

              {
                formatCurrency(
                  cost_summary
                    .actual_production_cost
                )
              }

            </strong>

          </div>

        </div>


        <div className="fp-detail-kpi-card">

          <div className="fp-detail-kpi-icon amber">

            <CircleDollarSign
              size={19}
            />

          </div>


          <div>

            <span>
              Cost Per Unit
            </span>


            <strong>

              {
                formatCurrency(
                  cost_summary
                    .cost_per_unit
                )
              }

            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          BUSINESS ORIGIN
      ====================================================== */}

      <section className="fp-detail-section">

        <div className="fp-detail-section-header">

          <div className="fp-detail-section-icon blue">

            <ClipboardList
              size={18}
            />

          </div>


          <div>

            <h2>
              Business Origin
            </h2>


            <p>
              Customer, enquiry, Proforma and Production
              source of this manufactured product.
            </p>

          </div>

        </div>


        <div className="fp-detail-info-grid">

          {/* ==================================================
              CUSTOMER — ENQUIRY SNAPSHOT
          ================================================== */}

          <div className="fp-detail-info-card">

            <Building2
              size={17}
            />


            <span>
              Customer
            </span>


            <strong>

              {
                customerName
              }

            </strong>


            <small>

              Contact:{" "}

              {
                customerContact
              }

            </small>


            <small>

              Phone:{" "}

              {
                customerPhone
              }

            </small>


            <small>

              GST:{" "}

              {
                customerGST
              }

            </small>

          </div>


          {/* ==================================================
              ENQUIRY
          ================================================== */}

          <div className="fp-detail-info-card">

            <ClipboardList
              size={17}
            />


            <span>
              Enquiry
            </span>


            <strong>

              {
                enquiry
                  .enquiry_number
              }

            </strong>


            <small>

              {
                formatDate(
                  enquiry
                    .enquiry_date
                )
              }

            </small>


            <small>

              {
                enquiry
                  .machine_name
                ??
                productName
              }

            </small>

          </div>


          {/* ==================================================
              PROFORMA
          ================================================== */}

          <div className="fp-detail-info-card">

            <FileText
              size={17}
            />


            <span>
              Proforma
            </span>


            <strong>

              {
                proforma
                  .proforma_number
              }

            </strong>


            <small>

              {
                formatDate(
                  proforma
                    .proforma_date
                )
              }

            </small>


            <small>

              {
                proforma
                  .status
              }

            </small>

          </div>


          {/* ==================================================
              PRODUCTION ORDER
          ================================================== */}

          <div className="fp-detail-info-card">

            <Factory
              size={17}
            />


            <span>
              Production Order
            </span>


            <strong>

              {
                production_order
                  .production_number
              }

            </strong>


            <small>

              {
                productName
              }

            </small>


            <small>

              Qty{" "}

              {
                formatNumber(
                  production_order
                    .quantity
                )
              }

              {" "}

              {
                production_order
                  .unit
              }

            </small>

          </div>


          {/* ==================================================
              FINISHED GOODS RECEIPT
          ================================================== */}

          <div className="fp-detail-info-card">

            <PackageCheck
              size={17}
            />


            <span>
              Finished Goods Receipt
            </span>


            <strong>

              {
                finished_goods_receipt
                  .receipt_number
              }

            </strong>


            <small>

              {
                formatDate(
                  finished_goods_receipt
                    .received_at
                )
              }

            </small>


            <small>

              Qty{" "}

              {
                formatNumber(
                  finished_goods_receipt
                    .quantity_received
                )
              }

              {" "}

              {
                productUnit
              }

            </small>

          </div>

        </div>


        {/* CUSTOMER SNAPSHOT DETAIL */}

        <div
          style={{
            marginTop: "16px",
            padding: "16px",
            border: "1px solid #e7edf5",
            borderRadius: "12px",
            background: "#f9fbfe",
          }}
        >

          <div
            style={{
              marginBottom: "12px",
              color: "#203757",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            Customer Details from Enquiry
          </div>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "12px 24px",
            }}
          >

            <div>

              <div
                style={{
                  color: "#8796ad",
                  fontSize: "9px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                }}
              >
                Company
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#203757",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {customerName}
              </div>

            </div>


            <div>

              <div
                style={{
                  color: "#8796ad",
                  fontSize: "9px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                }}
              >
                GSTIN
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#203757",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {customerGST}
              </div>

            </div>


            <div>

              <div
                style={{
                  color: "#8796ad",
                  fontSize: "9px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                }}
              >
                Contact
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#203757",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {customerContact}
              </div>

            </div>


            <div>

              <div
                style={{
                  color: "#8796ad",
                  fontSize: "9px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                }}
              >
                Phone
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#203757",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {customerPhone}
              </div>

            </div>


            <div>

              <div
                style={{
                  color: "#8796ad",
                  fontSize: "9px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                }}
              >
                Email
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#203757",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {customerEmail}
              </div>

            </div>


            <div>

              <div
                style={{
                  color: "#8796ad",
                  fontSize: "9px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                }}
              >
                Address
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#203757",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
              >
                {customerAddress}
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          MATERIALS
      ====================================================== */}

      <section className="fp-detail-section">

        <div className="fp-detail-section-header">

          <div className="fp-detail-section-icon lavender">

            <Boxes
              size={18}
            />

          </div>


          <div>

            <h2>
              Production Materials
            </h2>


            <p>
              Purchased materials actually issued
              from Store to manufacture this product.
            </p>

          </div>

        </div>


        <div className="fp-detail-table-wrap">

          <table className="fp-detail-table">

            <thead>

              <tr>

                <th>
                  Material
                </th>

                <th>
                  Required
                </th>

                <th>
                  Issued
                </th>

                <th>
                  Unit Cost
                </th>

                <th>
                  Material Cost
                </th>

              </tr>

            </thead>


            <tbody>

              {
                production_materials.length
                === 0
                  ? (
                    <tr>

                      <td
                        colSpan={5}
                        className="fp-detail-empty"
                      >
                        No production materials recorded.
                      </td>

                    </tr>
                  )
                  : (
                    production_materials.map(
                      material => (
                        <tr
                          key={
                            material.id
                          }
                        >

                          <td>

                            <strong>

                              {
                                material
                                  .material_name
                              }

                            </strong>

                          </td>


                          <td>

                            {
                              formatNumber(
                                material
                                  .quantity_required
                              )
                            }

                            {" "}

                            {
                              material.unit
                              ??
                              ""
                            }

                          </td>


                          <td>

                            {
                              formatNumber(
                                material
                                  .quantity_issued
                              )
                            }

                            {" "}

                            {
                              material.unit
                              ??
                              ""
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                material
                                  .unit_cost
                              )
                            }

                          </td>


                          <td>

                            <strong>

                              {
                                formatCurrency(
                                  material
                                    .material_cost
                                )
                              }

                            </strong>

                          </td>

                        </tr>
                      )
                    )
                  )
              }

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          STORE MATERIAL ISSUES
      ====================================================== */}

      <section className="fp-detail-section">

        <div className="fp-detail-section-header">

          <div className="fp-detail-section-icon amber">

            <ShoppingCart
              size={18}
            />

          </div>


          <div>

            <h2>
              Store Material Issues
            </h2>


            <p>
              Actual stock movements used to calculate
              material cost.
            </p>

          </div>

        </div>


        <div className="fp-detail-table-wrap">

          <table className="fp-detail-table">

            <thead>

              <tr>

                <th>
                  Issue
                </th>

                <th>
                  Quantity
                </th>

                <th>
                  Unit Cost
                </th>

                <th>
                  Total Cost
                </th>

                <th>
                  Stock Movement
                </th>

                <th>
                  Date
                </th>

              </tr>

            </thead>


            <tbody>

              {
                shop_floor_issues.length
                === 0
                  ? (
                    <tr>

                      <td
                        colSpan={6}
                        className="fp-detail-empty"
                      >
                        No Store material issues recorded.
                      </td>

                    </tr>
                  )
                  : (
                    shop_floor_issues.map(
                      issue => (
                        <tr
                          key={
                            issue.id
                          }
                        >

                          <td>

                            <strong>
                              {issue.issue_number}
                            </strong>

                          </td>


                          <td>

                            {
                              formatNumber(
                                issue.quantity_issued
                              )
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                issue.unit_cost
                              )
                            }

                          </td>


                          <td>

                            <strong>

                              {
                                formatCurrency(
                                  issue.total_cost
                                )
                              }

                            </strong>

                          </td>


                          <td>

                            {
                              formatNumber(
                                issue.stock_before
                              )
                            }

                            {" → "}

                            {
                              formatNumber(
                                issue.stock_after
                              )
                            }

                          </td>


                          <td>

                            {
                              formatDate(
                                issue.issued_at
                              )
                            }

                          </td>

                        </tr>
                      )
                    )
                  )
              }

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          OPERATIONS
      ====================================================== */}

      <section className="fp-detail-section">

        <div className="fp-detail-section-header">

          <div className="fp-detail-section-icon green">

            <Settings2
              size={18}
            />

          </div>


          <div>

            <h2>
              Production Operations
            </h2>


            <p>
              Manufacturing operations, machine time
              and actual operation cost.
            </p>

          </div>

        </div>


        <div className="fp-detail-table-wrap">

          <table className="fp-detail-table">

            <thead>

              <tr>

                <th>
                  Operation
                </th>

                <th>
                  Machine
                </th>

                <th>
                  Planned Hours
                </th>

                <th>
                  Actual Hours
                </th>

                <th>
                  Hourly Rate
                </th>

                <th>
                  Cost
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {
                production_operations.length
                === 0
                  ? (
                    <tr>

                      <td
                        colSpan={7}
                        className="fp-detail-empty"
                      >
                        No production operations recorded.
                      </td>

                    </tr>
                  )
                  : (
                    production_operations.map(
                      operation => (
                        <tr
                          key={
                            operation.id
                          }
                        >

                          <td>

                            <strong>
                              {
                                operation
                                  .operation_name
                              }
                            </strong>

                          </td>


                          <td>

                            {
                              operation.machine_name
                              ?? "-"
                            }

                          </td>


                          <td>

                            {
                              formatNumber(
                                operation.planned_hours
                              )
                            }

                          </td>


                          <td>

                            {
                              formatNumber(
                                operation.actual_hours
                              )
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                operation.hourly_rate
                              )
                            }

                          </td>


                          <td>

                            <strong>

                              {
                                formatCurrency(
                                  operation.operation_cost
                                )
                              }

                            </strong>

                          </td>


                          <td>

                            <span
                              className={`fp-detail-status ${getStatusClass(
                                operation.status
                              )}`}
                            >

                              {
                                operation.status
                              }

                            </span>

                          </td>

                        </tr>
                      )
                    )
                  )
              }

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          BILLING
      ====================================================== */}

      <section className="fp-detail-section">

        <div className="fp-detail-section-header">

          <div className="fp-detail-section-icon blue">

            <ReceiptText
              size={18}
            />

          </div>


          <div>

            <h2>
              Final Billing Traceability
            </h2>


            <p>
              Original invoice, revisions and
              Credit Note history.
            </p>

          </div>

        </div>


        {
          billing.effective_invoice
            ? (
              <div className="fp-detail-effective-invoice">

                <div>

                  <span>
                    Effective Invoice
                  </span>


                  <strong>

                    {
                      billing
                        .effective_invoice
                        .invoice_number
                    }

                  </strong>


                  <small>

                    {
                      billing
                        .effective_invoice
                        .invoice_type
                    }

                    {" • "}

                    {
                      billing
                        .effective_invoice
                        .status
                    }

                  </small>

                </div>


                <div>

                  <span>
                    Taxable Value
                  </span>


                  <strong>

                    {
                      formatCurrency(
                        billing
                          .effective_invoice
                          .taxable_amount
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    GST
                  </span>


                  <strong>

                    {
                      formatCurrency(
                        billing
                          .effective_invoice
                          .tax_amount
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Invoice Total
                  </span>


                  <strong>

                    {
                      formatCurrency(
                        billing
                          .effective_invoice
                          .grand_total
                      )
                    }

                  </strong>

                </div>

              </div>
            )
            : (
              <div className="fp-detail-empty-card">
                This Finished Product has not yet
                been linked to an Issued invoice.
              </div>
            )
        }


        <h3 className="fp-detail-subheading">
          Invoice History
        </h3>


        <div className="fp-detail-table-wrap">

          <table className="fp-detail-table">

            <thead>

              <tr>

                <th>
                  Invoice
                </th>

                <th>
                  Type
                </th>

                <th>
                  Revision
                </th>

                <th>
                  Date
                </th>

                <th>
                  Taxable
                </th>

                <th>
                  GST
                </th>

                <th>
                  Total
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {
                [
                  ...(
                    billing.original_invoice
                      ? [
                          billing.original_invoice,
                        ]
                      : []
                  ),

                  ...billing.revisions,
                ].length === 0
                  ? (
                    <tr>

                      <td
                        colSpan={8}
                        className="fp-detail-empty"
                      >
                        No invoice created yet.
                      </td>

                    </tr>
                  )
                  : (
                    [
                      ...(
                        billing.original_invoice
                          ? [
                              billing.original_invoice,
                            ]
                          : []
                      ),

                      ...billing.revisions,
                    ].map(
                      invoice => (
                        <tr
                          key={
                            invoice.id
                          }
                        >

                          <td>

                            <strong>

                              {
                                invoice
                                  .invoice_number
                              }

                            </strong>

                          </td>


                          <td>

                            {
                              invoice
                                .invoice_type
                            }

                          </td>


                          <td>

                            {
                              invoice
                                .revision_number
                            }

                          </td>


                          <td>

                            {
                              formatDate(
                                invoice
                                  .invoice_date
                              )
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                invoice
                                  .taxable_amount
                              )
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                invoice
                                  .tax_amount
                              )
                            }

                          </td>


                          <td>

                            <strong>

                              {
                                formatCurrency(
                                  invoice
                                    .grand_total
                                )
                              }

                            </strong>

                          </td>


                          <td>

                            <span
                              className={`fp-detail-status ${getStatusClass(
                                invoice.status
                              )}`}
                            >

                              {
                                invoice.status
                              }

                            </span>

                          </td>

                        </tr>
                      )
                    )
                  )
              }

            </tbody>

          </table>

        </div>


        <h3 className="fp-detail-subheading">
          Credit Notes
        </h3>


        <div className="fp-detail-table-wrap">

          <table className="fp-detail-table">

            <thead>

              <tr>

                <th>
                  Credit Note
                </th>

                <th>
                  Date
                </th>

                <th>
                  Taxable
                </th>

                <th>
                  GST
                </th>

                <th>
                  Total
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {
                billing.credit_notes.length
                === 0
                  ? (
                    <tr>

                      <td
                        colSpan={6}
                        className="fp-detail-empty"
                      >
                        No Credit Notes recorded.
                      </td>

                    </tr>
                  )
                  : (
                    billing.credit_notes.map(
                      creditNote => (
                        <tr
                          key={
                            creditNote.id
                          }
                        >

                          <td>

                            <strong>

                              {
                                creditNote
                                  .invoice_number
                              }

                            </strong>

                          </td>


                          <td>

                            {
                              formatDate(
                                creditNote.invoice_date
                              )
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                creditNote.taxable_amount
                              )
                            }

                          </td>


                          <td>

                            {
                              formatCurrency(
                                creditNote.tax_amount
                              )
                            }

                          </td>


                          <td>

                            <strong>

                              {
                                formatCurrency(
                                  creditNote.grand_total
                                )
                              }

                            </strong>

                          </td>


                          <td>

                            <span
                              className={`fp-detail-status ${getStatusClass(
                                creditNote.status
                              )}`}
                            >

                              {
                                creditNote.status
                              }

                            </span>

                          </td>

                        </tr>
                      )
                    )
                  )
              }

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}