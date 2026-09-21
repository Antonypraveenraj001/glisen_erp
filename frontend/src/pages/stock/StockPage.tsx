import axios from "axios";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  Factory,
  Filter,
  History,
  Loader2,
  PackageSearch,
  Send,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import "./StockPage.css";

import {
  getStockMovements,
  getStockSummary,
  issueStockToProductionOrder,
} from "../../services/stockService";

import {
  getProductionOrders,
} from "../../services/productionService";

import type {
  StockMovementResponse,
  StockSummaryItem,
  StockSummaryResponse,
} from "../../types/stock";

import type {
  ProductionOrder,
} from "../../types/production";


const EMPTY_SUMMARY: StockSummaryResponse = {
  total_products: 0,
  total_stock_quantity: "0",
  total_stock_value: "0",
  low_stock_products: 0,
  out_of_stock_products: 0,
  items: [],
};


const EMPTY_MOVEMENTS: StockMovementResponse = {
  total_movements: 0,
  total_quantity_in: "0",
  total_quantity_out: "0",
  total_in_value: "0",
  total_out_value: "0",
  items: [],
};


function formatNumber(
  value: string | number | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

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


function formatDateTime(
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

  return date.toLocaleString(
    "en-IN"
  );
}


function getStockStatusClass(
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
    "in-stock"
  ) {
    return "in-stock";
  }

  if (
    normalized ===
    "low-stock"
  ) {
    return "low-stock";
  }

  if (
    normalized ===
    "out-of-stock"
  ) {
    return "out-of-stock";
  }

  if (
    normalized ===
    "over-stock"
  ) {
    return "over-stock";
  }

  return "default";
}


function getMovementClass(
  movementType: string
) {
  const normalized =
    movementType.toLowerCase();

  if (
    normalized.includes(
      "purchase"
    )
  ) {
    return "purchase";
  }

  if (
    normalized.includes(
      "finished"
    )
  ) {
    return "finished";
  }

  if (
    normalized.includes(
      "shop"
    )
  ) {
    return "issue";
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


const modalBackdropStyle:
React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px",
  background:
    "rgba(26, 47, 79, 0.58)",
  backdropFilter:
    "blur(3px)",
};


const modalStyle:
React.CSSProperties = {
  width: "min(1100px, 94vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  borderRadius: "18px",
  background: "#ffffff",
  border:
    "1px solid #dce6f2",
  boxShadow:
    "0 24px 70px rgba(20, 45, 80, 0.22)",
};


const modalHeaderStyle:
React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  padding: "22px 24px",
  borderBottom:
    "1px solid #e8eef7",
};


const modalCloseStyle:
React.CSSProperties = {
  width: "38px",
  height: "38px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "0",
  borderRadius: "10px",
  background: "#f3f6fb",
  color: "#617695",
  cursor: "pointer",
};


const quantityInputStyle:
React.CSSProperties = {
  width: "95px",
  minHeight: "36px",
  padding: "0 9px",
  border:
    "1px solid #d9e3f0",
  borderRadius: "9px",
  outline: "none",
  fontSize: "11px",
};


export default function StockPage() {
  const [
    summary,
    setSummary,
  ] =
    useState<StockSummaryResponse>(
      EMPTY_SUMMARY
    );

  const [
    movements,
    setMovements,
  ] =
    useState<StockMovementResponse>(
      EMPTY_MOVEMENTS
    );

  const [
    summarySearch,
    setSummarySearch,
  ] =
    useState("");

  const [
    stockStatus,
    setStockStatus,
  ] =
    useState("");

  const [
    movementType,
    setMovementType,
  ] =
    useState("");

  const [
    movementProductId,
    setMovementProductId,
  ] =
    useState("");

  const [
    movementStartDate,
    setMovementStartDate,
  ] =
    useState("");

  const [
    movementEndDate,
    setMovementEndDate,
  ] =
    useState("");

  const [
    summaryLoading,
    setSummaryLoading,
  ] =
    useState(true);

  const [
    movementLoading,
    setMovementLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );


  /* =========================================================
     MATERIAL ISSUE STATES
  ========================================================= */

  const [
    issueQuantities,
    setIssueQuantities,
  ] =
    useState<
      Record<number, string>
    >({});

  const [
    selectedMaterial,
    setSelectedMaterial,
  ] =
    useState<
      StockSummaryItem |
      null
    >(
      null
    );

  const [
    selectedIssueQuantity,
    setSelectedIssueQuantity,
  ] =
    useState(0);

  const [
    issueModalOpen,
    setIssueModalOpen,
  ] =
    useState(false);

  const [
    productionOrders,
    setProductionOrders,
  ] =
    useState<
      ProductionOrder[]
    >([]);

  const [
    productionLoading,
    setProductionLoading,
  ] =
    useState(false);

  const [
    selectedProductionOrderId,
    setSelectedProductionOrderId,
  ] =
    useState<
      number |
      null
    >(
      null
    );

  const [
    issueRemarks,
    setIssueRemarks,
  ] =
    useState("");

  const [
    issuingMaterial,
    setIssuingMaterial,
  ] =
    useState(false);

  const [
    issueError,
    setIssueError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* =========================================================
     LOAD STOCK SUMMARY
  ========================================================= */

  async function loadSummary(
    search = summarySearch,
    status = stockStatus
  ) {
    try {
      setSummaryLoading(
        true
      );

      setError(
        null
      );

      const data =
        await getStockSummary({
          search:
            search ||
            undefined,

          stock_status:
            status ||
            undefined,
        });

      setSummary(
        data
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Unable to load stock summary."
        )
      );
    } finally {
      setSummaryLoading(
        false
      );
    }
  }


  /* =========================================================
     LOAD STOCK MOVEMENTS
  ========================================================= */

  async function loadMovements() {
    try {
      setMovementLoading(
        true
      );

      setError(
        null
      );

      const productId =
        movementProductId
          ? Number(
              movementProductId
            )
          : undefined;

      const data =
        await getStockMovements({
          product_id:
            productId &&
            !Number.isNaN(
              productId
            )
              ? productId
              : undefined,

          movement_type:
            movementType ||
            undefined,

          start_date:
            movementStartDate ||
            undefined,

          end_date:
            movementEndDate ||
            undefined,
        });

      setMovements(
        data
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Unable to load stock movements."
        )
      );
    } finally {
      setMovementLoading(
        false
      );
    }
  }


  useEffect(
    () => {
      void loadSummary(
        "",
        ""
      );

      void loadMovements();

      // Initial load only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  /* =========================================================
     SUMMARY FILTER
  ========================================================= */

  async function handleSummarySearch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    await loadSummary();
  }


  async function handleClearSummary() {
    setSummarySearch(
      ""
    );

    setStockStatus(
      ""
    );

    await loadSummary(
      "",
      ""
    );
  }


  /* =========================================================
     MOVEMENT FILTER
  ========================================================= */

  async function handleMovementFilter(
    event: React.FormEvent
  ) {
    event.preventDefault();

    await loadMovements();
  }


  async function handleClearMovement() {
    setMovementType(
      ""
    );

    setMovementProductId(
      ""
    );

    setMovementStartDate(
      ""
    );

    setMovementEndDate(
      ""
    );

    try {
      setMovementLoading(
        true
      );

      setError(
        null
      );

      const data =
        await getStockMovements();

      setMovements(
        data
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Unable to load stock movements."
        )
      );
    } finally {
      setMovementLoading(
        false
      );
    }
  }


  /* =========================================================
     ACTIVE PRODUCTION ORDERS
  ========================================================= */

  const activeProductionOrders =
    useMemo(
      () =>
        productionOrders.filter(
          (
            order
          ) =>
            order.status
              .trim()
              .toLowerCase() ===
            "in progress"
        ),
      [
        productionOrders,
      ]
    );


  /* =========================================================
     OPEN ISSUE MATERIAL POPUP
  ========================================================= */

  async function openIssueMaterial(
    item: StockSummaryItem
  ) {
    setSuccess(
      null
    );

    setIssueError(
      null
    );

    const quantity =
      Number(
        issueQuantities[
          item.product_id
        ]
      );

    const available =
      Number(
        item.current_stock
      );


    if (
      Number.isNaN(
        quantity
      ) ||
      quantity <= 0
    ) {
      setError(
        `Enter the quantity to issue for ${item.product_name}.`
      );

      return;
    }


    if (
      quantity >
      available
    ) {
      setError(
        `Issue quantity cannot exceed available stock of ${formatNumber(
          available
        )} ${item.unit}.`
      );

      return;
    }


    setError(
      null
    );

    setSelectedMaterial(
      item
    );

    setSelectedIssueQuantity(
      quantity
    );

    setSelectedProductionOrderId(
      null
    );

    setIssueRemarks(
      ""
    );

    setIssueModalOpen(
      true
    );


    try {
      setProductionLoading(
        true
      );

      const data =
        await getProductionOrders();

      setProductionOrders(
        data
      );
    } catch (err) {
      console.error(
        err
      );

      setIssueError(
        getApiErrorMessage(
          err,
          "Unable to load active Production Orders."
        )
      );
    } finally {
      setProductionLoading(
        false
      );
    }
  }


  function closeIssueModal() {
    if (
      issuingMaterial
    ) {
      return;
    }

    setIssueModalOpen(
      false
    );

    setSelectedMaterial(
      null
    );

    setSelectedProductionOrderId(
      null
    );

    setIssueRemarks(
      ""
    );

    setIssueError(
      null
    );
  }


  /* =========================================================
     FINAL ISSUE
  ========================================================= */

  async function handleIssueMaterial() {
    if (
      !selectedMaterial
    ) {
      return;
    }


    if (
      selectedProductionOrderId ===
      null
    ) {
      setIssueError(
        "Select a Production Order first."
      );

      return;
    }


    try {
      setIssuingMaterial(
        true
      );

      setIssueError(
        null
      );

      const result =
        await issueStockToProductionOrder(
          selectedProductionOrderId,
          {
            product_id:
              selectedMaterial
                .product_id,

            quantity:
              selectedIssueQuantity,

            remarks:
              issueRemarks
                .trim() ||
              null,
          }
        );


      setIssueModalOpen(
        false
      );

      setSelectedProductionOrderId(
        null
      );


      setIssueQuantities(
        (
          current
        ) => ({
          ...current,

          [selectedMaterial.product_id]:
            "",
        })
      );


      setSuccess(
        `${formatNumber(
          result.quantity_issued
        )} ${selectedMaterial.unit} of ${selectedMaterial.product_name} issued successfully to Production Order #${result.production_order_id}. Stock: ${formatNumber(
          result.stock_before
        )} → ${formatNumber(
          result.stock_after
        )}.`
      );


      setSelectedMaterial(
        null
      );


      await Promise.all(
        [
          loadSummary(),
          loadMovements(),
        ]
      );
    } catch (err) {
      console.error(
        err
      );

      setIssueError(
        getApiErrorMessage(
          err,
          "Unable to issue material."
        )
      );
    } finally {
      setIssuingMaterial(
        false
      );
    }
  }


  return (
    <div className="stock-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="stock-page-header">

        <div>

          <div className="stock-eyebrow">
            INVENTORY CONTROL
          </div>

          <h1 className="stock-title">
            Stock Management
          </h1>

          <p className="stock-subtitle">
            Monitor purchased inventory,
            issue Store materials directly
            to active Production Orders,
            and maintain stock movement
            history.
          </p>

        </div>

      </div>


      {error && (
        <div className="stock-error">
          {error}
        </div>
      )}


      {success && (
        <div
          style={{
            padding:
              "12px 14px",
            border:
              "1px solid #bfe7cf",
            borderRadius:
              "10px",
            background:
              "#effaf4",
            color:
              "#18794e",
            fontSize:
              "12px",
          }}
        >
          <CheckCircle2
            size={15}
            style={{
              verticalAlign:
                "middle",
              marginRight:
                "7px",
            }}
          />

          {success}
        </div>
      )}


      {/* =====================================================
          KPI
      ===================================================== */}

      <div className="stock-kpi-grid">

        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Total Products
            </div>

            <div className="stock-kpi-value">
              {
                summary
                  .total_products
              }
            </div>

          </div>

          <div className="stock-kpi-icon blue">
            <Boxes
              size={20}
            />
          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Stock Quantity
            </div>

            <div className="stock-kpi-value">
              {formatNumber(
                summary
                  .total_stock_quantity
              )}
            </div>

          </div>

          <div className="stock-kpi-icon lavender">
            <PackageSearch
              size={20}
            />
          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Stock Value
            </div>

            <div className="stock-kpi-value">
              {formatCurrency(
                summary
                  .total_stock_value
              )}
            </div>

          </div>

          <div className="stock-kpi-icon green">
            <ArrowDownToLine
              size={20}
            />
          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Low Stock
            </div>

            <div className="stock-kpi-value">
              {
                summary
                  .low_stock_products
              }
            </div>

          </div>

          <div className="stock-kpi-icon amber">
            <TriangleAlert
              size={20}
            />
          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Out of Stock
            </div>

            <div className="stock-kpi-value">
              {
                summary
                  .out_of_stock_products
              }
            </div>

          </div>

          <div className="stock-kpi-icon rose">
            <ArrowUpFromLine
              size={20}
            />
          </div>

        </div>

      </div>


      {/* =====================================================
          STOCK SUMMARY
      ===================================================== */}

      <div className="stock-section">

        <div className="stock-section-header">

          <div>

            <div className="stock-section-title">
              Stock Summary
            </div>

            <div className="stock-section-subtitle">
              Select a material,
              enter the quantity,
              then issue it directly
              to an active Production Order.
            </div>

          </div>

        </div>


        <form
          className="stock-filter-bar"
          onSubmit={
            handleSummarySearch
          }
        >

          <div className="stock-search-field">

            <Search
              size={16}
            />

            <input
              type="text"
              value={
                summarySearch
              }
              onChange={(
                event
              ) =>
                setSummarySearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search product code, name, category or HSN..."
            />

          </div>


          <select
            className="stock-select"
            value={
              stockStatus
            }
            onChange={(
              event
            ) =>
              setStockStatus(
                event
                  .target
                  .value
              )
            }
          >

            <option value="">
              All Stock Status
            </option>

            <option value="In Stock">
              In Stock
            </option>

            <option value="Low Stock">
              Low Stock
            </option>

            <option value="Out of Stock">
              Out of Stock
            </option>

            <option value="Over Stock">
              Over Stock
            </option>

          </select>


          <button
            type="submit"
            className="stock-primary-button"
          >
            <Filter
              size={15}
            />

            Apply
          </button>


          <button
            type="button"
            className="stock-secondary-button"
            onClick={
              handleClearSummary
            }
          >
            Clear
          </button>

        </form>


        {summaryLoading ? (
          <div className="stock-loading-state">

            <Loader2
              size={22}
              className="stock-spin"
            />

            Loading stock summary...

          </div>
        ) : summary.items.length ===
          0 ? (
          <div className="stock-empty-state">

            <Boxes
              size={25}
            />

            No stock records found.

          </div>
        ) : (
          <div className="stock-table-wrap">

            <table className="stock-table">

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Unit
                  </th>

                  <th>
                    Current
                  </th>

                  <th>
                    Minimum
                  </th>

                  <th>
                    Maximum
                  </th>

                  <th>
                    Purchase Price
                  </th>

                  <th>
                    Stock Value
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Qty to Issue
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {summary.items.map(
                  (
                    item
                  ) => {
                    const available =
                      Number(
                        item.current_stock
                      );

                    const outOfStock =
                      available <= 0;

                    return (
                      <tr
                        key={
                          item.product_id
                        }
                      >

                        <td>

                          <div className="stock-product-name">
                            {
                              item
                                .product_name
                            }
                          </div>

                          <div className="stock-product-code">
                            {
                              item
                                .product_code
                            }
                          </div>

                        </td>


                        <td>
                          {
                            item.category ||
                            "-"
                          }
                        </td>


                        <td>
                          {
                            item.unit
                          }
                        </td>


                        <td>

                          <strong>
                            {formatNumber(
                              item
                                .current_stock
                            )}
                          </strong>

                        </td>


                        <td>
                          {formatNumber(
                            item
                              .minimum_stock
                          )}
                        </td>


                        <td>
                          {formatNumber(
                            item
                              .maximum_stock
                          )}
                        </td>


                        <td>
                          {formatCurrency(
                            item
                              .purchase_price
                          )}
                        </td>


                        <td>

                          <strong>
                            {formatCurrency(
                              item
                                .stock_value
                            )}
                          </strong>

                        </td>


                        <td>

                          <span
                            className={`stock-status ${getStockStatusClass(
                              item
                                .stock_status
                            )}`}
                          >
                            {
                              item
                                .stock_status
                            }
                          </span>

                        </td>


                        <td>

                          <input
                            type="number"
                            min="0"
                            max={
                              item.current_stock
                            }
                            step="0.01"
                            disabled={
                              outOfStock
                            }
                            value={
                              issueQuantities[
                                item.product_id
                              ] ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              setIssueQuantities(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [item.product_id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Qty"
                            style={
                              quantityInputStyle
                            }
                          />

                        </td>


                        <td>

                          <button
                            type="button"
                            className="stock-primary-button"
                            disabled={
                              outOfStock
                            }
                            onClick={() =>
                              void openIssueMaterial(
                                item
                              )
                            }
                            style={{
                              minHeight:
                                "36px",
                              opacity:
                                outOfStock
                                  ? 0.45
                                  : 1,
                              cursor:
                                outOfStock
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            <Send
                              size={14}
                            />

                            Issue Material
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


      {/* =====================================================
          STOCK MOVEMENTS
      ===================================================== */}

      <div className="stock-section">

        <div className="stock-section-header">

          <div>

            <div className="stock-section-title">
              Stock Movement History
            </div>

            <div className="stock-section-subtitle">
              Purchase receipts,
              production issues,
              and other inventory movements.
            </div>

          </div>


          <div className="stock-section-badge">

            <History
              size={13}
            />

            {
              movements
                .total_movements
            }
            {" "}
            movements

          </div>

        </div>


        <form
          className="stock-movement-filter-grid"
          onSubmit={
            handleMovementFilter
          }
        >

          <label className="stock-field">

            <span>
              Product ID
            </span>

            <input
              type="number"
              min="1"
              value={
                movementProductId
              }
              onChange={(
                event
              ) =>
                setMovementProductId(
                  event
                    .target
                    .value
                )
              }
              placeholder="e.g. 1"
            />

          </label>


          <label className="stock-field">

            <span>
              Movement Type
            </span>

            <select
              value={
                movementType
              }
              onChange={(
                event
              ) =>
                setMovementType(
                  event
                    .target
                    .value
                )
              }
            >

              <option value="">
                All Types
              </option>

              <option value="Purchase">
                Purchase
              </option>

              <option value="Shop Floor Issue">
                Shop Floor Issue
              </option>

              <option value="Finished Goods Receipt">
                Finished Goods Receipt
              </option>

            </select>

          </label>


          <label className="stock-field">

            <span>
              Start Date
            </span>

            <input
              type="datetime-local"
              value={
                movementStartDate
              }
              onChange={(
                event
              ) =>
                setMovementStartDate(
                  event
                    .target
                    .value
                )
              }
            />

          </label>


          <label className="stock-field">

            <span>
              End Date
            </span>

            <input
              type="datetime-local"
              value={
                movementEndDate
              }
              onChange={(
                event
              ) =>
                setMovementEndDate(
                  event
                    .target
                    .value
                )
              }
            />

          </label>


          <div className="stock-movement-actions">

            <button
              type="submit"
              className="stock-primary-button"
            >
              <Filter
                size={15}
              />

              Apply
            </button>


            <button
              type="button"
              className="stock-secondary-button"
              onClick={
                handleClearMovement
              }
            >
              Clear
            </button>

          </div>

        </form>


        <div className="stock-movement-kpis">

          <div>

            <span>
              Quantity In
            </span>

            <strong>
              {formatNumber(
                movements
                  .total_quantity_in
              )}
            </strong>

          </div>


          <div>

            <span>
              Quantity Out
            </span>

            <strong>
              {formatNumber(
                movements
                  .total_quantity_out
              )}
            </strong>

          </div>


          <div>

            <span>
              In Value
            </span>

            <strong>
              {formatCurrency(
                movements
                  .total_in_value
              )}
            </strong>

          </div>


          <div>

            <span>
              Out Value
            </span>

            <strong>
              {formatCurrency(
                movements
                  .total_out_value
              )}
            </strong>

          </div>

        </div>


        {movementLoading ? (
          <div className="stock-loading-state">

            <Loader2
              size={22}
              className="stock-spin"
            />

            Loading stock movements...

          </div>
        ) : movements.items.length ===
          0 ? (
          <div className="stock-empty-state">

            <History
              size={25}
            />

            No stock movements found.

          </div>
        ) : (
          <div className="stock-table-wrap">

            <table className="stock-table stock-movement-table">

              <thead>

                <tr>

                  <th>
                    Date
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Reference
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    Qty In
                  </th>

                  <th>
                    Qty Out
                  </th>

                  <th>
                    Before
                  </th>

                  <th>
                    After
                  </th>

                  <th>
                    Unit Cost
                  </th>

                  <th>
                    Value
                  </th>

                  <th>
                    Remarks
                  </th>

                </tr>

              </thead>


              <tbody>

                {movements.items.map(
                  (
                    item,
                    index
                  ) => (
                    <tr
                      key={`${item.reference_id}-${item.product_id}-${item.movement_date}-${index}`}
                    >

                      <td>
                        {formatDateTime(
                          item
                            .movement_date
                        )}
                      </td>


                      <td>

                        <span
                          className={`stock-movement-type ${getMovementClass(
                            item
                              .movement_type
                          )}`}
                        >
                          {
                            item
                              .movement_type
                          }
                        </span>

                      </td>


                      <td>

                        <div className="stock-reference">
                          {
                            item
                              .reference_number
                          }
                        </div>

                      </td>


                      <td>

                        <div className="stock-product-name">
                          {
                            item
                              .product_name
                          }
                        </div>

                        <div className="stock-product-code">
                          {
                            item
                              .product_code
                          }
                        </div>

                      </td>


                      <td className="stock-qty-in">
                        {formatNumber(
                          item
                            .quantity_in
                        )}
                      </td>


                      <td className="stock-qty-out">
                        {formatNumber(
                          item
                            .quantity_out
                        )}
                      </td>


                      <td>
                        {
                          item.stock_before !==
                          null
                            ? formatNumber(
                                item
                                  .stock_before
                              )
                            : "-"
                        }
                      </td>


                      <td>
                        {
                          item.stock_after !==
                          null
                            ? formatNumber(
                                item
                                  .stock_after
                              )
                            : "-"
                        }
                      </td>


                      <td>
                        {formatCurrency(
                          item
                            .unit_cost
                        )}
                      </td>


                      <td>
                        {formatCurrency(
                          item
                            .movement_value
                        )}
                      </td>


                      <td>

                        <span className="stock-remarks">
                          {
                            item.remarks ||
                            "-"
                          }
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>


      {/* =====================================================
          ISSUE MATERIAL MODAL
      ===================================================== */}

      {issueModalOpen &&
        selectedMaterial && (
        <div
          style={
            modalBackdropStyle
          }
        >

          <div
            style={
              modalStyle
            }
          >

            <div
              style={
                modalHeaderStyle
              }
            >

              <div>

                <div className="stock-eyebrow">
                  STORE MATERIAL ISSUE
                </div>

                <div
                  style={{
                    color:
                      "#172b4d",
                    fontSize:
                      "20px",
                    fontWeight:
                      850,
                  }}
                >
                  Issue Material To Production
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",
                    color:
                      "#8292aa",
                    fontSize:
                      "11px",
                  }}
                >
                  Select which active Production Order
                  should receive this material.
                </div>

              </div>


              <button
                type="button"
                style={
                  modalCloseStyle
                }
                onClick={
                  closeIssueModal
                }
                disabled={
                  issuingMaterial
                }
              >
                <X
                  size={18}
                />
              </button>

            </div>


            {issueError && (
              <div
                className="stock-error"
                style={{
                  margin:
                    "18px 20px 0",
                }}
              >
                {issueError}
              </div>
            )}


            {/* ================================================
                SELECTED MATERIAL
            ================================================ */}

            <div
              style={{
                margin:
                  "20px",
                padding:
                  "18px",
                border:
                  "1px solid #dfe7f2",
                borderRadius:
                  "14px",
                background:
                  "#f8fbff",
              }}
            >

              <div
                style={{
                  marginBottom:
                    "14px",
                  color:
                    "#263c5e",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                }}
              >
                Selected Material
              </div>


              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(6, minmax(0, 1fr))",
                  gap:
                    "14px",
                }}
              >

                <div>
                  <div className="stock-product-code">
                    Material
                  </div>

                  <div className="stock-product-name">
                    {
                      selectedMaterial
                        .product_name
                    }
                  </div>
                </div>


                <div>
                  <div className="stock-product-code">
                    Code
                  </div>

                  <strong>
                    {
                      selectedMaterial
                        .product_code
                    }
                  </strong>
                </div>


                <div>
                  <div className="stock-product-code">
                    Available
                  </div>

                  <strong>
                    {formatNumber(
                      selectedMaterial
                        .current_stock
                    )}
                    {" "}
                    {
                      selectedMaterial
                        .unit
                    }
                  </strong>
                </div>


                <div>
                  <div className="stock-product-code">
                    Issue Quantity
                  </div>

                  <strong>
                    {formatNumber(
                      selectedIssueQuantity
                    )}
                    {" "}
                    {
                      selectedMaterial
                        .unit
                    }
                  </strong>
                </div>


                <div>
                  <div className="stock-product-code">
                    Unit Cost
                  </div>

                  <strong>
                    {formatCurrency(
                      selectedMaterial
                        .purchase_price
                    )}
                  </strong>
                </div>


                <div>
                  <div className="stock-product-code">
                    Issue Value
                  </div>

                  <strong>
                    {formatCurrency(
                      Number(
                        selectedMaterial
                          .purchase_price
                      ) *
                      selectedIssueQuantity
                    )}
                  </strong>
                </div>

              </div>

            </div>


            {/* ================================================
                PRODUCTION ORDERS
            ================================================ */}

            <div
              style={{
                margin:
                  "0 20px",
                border:
                  "1px solid #dfe7f2",
                borderRadius:
                  "14px",
                overflow:
                  "hidden",
              }}
            >

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  padding:
                    "15px 17px",
                  borderBottom:
                    "1px solid #e8eef7",
                  background:
                    "#fbfdff",
                }}
              >

                <div>

                  <div className="stock-section-title">
                    Active Production Orders
                  </div>

                  <div className="stock-section-subtitle">
                    Only Production Orders currently
                    In Progress can receive materials.
                  </div>

                </div>


                <div className="stock-section-badge">
                  <Factory
                    size={13}
                  />

                  {
                    activeProductionOrders
                      .length
                  }
                  {" "}
                  active
                </div>

              </div>


              {productionLoading ? (
                <div className="stock-loading-state">

                  <Loader2
                    size={22}
                    className="stock-spin"
                  />

                  Loading Production Orders...

                </div>
              ) : activeProductionOrders.length ===
                0 ? (
                <div className="stock-empty-state">

                  <Factory
                    size={25}
                  />

                  No Production Orders are currently In Progress.

                </div>
              ) : (
                <div className="stock-table-wrap">

                  <table className="stock-table">

                    <thead>

                      <tr>

                        <th>
                          Production Order
                        </th>

                        <th>
                          Proforma
                        </th>

                        <th>
                          Product ID
                        </th>

                        <th>
                          Production Qty
                        </th>

                        <th>
                          Actual Start
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Select
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {activeProductionOrders.map(
                        (
                          order
                        ) => {
                          const selected =
                            selectedProductionOrderId ===
                            order.id;

                          return (
                            <tr
                              key={
                                order.id
                              }
                              style={
                                selected
                                  ? {
                                      background:
                                        "#f0f6ff",
                                    }
                                  : undefined
                              }
                            >

                              <td>

                                <strong>
                                  {
                                    order
                                      .production_number
                                  }
                                </strong>

                                <div className="stock-product-code">
                                  ID #
                                  {
                                    order.id
                                  }
                                </div>

                              </td>


                              <td>
                                PF #
                                {
                                  order
                                    .proforma_id
                                }
                              </td>


                              <td>
                                {
                                  order
                                    .product_id
                                }
                              </td>


                              <td>
                                {
                                  order
                                    .quantity
                                }
                              </td>


                              <td>
                                {
                                  order
                                    .actual_start_date ||
                                  "-"
                                }
                              </td>


                              <td>

                                <span
                                  style={{
                                    display:
                                      "inline-flex",
                                    padding:
                                      "5px 9px",
                                    borderRadius:
                                      "999px",
                                    background:
                                      "#fff6df",
                                    color:
                                      "#a36a00",
                                    fontSize:
                                      "9px",
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {
                                    order
                                      .status
                                  }
                                </span>

                              </td>


                              <td>

                                <button
                                  type="button"
                                  className={
                                    selected
                                      ? "stock-primary-button"
                                      : "stock-secondary-button"
                                  }
                                  onClick={() =>
                                    setSelectedProductionOrderId(
                                      order.id
                                    )
                                  }
                                  style={{
                                    minHeight:
                                      "34px",
                                  }}
                                >
                                  {
                                    selected
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


            {/* ================================================
                REMARKS
            ================================================ */}

            <div
              style={{
                margin:
                  "18px 20px 0",
              }}
            >

              <label className="stock-field">

                <span>
                  Remarks
                </span>

                <input
                  type="text"
                  value={
                    issueRemarks
                  }
                  onChange={(
                    event
                  ) =>
                    setIssueRemarks(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Optional issue remarks..."
                />

              </label>

            </div>


            {/* ================================================
                ACTIONS
            ================================================ */}

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
                  "1px solid #e8eef7",
              }}
            >

              <button
                type="button"
                className="stock-secondary-button"
                onClick={
                  closeIssueModal
                }
                disabled={
                  issuingMaterial
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="stock-primary-button"
                onClick={() =>
                  void handleIssueMaterial()
                }
                disabled={
                  selectedProductionOrderId ===
                    null ||
                  issuingMaterial
                }
                style={{
                  opacity:
                    selectedProductionOrderId ===
                      null ||
                    issuingMaterial
                      ? 0.5
                      : 1,
                  cursor:
                    selectedProductionOrderId ===
                      null ||
                    issuingMaterial
                      ? "not-allowed"
                      : "pointer",
                }}
              >

                {issuingMaterial ? (
                  <>
                    <Loader2
                      size={15}
                      className="stock-spin"
                    />

                    Issuing...
                  </>
                ) : (
                  <>
                    <Send
                      size={15}
                    />

                    Issue Material
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}