import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    Boxes,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Factory,
    Loader2,
    PackageCheck,
    RefreshCw,
    Search,
    Settings2,
    Wrench,
    X,
  } from "lucide-react";
  
  import "./ProductionPage.css";
  
  import {
    getProductionOrderDetail,
    getProductionOrders,
  } from "../../services/productionService";
  
  import type {
    ProductionOrder,
    ProductionOrderDetail,
  } from "../../types/production";
  
  
  function formatDate(
    value: string | null
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
  
  
  function getStatusClass(
    status: string
  ) {
    const normalized =
      status
        .toLowerCase()
        .replace(/\s+/g, "-");
  
    if (
      normalized ===
      "completed"
    ) {
      return "completed";
    }
  
    if (
      normalized ===
      "in-progress"
    ) {
      return "in-progress";
    }
  
    if (
      normalized ===
      "planned"
    ) {
      return "planned";
    }
  
    if (
      normalized ===
      "cancelled"
    ) {
      return "cancelled";
    }
  
    return "default";
  }
  
  
  export default function ProductionPage() {
    const [
      orders,
      setOrders,
    ] =
      useState<ProductionOrder[]>([]);
  
    const [
      selectedOrder,
      setSelectedOrder,
    ] =
      useState<ProductionOrderDetail | null>(
        null
      );
  
    const [
      search,
      setSearch,
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
  
  
    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
  
        const data =
          await getProductionOrders();
  
        setOrders(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load production orders."
        );
      } finally {
        setLoading(false);
      }
    }
  
  
    useEffect(() => {
      void loadOrders();
    }, []);
  
  
    const filteredOrders =
      useMemo(
        () => {
          const query =
            search
              .trim()
              .toLowerCase();
  
          if (!query) {
            return orders;
          }
  
          return orders.filter(
            (order) =>
              order.production_number
                .toLowerCase()
                .includes(query) ||
  
              String(
                order.proforma_id
              ).includes(query) ||
  
              String(
                order.product_id
              ).includes(query) ||
  
              order.status
                .toLowerCase()
                .includes(query)
          );
        },
        [
          orders,
          search,
        ]
      );
  
  
    const completedCount =
      useMemo(
        () =>
          orders.filter(
            (order) =>
              order.status
                .toLowerCase() ===
              "completed"
          ).length,
        [orders]
      );
  
  
    const inProgressCount =
      useMemo(
        () =>
          orders.filter(
            (order) =>
              order.status
                .toLowerCase() ===
              "in progress"
          ).length,
        [orders]
      );
  
  
    const plannedCount =
      useMemo(
        () =>
          orders.filter(
            (order) =>
              order.status
                .toLowerCase() ===
              "planned"
          ).length,
        [orders]
      );
  
  
    async function openOrderDetail(
      order: ProductionOrder
    ) {
      try {
        setDetailLoading(true);
        setError(null);
  
        const detail =
          await getProductionOrderDetail(
            order.id
          );
  
        setSelectedOrder(detail);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load production order details."
        );
      } finally {
        setDetailLoading(false);
      }
    }
  
  
    function closeDetail() {
      setSelectedOrder(null);
    }
  
  
    return (
      <div className="production-page">
  
        <div className="production-page-header">
          <div>
            <div className="production-eyebrow">
              MANUFACTURING CONTROL
            </div>
  
            <h1 className="production-title">
              Production
            </h1>
  
            <p className="production-subtitle">
              Track production orders,
              material requirements,
              manufacturing operations,
              and completion progress.
            </p>
          </div>
  
          <button
            type="button"
            className="production-refresh-button"
            onClick={() =>
              void loadOrders()
            }
          >
            <RefreshCw size={16} />
  
            Refresh
          </button>
        </div>
  
  
        {error && (
          <div className="production-error">
            {error}
          </div>
        )}
  
  
        <div className="production-kpi-grid">
  
          <div className="production-kpi-card">
            <div>
              <div className="production-kpi-label">
                Total Orders
              </div>
  
              <div className="production-kpi-value">
                {orders.length}
              </div>
            </div>
  
            <div className="production-kpi-icon blue">
              <Factory size={20} />
            </div>
          </div>
  
  
          <div className="production-kpi-card">
            <div>
              <div className="production-kpi-label">
                Planned
              </div>
  
              <div className="production-kpi-value">
                {plannedCount}
              </div>
            </div>
  
            <div className="production-kpi-icon lavender">
              <CalendarDays size={20} />
            </div>
          </div>
  
  
          <div className="production-kpi-card">
            <div>
              <div className="production-kpi-label">
                In Progress
              </div>
  
              <div className="production-kpi-value">
                {inProgressCount}
              </div>
            </div>
  
            <div className="production-kpi-icon amber">
              <Settings2 size={20} />
            </div>
          </div>
  
  
          <div className="production-kpi-card">
            <div>
              <div className="production-kpi-label">
                Completed
              </div>
  
              <div className="production-kpi-value">
                {completedCount}
              </div>
            </div>
  
            <div className="production-kpi-icon green">
              <CheckCircle2 size={20} />
            </div>
          </div>
  
        </div>
  
  
        <div className="production-panel">
  
          <div className="production-panel-header">
            <div>
              <div className="production-panel-title">
                Production Orders
              </div>
  
              <div className="production-panel-subtitle">
                Current manufacturing
                work orders in the ERP.
              </div>
            </div>
  
            <div className="production-panel-badge">
              {filteredOrders.length}
              {" "}
              records
            </div>
          </div>
  
  
          <div className="production-toolbar">
            <div className="production-search">
              <Search size={16} />
  
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search production number, proforma, product or status..."
              />
  
              {search && (
                <button
                  type="button"
                  className="production-search-clear"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
  
  
          {loading ? (
            <div className="production-loading-state">
              <Loader2
                size={22}
                className="production-spin"
              />
  
              Loading production orders...
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="production-empty-state">
              <Factory size={25} />
  
              No production orders found.
            </div>
          ) : (
            <div className="production-table-wrap">
  
              <table className="production-table">
  
                <thead>
                  <tr>
                    <th>
                      Production
                    </th>
  
                    <th>
                      Proforma
                    </th>
  
                    <th>
                      Product ID
                    </th>
  
                    <th>
                      Quantity
                    </th>
  
                    <th>
                      Planned Start
                    </th>
  
                    <th>
                      Actual Start
                    </th>
  
                    <th>
                      Actual End
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
                  {filteredOrders.map(
                    (order) => (
                      <tr key={order.id}>
  
                        <td>
                          <div className="production-number">
                            {
                              order.production_number
                            }
                          </div>
  
                          <div className="production-row-note">
                            ID {order.id}
                          </div>
                        </td>
  
  
                        <td>
                          <span className="production-reference">
                            PF #{order.proforma_id}
                          </span>
                        </td>
  
  
                        <td>
                          {
                            order.product_id
                          }
                        </td>
  
  
                        <td>
                          <strong>
                            {order.quantity}
                          </strong>
                        </td>
  
  
                        <td>
                          {formatDate(
                            order.planned_start_date
                          )}
                        </td>
  
  
                        <td>
                          {formatDate(
                            order.actual_start_date
                          )}
                        </td>
  
  
                        <td>
                          {formatDate(
                            order.actual_end_date
                          )}
                        </td>
  
  
                        <td>
                          <span
                            className={`production-status ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
  
  
                        <td className="align-right">
                          <button
                            type="button"
                            className="production-view-button"
                            onClick={() =>
                              void openOrderDetail(
                                order
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
          <div className="production-detail-loading">
            <Loader2
              size={20}
              className="production-spin"
            />
  
            Loading production details...
          </div>
        )}
  
  
        {selectedOrder && (
          <div className="production-modal-backdrop">
  
            <div className="production-modal">
  
              <div className="production-modal-header">
                <div>
                  <div className="production-modal-eyebrow">
                    PRODUCTION ORDER
                  </div>
  
                  <div className="production-modal-title">
                    {
                      selectedOrder
                        .production_number
                    }
                  </div>
  
                  <div className="production-modal-subtitle">
                    Proforma #
                    {
                      selectedOrder
                        .proforma_id
                    }
                    {" • "}
                    Product #
                    {
                      selectedOrder
                        .product_id
                    }
                  </div>
                </div>
  
                <button
                  type="button"
                  className="production-modal-close"
                  onClick={closeDetail}
                >
                  <X size={18} />
                </button>
              </div>
  
  
              <div className="production-detail-summary">
  
                <div>
                  <span>
                    Quantity
                  </span>
  
                  <strong>
                    {
                      selectedOrder
                        .quantity
                    }
                  </strong>
                </div>
  
  
                <div>
                  <span>
                    Status
                  </span>
  
                  <strong>
                    {
                      selectedOrder
                        .status
                    }
                  </strong>
                </div>
  
  
                <div>
                  <span>
                    Planned Start
                  </span>
  
                  <strong>
                    {formatDate(
                      selectedOrder
                        .planned_start_date
                    )}
                  </strong>
                </div>
  
  
                <div>
                  <span>
                    Actual Start
                  </span>
  
                  <strong>
                    {formatDate(
                      selectedOrder
                        .actual_start_date
                    )}
                  </strong>
                </div>
  
  
                <div>
                  <span>
                    Actual End
                  </span>
  
                  <strong>
                    {formatDate(
                      selectedOrder
                        .actual_end_date
                    )}
                  </strong>
                </div>
  
              </div>
  
  
              <div className="production-detail-section">
  
                <div className="production-detail-section-header">
                  <div>
                    <div className="production-detail-section-title">
                      <Boxes size={16} />
  
                      Materials
                    </div>
  
                    <div className="production-detail-section-subtitle">
                      Required and issued
                      production materials.
                    </div>
                  </div>
  
                  <div className="production-detail-count">
                    {
                      selectedOrder
                        .materials
                        .length
                    }
                    {" "}
                    materials
                  </div>
                </div>
  
  
                {selectedOrder.materials.length ===
                0 ? (
                  <div className="production-detail-empty">
                    No materials added.
                  </div>
                ) : (
                  <div className="production-table-wrap">
  
                    <table className="production-table production-detail-table">
  
                      <thead>
                        <tr>
                          <th>
                            Material
                          </th>
  
                          <th>
                            Product ID
                          </th>
  
                          <th>
                            Unit
                          </th>
  
                          <th>
                            Required
                          </th>
  
                          <th>
                            Issued
                          </th>
  
                          <th>
                            Remaining
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
                        {selectedOrder
                          .materials
                          .map(
                            (
                              material
                            ) => {
                              const remaining =
                                Number(
                                  material
                                    .quantity_required
                                ) -
                                Number(
                                  material
                                    .quantity_issued
                                );
  
                              return (
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
                                      material
                                        .product_id ??
                                      "-"
                                    }
                                  </td>
  
                                  <td>
                                    {
                                      material
                                        .unit ??
                                      "-"
                                    }
                                  </td>
  
                                  <td>
                                    {formatNumber(
                                      material
                                        .quantity_required
                                    )}
                                  </td>
  
                                  <td>
                                    <span className="production-issued">
                                      {formatNumber(
                                        material
                                          .quantity_issued
                                      )}
                                    </span>
                                  </td>
  
                                  <td>
                                    {formatNumber(
                                      remaining
                                    )}
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
                              );
                            }
                          )}
                      </tbody>
  
                    </table>
  
                  </div>
                )}
  
              </div>
  
  
              <div className="production-detail-section">
  
                <div className="production-detail-section-header">
                  <div>
                    <div className="production-detail-section-title">
                      <Wrench size={16} />
  
                      Operations
                    </div>
  
                    <div className="production-detail-section-subtitle">
                      Planned and completed
                      manufacturing operations.
                    </div>
                  </div>
  
                  <div className="production-detail-count">
                    {
                      selectedOrder
                        .operations
                        .length
                    }
                    {" "}
                    operations
                  </div>
                </div>
  
  
                {selectedOrder.operations.length ===
                0 ? (
                  <div className="production-detail-empty">
                    No operations added.
                  </div>
                ) : (
                  <div className="production-table-wrap">
  
                    <table className="production-table production-detail-table">
  
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
                        {selectedOrder
                          .operations
                          .map(
                            (
                              operation
                            ) => (
                              <tr
                                key={
                                  operation.id
                                }
                              >
                                <td>
                                  <div className="production-operation-name">
                                    {
                                      operation
                                        .operation_name
                                    }
                                  </div>
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
                                  {formatCurrency(
                                    operation
                                      .operation_cost
                                  )}
                                </td>
  
                                <td>
                                  <span
                                    className={`production-status ${getStatusClass(
                                      operation
                                        .status
                                    )}`}
                                  >
                                    {
                                      operation
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
                )}
  
              </div>
  
  
              <div className="production-notes-box">
                <div className="production-notes-title">
                  <ClipboardList
                    size={15}
                  />
  
                  Notes
                </div>
  
                <div className="production-notes-content">
                  {
                    selectedOrder
                      .notes ||
                    "No production notes."
                  }
                </div>
              </div>
  
  
              {selectedOrder.status
                .toLowerCase() ===
                "completed" && (
                <div className="production-complete-banner">
                  <PackageCheck
                    size={18}
                  />
  
                  This production order
                  has been completed.
                </div>
              )}
  
            </div>
  
          </div>
        )}
  
      </div>
    );
  }