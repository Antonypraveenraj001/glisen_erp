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
    value: string | null | undefined
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
      status === "issued" ||
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
  
  
  export default function FinishedProductDetailPage() {
    const {
      id,
    } = useParams();
  
    const navigate =
      useNavigate();
  
    const [
      traceability,
      setTraceability,
    ] =
      useState<
        FinishedProductTraceability | null
      >(null);
  
    const [
      loading,
      setLoading,
    ] =
      useState(true);
  
    const [
      error,
      setError,
    ] =
      useState<string | null>(
        null
      );
  
  
    useEffect(
      () => {
        async function load() {
          const finishedProductId =
            Number(id);
  
          if (
            !Number.isInteger(
              finishedProductId
            ) ||
            finishedProductId <= 0
          ) {
            setError(
              "Invalid Finished Product ID."
            );
  
            setLoading(false);
  
            return;
          }
  
          try {
            setLoading(true);
            setError(null);
  
            const data =
              await getFinishedProductTraceability(
                finishedProductId
              );
  
            setTraceability(
              data
            );
          } catch (err) {
            console.error(err);
  
            setError(
              "Unable to load Finished Product traceability."
            );
          } finally {
            setLoading(false);
          }
        }
  
        void load();
      },
      [id]
    );
  
  
    if (loading) {
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
  
  
    if (
      error ||
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
            <ArrowLeft size={16} />
  
            Finished Products
          </button>
  
          <div className="fp-detail-error">
            {
              error ??
              "Finished Product not found."
            }
          </div>
  
        </div>
      );
    }
  
  
    const {
      finished_product,
      product_master,
      customer,
      enquiry,
      proforma,
      production_order,
      production_materials,
      shop_floor_issues,
      production_operations,
      finished_goods_receipt,
      cost_summary,
      billing,
    } = traceability;
  
  
    return (
      <div className="fp-detail-page">
  
        {/* =====================================================
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
          <ArrowLeft size={16} />
  
          Finished Products
        </button>
  
  
        {/* =====================================================
            HEADER
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
                product_master
                  .product_name
              }
            </div>
  
            <div className="fp-detail-product-meta">
              {
                product_master
                  .product_code
              }
              {" • "}
              {
                product_master
                  .category
              }
              {" • HSN "}
              {
                product_master
                  .hsn_code
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
                {formatNumber(
                  cost_summary
                    .finished_quantity
                )}
                {" "}
                {
                  product_master
                    .unit
                }
              </strong>
            </div>
  
          </div>
  
        </section>
  
  
        {/* =====================================================
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
                {formatCurrency(
                  cost_summary
                    .actual_material_cost
                )}
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
                {formatCurrency(
                  cost_summary
                    .actual_operation_cost
                )}
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
                {formatCurrency(
                  cost_summary
                    .actual_production_cost
                )}
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
                {formatCurrency(
                  cost_summary
                    .cost_per_unit
                )}
              </strong>
            </div>
  
          </div>
  
        </section>
  
  
        {/* =====================================================
            BUSINESS TRACE
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
                Customer, enquiry and commercial
                origin of the manufactured product.
              </p>
            </div>
  
          </div>
  
  
          <div className="fp-detail-info-grid">
  
            <div className="fp-detail-info-card">
  
              <Building2 size={17} />
  
              <span>
                Customer
              </span>
  
              <strong>
                {
                  customer
                    .company_name
                }
              </strong>
  
              <small>
                {
                  customer
                    .customer_code
                }
              </small>
  
              <small>
                GST:{" "}
                {
                  customer
                    .gst_number ??
                  "-"
                }
              </small>
  
            </div>
  
  
            <div className="fp-detail-info-card">
  
              <ClipboardList size={17} />
  
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
                    .machine_name ??
                  "-"
                }
              </small>
  
            </div>
  
  
            <div className="fp-detail-info-card">
  
              <FileText size={17} />
  
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
  
  
            <div className="fp-detail-info-card">
  
              <Factory size={17} />
  
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
                Qty{" "}
                {
                  production_order
                    .quantity
                }
              </small>
  
              <small>
                {
                  production_order
                    .status
                }
              </small>
  
            </div>
  
  
            <div className="fp-detail-info-card">
  
              <PackageCheck size={17} />
  
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
              </small>
  
            </div>
  
          </div>
  
        </section>
  
  
        {/* =====================================================
            MATERIALS
        ====================================================== */}
  
        <section className="fp-detail-section">
  
          <div className="fp-detail-section-header">
  
            <div className="fp-detail-section-icon lavender">
              <Boxes size={18} />
            </div>
  
            <div>
              <h2>
                Production Materials
              </h2>
  
              <p>
                Materials and components configured
                against this Production Order.
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
  
                {production_materials.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="fp-detail-empty"
                    >
                      No production materials recorded.
                    </td>
                  </tr>
                ) : (
                  production_materials.map(
                    (material) => (
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
  
                          <small>
                            Product ID{" "}
                            {
                              material
                                .product_id ??
                              "-"
                            }
                          </small>
                        </td>
  
                        <td>
                          {formatNumber(
                            material
                              .quantity_required
                          )}
                          {" "}
                          {
                            material.unit ??
                            ""
                          }
                        </td>
  
                        <td>
                          {formatNumber(
                            material
                              .quantity_issued
                          )}
                          {" "}
                          {
                            material.unit ??
                            ""
                          }
                        </td>
  
                        <td>
                          {formatCurrency(
                            material
                              .unit_cost
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            material
                              .material_cost
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
  
              </tbody>
  
            </table>
  
          </div>
  
        </section>
  
  
        {/* =====================================================
            SHOP FLOOR ISSUES
        ====================================================== */}
  
        <section className="fp-detail-section">
  
          <div className="fp-detail-section-header">
  
            <div className="fp-detail-section-icon amber">
              <ShoppingCart size={18} />
            </div>
  
            <div>
              <h2>
                Shop Floor Material Issues
              </h2>
  
              <p>
                Actual inventory issues used to calculate
                this Finished Product's material cost.
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
  
                {shop_floor_issues.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="fp-detail-empty"
                    >
                      No shop-floor issues recorded.
                    </td>
                  </tr>
                ) : (
                  shop_floor_issues.map(
                    (issue) => (
                      <tr
                        key={
                          issue.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              issue
                                .issue_number
                            }
                          </strong>
  
                          <small>
                            Material #
                            {
                              issue
                                .production_material_id
                            }
                          </small>
                        </td>
  
                        <td>
                          {formatNumber(
                            issue
                              .quantity_issued
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            issue
                              .unit_cost
                          )}
                        </td>
  
                        <td>
                          <strong>
                            {formatCurrency(
                              issue
                                .total_cost
                            )}
                          </strong>
                        </td>
  
                        <td>
                          {formatNumber(
                            issue
                              .stock_before
                          )}
                          {" → "}
                          {formatNumber(
                            issue
                              .stock_after
                          )}
                        </td>
  
                        <td>
                          {formatDate(
                            issue
                              .issued_at
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
  
              </tbody>
  
            </table>
  
          </div>
  
        </section>
  
  
        {/* =====================================================
            OPERATIONS
        ====================================================== */}
  
        <section className="fp-detail-section">
  
          <div className="fp-detail-section-header">
  
            <div className="fp-detail-section-icon green">
              <Settings2 size={18} />
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
  
                {production_operations.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="fp-detail-empty"
                    >
                      No production operations recorded.
                    </td>
                  </tr>
                ) : (
                  production_operations.map(
                    (operation) => (
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
                            operation
                              .machine_name ??
                            "-"
                          }
                        </td>
  
                        <td>
                          {formatNumber(
                            operation
                              .planned_hours
                          )}
                        </td>
  
                        <td>
                          {formatNumber(
                            operation
                              .actual_hours
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            operation
                              .hourly_rate
                          )}
                        </td>
  
                        <td>
                          <strong>
                            {formatCurrency(
                              operation
                                .operation_cost
                            )}
                          </strong>
                        </td>
  
                        <td>
                          <span
                            className={`fp-detail-status ${
                              getStatusClass(
                                operation
                                  .status
                              )
                            }`}
                          >
                            {
                              operation
                                .status
                            }
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
  
              </tbody>
  
            </table>
  
          </div>
  
        </section>
  
  
        {/* =====================================================
            BILLING
        ====================================================== */}
  
        <section className="fp-detail-section">
  
          <div className="fp-detail-section-header">
  
            <div className="fp-detail-section-icon blue">
              <ReceiptText size={18} />
            </div>
  
            <div>
              <h2>
                Final Billing Traceability
              </h2>
  
              <p>
                Original invoice, current effective
                revision and Credit Note history.
              </p>
            </div>
  
          </div>
  
  
          {billing.effective_invoice ? (
  
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
                  {formatCurrency(
                    billing
                      .effective_invoice
                      .taxable_amount
                  )}
                </strong>
              </div>
  
  
              <div>
                <span>
                  GST
                </span>
  
                <strong>
                  {formatCurrency(
                    billing
                      .effective_invoice
                      .tax_amount
                  )}
                </strong>
              </div>
  
  
              <div>
                <span>
                  Invoice Total
                </span>
  
                <strong>
                  {formatCurrency(
                    billing
                      .effective_invoice
                      .grand_total
                  )}
                </strong>
              </div>
  
            </div>
  
          ) : (
            <div className="fp-detail-empty-card">
              This Finished Product has not yet
              been linked to an Issued invoice.
            </div>
          )}
  
  
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
  
                {[
                  ...(billing
                    .original_invoice
                    ? [
                        billing
                          .original_invoice,
                      ]
                    : []),
  
                  ...billing.revisions,
                ].map(
                  (invoice) => (
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
                        {formatDate(
                          invoice
                            .invoice_date
                        )}
                      </td>
  
                      <td>
                        {formatCurrency(
                          invoice
                            .taxable_amount
                        )}
                      </td>
  
                      <td>
                        {formatCurrency(
                          invoice
                            .tax_amount
                        )}
                      </td>
  
                      <td>
                        <strong>
                          {formatCurrency(
                            invoice
                              .grand_total
                          )}
                        </strong>
                      </td>
  
                      <td>
                        <span
                          className={`fp-detail-status ${
                            getStatusClass(
                              invoice
                                .status
                            )
                          }`}
                        >
                          {
                            invoice
                              .status
                          }
                        </span>
                      </td>
                    </tr>
                  )
                )}
  
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
                    Parent Invoice
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
  
                {billing.credit_notes.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="fp-detail-empty"
                    >
                      No Credit Notes recorded.
                    </td>
                  </tr>
                ) : (
                  billing.credit_notes.map(
                    (creditNote) => (
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
                          #
                          {
                            creditNote
                              .parent_invoice_id ??
                            "-"
                          }
                        </td>
  
                        <td>
                          {formatDate(
                            creditNote
                              .invoice_date
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            creditNote
                              .taxable_amount
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            creditNote
                              .tax_amount
                          )}
                        </td>
  
                        <td>
                          <strong>
                            {formatCurrency(
                              creditNote
                                .grand_total
                            )}
                          </strong>
                        </td>
  
                        <td>
                          <span
                            className={`fp-detail-status ${
                              getStatusClass(
                                creditNote
                                  .status
                              )
                            }`}
                          >
                            {
                              creditNote
                                .status
                            }
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
  
              </tbody>
  
            </table>
  
          </div>
  
        </section>
  
      </div>
    );
  }