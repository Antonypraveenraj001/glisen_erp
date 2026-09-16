import {
    useEffect,
    useState,
  } from "react";
  
  import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Boxes,
    Filter,
    History,
    Loader2,
    PackageSearch,
    Search,
    TriangleAlert,
  } from "lucide-react";
  
  import "./StockPage.css";
  
  import {
    getStockMovements,
    getStockSummary,
  } from "../../services/stockService";
  
  import type {
    StockMovementResponse,
    StockSummaryResponse,
  } from "../../types/stock";
  
  
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
        .replace(/\s+/g, "-");
  
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
  
  
    async function loadSummary(
      search = summarySearch,
      status = stockStatus
    ) {
      try {
        setSummaryLoading(true);
        setError(null);
  
        const data =
          await getStockSummary({
            search:
              search ||
              undefined,
  
            stock_status:
              status ||
              undefined,
          });
  
        setSummary(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load stock summary."
        );
      } finally {
        setSummaryLoading(false);
      }
    }
  
  
    async function loadMovements() {
      try {
        setMovementLoading(true);
        setError(null);
  
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
  
        setMovements(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load stock movements."
        );
      } finally {
        setMovementLoading(false);
      }
    }
  
  
    useEffect(() => {
      void loadSummary(
        "",
        ""
      );
  
      void loadMovements();
      // Initial load only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
  
    async function handleSummarySearch(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      await loadSummary();
    }
  
  
    async function handleClearSummary() {
      setSummarySearch("");
      setStockStatus("");
  
      await loadSummary(
        "",
        ""
      );
    }
  
  
    async function handleMovementFilter(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      await loadMovements();
    }
  
  
    async function handleClearMovement() {
      setMovementType("");
      setMovementProductId("");
      setMovementStartDate("");
      setMovementEndDate("");
  
      try {
        setMovementLoading(true);
        setError(null);
  
        const data =
          await getStockMovements();
  
        setMovements(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load stock movements."
        );
      } finally {
        setMovementLoading(false);
      }
    }
  
  
    return (
      <div className="stock-page">
  
        <div className="stock-page-header">
          <div>
            <div className="stock-eyebrow">
              INVENTORY CONTROL
            </div>
  
            <h1 className="stock-title">
              Stock Management
            </h1>
  
            <p className="stock-subtitle">
              Monitor current inventory,
              stock valuation, reorder
              conditions, and immutable
              stock movement history.
            </p>
          </div>
        </div>
  
  
        {error && (
          <div className="stock-error">
            {error}
          </div>
        )}
  
  
        <div className="stock-kpi-grid">
  
          <div className="stock-kpi-card">
            <div>
              <div className="stock-kpi-label">
                Total Products
              </div>
  
              <div className="stock-kpi-value">
                {
                  summary.total_products
                }
              </div>
            </div>
  
            <div className="stock-kpi-icon blue">
              <Boxes size={20} />
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
  
  
        <div className="stock-section">
  
          <div className="stock-section-header">
            <div>
              <div className="stock-section-title">
                Stock Summary
              </div>
  
              <div className="stock-section-subtitle">
                Current stock position
                by product.
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
              <Search size={16} />
  
              <input
                type="text"
                value={summarySearch}
                onChange={(event) =>
                  setSummarySearch(
                    event.target.value
                  )
                }
                placeholder="Search product code, name, category or HSN..."
              />
            </div>
  
  
            <select
              className="stock-select"
              value={stockStatus}
              onChange={(event) =>
                setStockStatus(
                  event.target.value
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
              <Filter size={15} />
  
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
              <Boxes size={25} />
  
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
                  </tr>
                </thead>
  
                <tbody>
                  {summary.items.map(
                    (item) => (
                      <tr
                        key={
                          item.product_id
                        }
                      >
                        <td>
                          <div className="stock-product-name">
                            {
                              item.product_name
                            }
                          </div>
  
                          <div className="stock-product-code">
                            {
                              item.product_code
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
                          {item.unit}
                        </td>
  
                        <td>
                          <strong>
                            {formatNumber(
                              item.current_stock
                            )}
                          </strong>
                        </td>
  
                        <td>
                          {formatNumber(
                            item.minimum_stock
                          )}
                        </td>
  
                        <td>
                          {formatNumber(
                            item.maximum_stock
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            item.purchase_price
                          )}
                        </td>
  
                        <td>
                          <strong>
                            {formatCurrency(
                              item.stock_value
                            )}
                          </strong>
                        </td>
  
                        <td>
                          <span
                            className={`stock-status ${getStockStatusClass(
                              item.stock_status
                            )}`}
                          >
                            {
                              item.stock_status
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
  
  
        <div className="stock-section">
  
          <div className="stock-section-header">
            <div>
              <div className="stock-section-title">
                Stock Movement History
              </div>
  
              <div className="stock-section-subtitle">
                Purchase receipts,
                shop-floor issues,
                and finished-goods
                movements.
              </div>
            </div>
  
            <div className="stock-section-badge">
              <History size={13} />
  
              {
                movements
                  .total_movements
              } movements
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
                onChange={(event) =>
                  setMovementProductId(
                    event.target.value
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
                onChange={(event) =>
                  setMovementType(
                    event.target.value
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
                onChange={(event) =>
                  setMovementStartDate(
                    event.target.value
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
                onChange={(event) =>
                  setMovementEndDate(
                    event.target.value
                  )
                }
              />
            </label>
  
  
            <div className="stock-movement-actions">
              <button
                type="submit"
                className="stock-primary-button"
              >
                <Filter size={15} />
  
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
              <History size={25} />
  
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
                            item.movement_date
                          )}
                        </td>
  
                        <td>
                          <span
                            className={`stock-movement-type ${getMovementClass(
                              item.movement_type
                            )}`}
                          >
                            {
                              item.movement_type
                            }
                          </span>
                        </td>
  
                        <td>
                          <div className="stock-reference">
                            {
                              item.reference_number
                            }
                          </div>
                        </td>
  
                        <td>
                          <div className="stock-product-name">
                            {
                              item.product_name
                            }
                          </div>
  
                          <div className="stock-product-code">
                            {
                              item.product_code
                            }
                          </div>
                        </td>
  
                        <td className="stock-qty-in">
                          {formatNumber(
                            item.quantity_in
                          )}
                        </td>
  
                        <td className="stock-qty-out">
                          {formatNumber(
                            item.quantity_out
                          )}
                        </td>
  
                        <td>
                          {item.stock_before !==
                          null
                            ? formatNumber(
                                item.stock_before
                              )
                            : "-"}
                        </td>
  
                        <td>
                          {item.stock_after !==
                          null
                            ? formatNumber(
                                item.stock_after
                              )
                            : "-"}
                        </td>
  
                        <td>
                          {formatCurrency(
                            item.unit_cost
                          )}
                        </td>
  
                        <td>
                          {formatCurrency(
                            item.movement_value
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
  
      </div>
    );
  }