import axios from "axios";

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
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Wrench,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import "./ProductionPage.css";

import {
  completeProductionOperation,
  completeProductionOrder,
  createProductionOperation,
  createProductionOrdersFromProforma,
  getProductionOrderDetail,
  getProductionOrders,
  startProductionOperation,
  updateProductionOrderStatus,
} from "../../services/productionService";

import {
  getProformas,
  updateProformaStatus,
} from "../../services/proformaService";

import {
  moveProductionToFinishedProducts,
} from "../../services/finishedGoodsReceiptService";

import type {
  ProductionOperationCreatePayload,
  ProductionOrder,
  ProductionOrderDetail,
} from "../../types/production";

import type {
  Proforma,
} from "../../types/proforma";


const EMPTY_OPERATION_FORM = {
  operation_name: "",
  machine_name: "",
  hourly_rate: "",
  planned_hours: "",
};


/* ================================================================
   HELPERS
================================================================ */

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
      .replace(
        /\s+/g,
        "-"
      );

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
    "pending"
  ) {
    return "planned";
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


const inputStyle:
React.CSSProperties = {
  width: "100%",
  minHeight: "39px",
  padding: "0 10px",
  border:
    "1px solid #d9e3f0",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#405a7e",
  outline: "none",
  fontSize: "11px",
};


const readOnlyInputStyle:
React.CSSProperties = {
  ...inputStyle,
  background: "#f6f8fc",
  color: "#7183a3",
};


const labelStyle:
React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#617494",
  fontSize: "9px",
  fontWeight: 750,
};


/* ================================================================
   PAGE
================================================================ */

export default function ProductionPage() {

  const navigate =
    useNavigate();


  const [
    orders,
    setOrders,
  ] =
    useState<
      ProductionOrder[]
    >([]);


  const [
    proformas,
    setProformas,
  ] =
    useState<
      Proforma[]
    >([]);


  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<
      ProductionOrderDetail |
      null
    >(
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
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     START PRODUCTION
  ============================================================== */

  const [
    startProductionOpen,
    setStartProductionOpen,
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
      number |
      null
    >(
      null
    );


  const [
    startingProduction,
    setStartingProduction,
  ] =
    useState(false);


  const [
    startProductionError,
    setStartProductionError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     OPERATION FORM
  ============================================================== */

  const [
    showOperationForm,
    setShowOperationForm,
  ] =
    useState(false);


  const [
    operationForm,
    setOperationForm,
  ] =
    useState(
      EMPTY_OPERATION_FORM
    );


  const [
    operationSaving,
    setOperationSaving,
  ] =
    useState(false);


  const [
    operationError,
    setOperationError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    operationActionId,
    setOperationActionId,
  ] =
    useState<
      number |
      null
    >(
      null
    );


  const [
    actualHours,
    setActualHours,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({});


  /* ==============================================================
     COMPLETE PRODUCTION
  ============================================================== */

  const [
    completingProduction,
    setCompletingProduction,
  ] =
    useState(false);


  const [
    completionError,
    setCompletionError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     PROFORMA LOOKUP
  ============================================================== */

  const proformaNumberById =
    useMemo(
      () => {

        const map =
          new Map<
            number,
            string
          >();

        proformas.forEach(
          proforma => {

            map.set(
              proforma.id,
              proforma.proforma_number
            );

          }
        );

        return map;

      },
      [
        proformas,
      ]
    );


  function getProformaNumber(
    proformaId: number
  ) {
    return (
      proformaNumberById.get(
        proformaId
      )
      || `Proforma ${proformaId}`
    );
  }


  /* ==============================================================
     LOAD
  ============================================================== */

  async function loadOrders() {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const [
        productionData,
        proformaData,
      ] =
        await Promise.all([
          getProductionOrders(),
          getProformas(),
        ]);


      setOrders(
        productionData
      );

      setProformas(
        proformaData
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
          "Unable to load production orders."
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

      void loadOrders();

    },
    []
  );


  /* ==============================================================
     FILTER
  ============================================================== */

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
          order => {

            const proformaNumber =
              proformaNumberById.get(
                order.proforma_id
              )
              || "";


            return (
              order
                .production_number
                .toLowerCase()
                .includes(
                  query
                )
              ||
              order
                .product_name
                .toLowerCase()
                .includes(
                  query
                )
              ||
              order
                .unit
                .toLowerCase()
                .includes(
                  query
                )
              ||
              proformaNumber
                .toLowerCase()
                .includes(
                  query
                )
              ||
              order
                .status
                .toLowerCase()
                .includes(
                  query
                )
            );

          }
        );

      },
      [
        orders,
        search,
        proformaNumberById,
      ]
    );


  /* ==============================================================
     KPI
  ============================================================== */

  const completedCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.status
              .toLowerCase()
            === "completed"
        ).length,
      [
        orders,
      ]
    );


  const inProgressCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.status
              .toLowerCase()
            === "in progress"
        ).length,
      [
        orders,
      ]
    );


  const pendingCount =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.status
              .toLowerCase()
            === "pending"
        ).length,
      [
        orders,
      ]
    );


  /* ==============================================================
     DETAILS
  ============================================================== */

  async function refreshOrderDetail(
    productionOrderId: number
  ) {

    const detail =
      await getProductionOrderDetail(
        productionOrderId
      );


    setSelectedOrder(
      detail
    );


    return detail;

  }


  async function openOrderDetail(
    order: ProductionOrder
  ) {

    try {

      setDetailLoading(
        true
      );

      setError(
        null
      );

      setOperationError(
        null
      );

      setCompletionError(
        null
      );

      setShowOperationForm(
        false
      );


      const detail =
        await refreshOrderDetail(
          order.id
        );


      const hourValues:
        Record<
          number,
          string
        > = {};


      detail.operations.forEach(
        operation => {

          hourValues[
            operation.id
          ] =
            Number(
              operation.actual_hours
            ) > 0
              ? String(
                  operation.actual_hours
                )
              : "";

        }
      );


      setActualHours(
        hourValues
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
          "Unable to load production order details."
        )
      );

    } finally {

      setDetailLoading(
        false
      );

    }

  }


  function closeDetail() {

    setSelectedOrder(
      null
    );

    setShowOperationForm(
      false
    );

    setOperationError(
      null
    );

    setCompletionError(
      null
    );

    setOperationForm(
      EMPTY_OPERATION_FORM
    );

  }


  /* ==============================================================
     ADD OPERATION
  ============================================================== */

  async function handleAddOperation() {

    if (
      !selectedOrder
    ) {
      return;
    }


    const operationName =
      operationForm
        .operation_name
        .trim();


    if (
      !operationName
    ) {

      setOperationError(
        "Operation name is required."
      );

      return;

    }


    const hourlyRate =
      Number(
        operationForm
          .hourly_rate
      );


    const plannedHours =
      Number(
        operationForm
          .planned_hours
      );


    if (
      Number.isNaN(
        hourlyRate
      )
      ||
      hourlyRate < 0
    ) {

      setOperationError(
        "Hourly Rate must be zero or greater."
      );

      return;

    }


    if (
      Number.isNaN(
        plannedHours
      )
      ||
      plannedHours < 0
    ) {

      setOperationError(
        "Planned Hours must be zero or greater."
      );

      return;

    }


    try {

      setOperationSaving(
        true
      );

      setOperationError(
        null
      );


      const payload:
        ProductionOperationCreatePayload = {

        operation_name:
          operationName,

        machine_name:
          operationForm
            .machine_name
            .trim()
          || null,

        hourly_rate:
          hourlyRate,

        planned_hours:
          plannedHours,
      };


      await createProductionOperation(
        selectedOrder.id,
        payload
      );


      await refreshOrderDetail(
        selectedOrder.id
      );


      setOperationForm(
        EMPTY_OPERATION_FORM
      );


      setShowOperationForm(
        false
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setOperationError(
        getApiErrorMessage(
          err,
          "Unable to add production operation."
        )
      );

    } finally {

      setOperationSaving(
        false
      );

    }

  }


  /* ==============================================================
     START OPERATION
  ============================================================== */

  async function handleStartOperation(
    operationId: number
  ) {

    if (
      !selectedOrder
    ) {
      return;
    }


    try {

      setOperationActionId(
        operationId
      );

      setOperationError(
        null
      );


      await startProductionOperation(
        operationId
      );


      await refreshOrderDetail(
        selectedOrder.id
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setOperationError(
        getApiErrorMessage(
          err,
          "Unable to start operation."
        )
      );

    } finally {

      setOperationActionId(
        null
      );

    }

  }


  /* ==============================================================
     COMPLETE OPERATION
  ============================================================== */

  async function handleCompleteOperation(
    operationId: number
  ) {

    if (
      !selectedOrder
    ) {
      return;
    }


    const hours =
      Number(
        actualHours[
          operationId
        ]
      );


    if (
      Number.isNaN(
        hours
      )
      ||
      hours <= 0
    ) {

      setOperationError(
        "Enter Actual Hours greater than zero."
      );

      return;

    }


    try {

      setOperationActionId(
        operationId
      );

      setOperationError(
        null
      );


      await completeProductionOperation(
        operationId,
        {
          actual_hours:
            hours,
        }
      );


      await refreshOrderDetail(
        selectedOrder.id
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setOperationError(
        getApiErrorMessage(
          err,
          "Unable to complete operation."
        )
      );

    } finally {

      setOperationActionId(
        null
      );

    }

  }


  /* ==============================================================
     COMPLETE PRODUCTION
  ============================================================== */

  async function handleProductionCompleted() {

    if (
      !selectedOrder
    ) {
      return;
    }


    try {

      setCompletingProduction(
        true
      );

      setCompletionError(
        null
      );


      await completeProductionOrder(
        selectedOrder.id
      );


      await moveProductionToFinishedProducts(
        selectedOrder.id,
        {
          remarks:
            `Completed from ${selectedOrder.production_number}`,
        }
      );


      const refreshedOrders =
        await getProductionOrders();


      setOrders(
        refreshedOrders
      );


      setSelectedOrder(
        null
      );


      navigate(
        "/finished-products"
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setCompletionError(
        getApiErrorMessage(
          err,
          "Unable to complete Production and create Finished Product."
        )
      );


      try {

        await refreshOrderDetail(
          selectedOrder.id
        );

      } catch {

        // Keep the original error visible.

      }

    } finally {

      setCompletingProduction(
        false
      );

    }

  }


  /* ==============================================================
     START PRODUCTION MODAL
  ============================================================== */

  async function openStartProduction() {

    setStartProductionOpen(
      true
    );

    setSelectedProformaId(
      null
    );

    setProformaSearch(
      ""
    );

    setStartProductionError(
      null
    );


    try {

      setProformaLoading(
        true
      );


      const [
        proformaData,
        productionData,
      ] =
        await Promise.all([
          getProformas(),
          getProductionOrders(),
        ]);


      setProformas(
        proformaData
      );


      setOrders(
        productionData
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setStartProductionError(
        getApiErrorMessage(
          err,
          "Unable to load Proformas available for production."
        )
      );

    } finally {

      setProformaLoading(
        false
      );

    }

  }


  function closeStartProduction() {

    if (
      startingProduction
    ) {
      return;
    }


    setStartProductionOpen(
      false
    );

    setSelectedProformaId(
      null
    );

    setStartProductionError(
      null
    );

  }


  const startedProformaIds =
    useMemo(
      () =>
        new Set(
          orders.map(
            order =>
              order.proforma_id
          )
        ),
      [
        orders,
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
            proforma => {

              const status =
                (
                  proforma.status
                  || ""
                )
                  .trim()
                  .toLowerCase();


              return (
                status ===
                  "confirmed"
                ||
                status ===
                  "order confirmed"
              );

            }
          )

          .filter(
            proforma =>
              !startedProformaIds
                .has(
                  proforma.id
                )
          )

          .filter(
            proforma => {

              if (!query) {
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
                ||
                proforma.items.some(
                  item =>
                    (
                      item.description
                      || ""
                    )
                      .toLowerCase()
                      .includes(
                        query
                      )
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
        startedProformaIds,
        proformaSearch,
      ]
    );


  const selectedProforma =
    useMemo(
      () =>
        availableProformas.find(
          proforma =>
            proforma.id ===
            selectedProformaId
        )
        ?? null,
      [
        availableProformas,
        selectedProformaId,
      ]
    );


  async function handleStartProduction() {

    if (
      selectedProformaId ===
      null
    ) {

      setStartProductionError(
        "Select a Proforma first."
      );

      return;

    }


    try {

      setStartingProduction(
        true
      );

      setStartProductionError(
        null
      );


      const proformaToStart =
        proformas.find(
          proforma =>
            proforma.id ===
            selectedProformaId
        );


      if (
        !proformaToStart
      ) {
        throw new Error(
          "Selected Proforma could not be found."
        );
      }


      const currentStatus =
        (
          proformaToStart.status
          || ""
        )
          .trim()
          .toLowerCase();


      if (
        currentStatus ===
        "confirmed"
      ) {

        await updateProformaStatus(
          selectedProformaId,
          "Order Confirmed"
        );

      }


      const createdOrders =
        await createProductionOrdersFromProforma(
          selectedProformaId
        );


      if (
        createdOrders.length ===
        0
      ) {
        throw new Error(
          "No Production Orders were created."
        );
      }


      await Promise.all(
        createdOrders.map(
          order =>
            updateProductionOrderStatus(
              order.id,
              "In Progress"
            )
        )
      );


      const [
        refreshedOrders,
        refreshedProformas,
      ] =
        await Promise.all([
          getProductionOrders(),
          getProformas(),
        ]);


      setOrders(
        refreshedOrders
      );


      setProformas(
        refreshedProformas
      );


      setStartProductionOpen(
        false
      );


      setSelectedProformaId(
        null
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setStartProductionError(
        getApiErrorMessage(
          err,
          "Unable to start production."
        )
      );

    } finally {

      setStartingProduction(
        false
      );

    }

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="production-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="production-page-header">

        <div>

          <div className="production-eyebrow">
            MANUFACTURING CONTROL
          </div>


          <h1 className="production-title">
            Production
          </h1>


          <p className="production-subtitle">
            Start production from confirmed
            Proformas and track operations,
            issued materials and manufacturing
            progress.
          </p>

        </div>


        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "10px",
          }}
        >

          <button
            type="button"
            className="production-refresh-button"
            onClick={() =>
              void openStartProduction()
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

            <Play
              size={16}
            />

            Start Production

          </button>


          <button
            type="button"
            className="production-refresh-button"
            onClick={() =>
              void loadOrders()
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
          <div className="production-error">
            {error}
          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

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

            <Factory
              size={20}
            />

          </div>

        </div>


        <div className="production-kpi-card">

          <div>

            <div className="production-kpi-label">
              Pending
            </div>

            <div className="production-kpi-value">
              {pendingCount}
            </div>

          </div>


          <div className="production-kpi-icon lavender">

            <CalendarDays
              size={20}
            />

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

            <Settings2
              size={20}
            />

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

            <CheckCircle2
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          ORDERS
      ====================================================== */}

      <div className="production-panel">

        <div className="production-panel-header">

          <div>

            <div className="production-panel-title">
              Production Orders
            </div>


            <div className="production-panel-subtitle">
              Current manufacturing work
              orders in the ERP.
            </div>

          </div>


          <div className="production-panel-badge">
            {filteredOrders.length} records
          </div>

        </div>


        <div className="production-toolbar">

          <div className="production-search">

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
              placeholder="Search production number, Proforma, manufactured product or status..."
            />


            {
              search
              && (
                <button
                  type="button"
                  className="production-search-clear"
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

        </div>


        {
          loading
            ? (
              <div className="production-loading-state">

                <Loader2
                  size={22}
                  className="production-spin"
                />

                Loading production orders...

              </div>
            )
            : filteredOrders.length
                === 0
              ? (
                <div className="production-empty-state">

                  <Factory
                    size={25}
                  />

                  No production orders found.

                </div>
              )
              : (
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
                          Finished Product / Machine
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

                      {
                        filteredOrders.map(
                          order => (
                            <tr
                              key={
                                order.id
                              }
                            >

                              <td>

                                <div className="production-number">

                                  {
                                    order
                                      .production_number
                                  }

                                </div>

                              </td>


                              <td>

                                <span className="production-reference">

                                  {
                                    getProformaNumber(
                                      order.proforma_id
                                    )
                                  }

                                </span>

                              </td>


                              <td>

                                <strong>

                                  {
                                    order
                                      .product_name
                                  }

                                </strong>

                              </td>


                              <td>

                                <strong>

                                  {
                                    formatNumber(
                                      order.quantity
                                    )
                                  }{" "}
                                  {
                                    order.unit
                                  }

                                </strong>

                              </td>


                              <td>

                                {
                                  formatDate(
                                    order
                                      .planned_start_date
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatDate(
                                    order
                                      .actual_start_date
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatDate(
                                    order
                                      .actual_end_date
                                  )
                                }

                              </td>


                              <td>

                                <span
                                  className={`production-status ${getStatusClass(
                                    order.status
                                  )}`}
                                >

                                  {
                                    order.status
                                  }

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
          <div className="production-detail-loading">

            <Loader2
              size={20}
              className="production-spin"
            />

            Loading production details...

          </div>
        )
      }


      {/* ======================================================
          START PRODUCTION
      ====================================================== */}

      {
        startProductionOpen
        && (
          <div className="production-modal-backdrop">

            <div className="production-modal">

              <div className="production-modal-header">

                <div>

                  <div className="production-modal-eyebrow">
                    START MANUFACTURING
                  </div>


                  <div className="production-modal-title">
                    Start Production
                  </div>


                  <div className="production-modal-subtitle">
                    Select a confirmed Proforma
                    that has not entered production yet.
                  </div>

                </div>


                <button
                  type="button"
                  className="production-modal-close"
                  onClick={
                    closeStartProduction
                  }
                  disabled={
                    startingProduction
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                startProductionError
                && (
                  <div
                    className="production-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {
                      startProductionError
                    }
                  </div>
                )
              }


              <div className="production-detail-section">

                <div className="production-detail-section-header">

                  <div>

                    <div className="production-detail-section-title">

                      <Factory
                        size={16}
                      />

                      Available Proformas

                    </div>


                    <div className="production-detail-section-subtitle">
                      Confirmed Proformas without an
                      existing Production Order.
                    </div>

                  </div>


                  <div className="production-detail-count">

                    {
                      availableProformas
                        .length
                    } available

                  </div>

                </div>


                <div className="production-toolbar">

                  <div className="production-search">

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
                      placeholder="Search Proforma, customer or finished product..."
                    />

                  </div>

                </div>


                {
                  proformaLoading
                    ? (
                      <div className="production-loading-state">

                        <Loader2
                          size={22}
                          className="production-spin"
                        />

                        Loading available Proformas...

                      </div>
                    )
                    : availableProformas
                        .length === 0
                      ? (
                        <div className="production-empty-state">

                          <Factory
                            size={25}
                          />

                          No confirmed Proformas are
                          waiting to start production.

                        </div>
                      )
                      : (
                        <div className="production-table-wrap">

                          <table className="production-table">

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
                                  Finished Product / Machine
                                </th>

                                <th>
                                  Status
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


                                    const productNames =
                                      proforma.items
                                        .map(
                                          item =>
                                            item.description
                                            || ""
                                        )
                                        .filter(Boolean)
                                        .join(", ");


                                    return (
                                      <tr
                                        key={
                                          proforma.id
                                        }
                                      >

                                        <td>

                                          <div className="production-number">

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

                                          <strong>

                                            {
                                              proforma
                                                .company_name
                                            }

                                          </strong>

                                        </td>


                                        <td>

                                          <strong>

                                            {
                                              productNames
                                              || "-"
                                            }

                                          </strong>

                                        </td>


                                        <td>
                                          {
                                            proforma.status
                                          }
                                        </td>


                                        <td>

                                          {
                                            formatCurrency(
                                              proforma
                                                .grand_total
                                            )
                                          }

                                        </td>


                                        <td className="align-right">

                                          <button
                                            type="button"
                                            className="production-view-button"
                                            onClick={() =>
                                              setSelectedProformaId(
                                                proforma.id
                                              )
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
                  <div className="production-detail-section">

                    <div className="production-detail-section-header">

                      <div>

                        <div className="production-detail-section-title">

                          <ClipboardList
                            size={16}
                          />

                          {
                            selectedProforma
                              .proforma_number
                          }

                        </div>


                        <div className="production-detail-section-subtitle">

                          {
                            selectedProforma
                              .company_name
                          }

                        </div>

                      </div>


                      <div className="production-detail-count">

                        {
                          selectedProforma
                            .items
                            .length
                        } items

                      </div>

                    </div>


                    <div className="production-table-wrap">

                      <table className="production-table">

                        <thead>

                          <tr>

                            <th>
                              Finished Product / Machine
                            </th>

                            <th>
                              Qty
                            </th>

                            <th>
                              Unit
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {
                            selectedProforma
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
                                          || "-"
                                        }

                                      </strong>

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
                                        || "-"
                                      }

                                    </td>

                                  </tr>
                                )
                              )
                          }

                        </tbody>

                      </table>

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
                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="production-refresh-button"
                  onClick={
                    closeStartProduction
                  }
                  disabled={
                    startingProduction
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="production-refresh-button"
                  disabled={
                    selectedProformaId
                      === null
                    ||
                    startingProduction
                  }
                  onClick={() =>
                    void handleStartProduction()
                  }
                  style={{
                    background:
                      "#3478ed",
                    color:
                      "#ffffff",
                  }}
                >

                  {
                    startingProduction
                      ? (
                        <>

                          <Loader2
                            size={16}
                            className="production-spin"
                          />

                          Starting...

                        </>
                      )
                      : (
                        <>

                          <Play
                            size={16}
                          />

                          Start Production

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
          DETAIL MODAL
      ====================================================== */}

      {
        selectedOrder
        && (
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

                    {
                      getProformaNumber(
                        selectedOrder
                          .proforma_id
                      )
                    }

                    {" • "}

                    {
                      selectedOrder
                        .product_name
                    }

                  </div>

                </div>


                <button
                  type="button"
                  className="production-modal-close"
                  onClick={
                    closeDetail
                  }
                  disabled={
                    completingProduction
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <div className="production-detail-summary">

                <div>

                  <span>
                    Finished Product / Machine
                  </span>

                  <strong>

                    {
                      selectedOrder
                        .product_name
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Quantity
                  </span>

                  <strong>

                    {
                      formatNumber(
                        selectedOrder
                          .quantity
                      )
                    }{" "}
                    {
                      selectedOrder
                        .unit
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

                    {
                      formatDate(
                        selectedOrder
                          .planned_start_date
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Actual Start
                  </span>

                  <strong>

                    {
                      formatDate(
                        selectedOrder
                          .actual_start_date
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Actual End
                  </span>

                  <strong>

                    {
                      formatDate(
                        selectedOrder
                          .actual_end_date
                      )
                    }

                  </strong>

                </div>

              </div>


              {/* ==================================================
                  OPERATIONS
              ================================================== */}

              <div className="production-detail-section">

                <div className="production-detail-section-header">

                  <div>

                    <div className="production-detail-section-title">

                      <Wrench
                        size={16}
                      />

                      Production Operations

                    </div>


                    <div className="production-detail-section-subtitle">
                      Add and track the actual
                      manufacturing operations
                      performed on this job.
                    </div>

                  </div>


                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "10px",
                    }}
                  >

                    <div className="production-detail-count">

                      {
                        selectedOrder
                          .operations
                          .length
                      } operations

                    </div>


                    {
                      selectedOrder
                        .status
                        .toLowerCase()
                      !== "completed"
                      && (
                        <button
                          type="button"
                          className="production-refresh-button"
                          onClick={() => {

                            setShowOperationForm(
                              current =>
                                !current
                            );

                            setOperationError(
                              null
                            );

                          }}
                          style={{
                            background:
                              "#3478ed",
                            color:
                              "#ffffff",
                          }}
                        >

                          <Plus
                            size={15}
                          />

                          Add Operation

                        </button>
                      )
                    }

                  </div>

                </div>


                {
                  operationError
                  && (
                    <div
                      className="production-error"
                      style={{
                        margin:
                          "14px",
                      }}
                    >
                      {
                        operationError
                      }
                    </div>
                  )
                }


                {
                  showOperationForm
                  && (
                    <div
                      style={{
                        margin:
                          "16px",
                        padding:
                          "16px",
                        border:
                          "1px solid #dfe8f4",
                        borderRadius:
                          "12px",
                        background:
                          "#f9fbff",
                      }}
                    >

                      <div
                        style={{
                          marginBottom:
                            "14px",
                          color:
                            "#203757",
                          fontSize:
                            "12px",
                          fontWeight:
                            800,
                        }}
                      >
                        New Operation
                      </div>


                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(4, minmax(0, 1fr))",
                          gap:
                            "12px",
                        }}
                      >

                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Operation Name *
                          </span>

                          <input
                            style={
                              inputStyle
                            }
                            type="text"
                            value={
                              operationForm
                                .operation_name
                            }
                            onChange={
                              event =>
                                setOperationForm(
                                  current => ({
                                    ...current,

                                    operation_name:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                            }
                            placeholder="e.g. Cutting"
                          />

                        </label>


                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Machine
                          </span>

                          <input
                            style={
                              inputStyle
                            }
                            type="text"
                            value={
                              operationForm
                                .machine_name
                            }
                            onChange={
                              event =>
                                setOperationForm(
                                  current => ({
                                    ...current,

                                    machine_name:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                            }
                            placeholder="e.g. CNC-01"
                          />

                        </label>


                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Hourly Rate (₹)
                          </span>

                          <input
                            style={
                              inputStyle
                            }
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              operationForm
                                .hourly_rate
                            }
                            onChange={
                              event =>
                                setOperationForm(
                                  current => ({
                                    ...current,

                                    hourly_rate:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                            }
                            placeholder="0.00"
                          />

                        </label>


                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Planned Hours
                          </span>

                          <input
                            style={
                              inputStyle
                            }
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              operationForm
                                .planned_hours
                            }
                            onChange={
                              event =>
                                setOperationForm(
                                  current => ({
                                    ...current,

                                    planned_hours:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                            }
                            placeholder="0.00"
                          />

                        </label>


                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Actual Hours
                          </span>

                          <input
                            style={
                              readOnlyInputStyle
                            }
                            value="0.00"
                            readOnly
                          />

                        </label>


                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Operation Cost
                          </span>

                          <input
                            style={
                              readOnlyInputStyle
                            }
                            value="Calculated after completion"
                            readOnly
                          />

                        </label>


                        <label
                          style={
                            labelStyle
                          }
                        >

                          <span>
                            Status
                          </span>

                          <input
                            style={
                              readOnlyInputStyle
                            }
                            value="Pending"
                            readOnly
                          />

                        </label>

                      </div>


                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "flex-end",
                          gap:
                            "9px",
                          marginTop:
                            "15px",
                        }}
                      >

                        <button
                          type="button"
                          className="production-refresh-button"
                          onClick={() => {

                            setShowOperationForm(
                              false
                            );

                            setOperationForm(
                              EMPTY_OPERATION_FORM
                            );

                            setOperationError(
                              null
                            );

                          }}
                        >
                          Cancel
                        </button>


                        <button
                          type="button"
                          className="production-refresh-button"
                          onClick={() =>
                            void handleAddOperation()
                          }
                          disabled={
                            operationSaving
                          }
                          style={{
                            background:
                              "#3478ed",
                            color:
                              "#ffffff",
                          }}
                        >

                          {
                            operationSaving
                              ? (
                                <>

                                  <Loader2
                                    size={15}
                                    className="production-spin"
                                  />

                                  Saving...

                                </>
                              )
                              : (
                                <>

                                  <Plus
                                    size={15}
                                  />

                                  Add Operation

                                </>
                              )
                          }

                        </button>

                      </div>

                    </div>
                  )
                }


                {
                  selectedOrder
                    .operations
                    .length
                  === 0
                    ? (
                      <div className="production-detail-empty">
                        No operations added.
                      </div>
                    )
                    : (
                      <div className="production-table-wrap">

                        <table className="production-table production-detail-table">

                          <thead>

                            <tr>

                              <th>
                                Operation Name
                              </th>

                              <th>
                                Machine
                              </th>

                              <th>
                                Hourly Rate
                              </th>

                              <th>
                                Planned Hours
                              </th>

                              <th>
                                Actual Hours
                              </th>

                              <th>
                                Operation Cost
                              </th>

                              <th>
                                Status
                              </th>

                              <th>
                                Action
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              selectedOrder
                                .operations
                                .map(
                                  operation => {

                                    const status =
                                      operation
                                        .status
                                        .toLowerCase();


                                    const isPending =
                                      status ===
                                      "pending";


                                    const isInProgress =
                                      status ===
                                      "in progress";


                                    const isCompleted =
                                      status ===
                                      "completed";


                                    return (
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
                                              .machine_name
                                            || "-"
                                          }

                                        </td>


                                        <td>

                                          {
                                            formatCurrency(
                                              operation
                                                .hourly_rate
                                            )
                                          }
                                          /hr

                                        </td>


                                        <td>

                                          {
                                            formatNumber(
                                              operation
                                                .planned_hours
                                            )
                                          }

                                        </td>


                                        <td>

                                          {
                                            isInProgress
                                              ? (
                                                <input
                                                  type="number"
                                                  min="0.01"
                                                  step="0.01"
                                                  value={
                                                    actualHours[
                                                      operation.id
                                                    ]
                                                    ?? ""
                                                  }
                                                  onChange={
                                                    event =>
                                                      setActualHours(
                                                        current => ({
                                                          ...current,

                                                          [operation.id]:
                                                            event
                                                              .target
                                                              .value,
                                                        })
                                                      )
                                                  }
                                                  placeholder="Actual hours"
                                                  style={{
                                                    ...inputStyle,
                                                    width:
                                                      "105px",
                                                  }}
                                                />
                                              )
                                              : formatNumber(
                                                  operation
                                                    .actual_hours
                                                )
                                          }

                                        </td>


                                        <td>

                                          <strong>

                                            {
                                              formatCurrency(
                                                operation
                                                  .operation_cost
                                              )
                                            }

                                          </strong>

                                        </td>


                                        <td>

                                          <span
                                            className={`production-status ${getStatusClass(
                                              operation.status
                                            )}`}
                                          >

                                            {
                                              operation.status
                                            }

                                          </span>

                                        </td>


                                        <td>

                                          {
                                            isPending
                                            && (
                                              <button
                                                type="button"
                                                className="production-view-button"
                                                disabled={
                                                  operationActionId
                                                  === operation.id
                                                }
                                                onClick={() =>
                                                  void handleStartOperation(
                                                    operation.id
                                                  )
                                                }
                                              >

                                                <Play
                                                  size={14}
                                                />

                                                Start

                                              </button>
                                            )
                                          }


                                          {
                                            isInProgress
                                            && (
                                              <button
                                                type="button"
                                                className="production-view-button"
                                                disabled={
                                                  operationActionId
                                                  === operation.id
                                                }
                                                onClick={() =>
                                                  void handleCompleteOperation(
                                                    operation.id
                                                  )
                                                }
                                                style={{
                                                  background:
                                                    "#eaf8f0",
                                                  color:
                                                    "#198c56",
                                                  borderColor:
                                                    "#ccebdc",
                                                }}
                                              >

                                                <CheckCircle2
                                                  size={14}
                                                />

                                                Complete

                                              </button>
                                            )
                                          }


                                          {
                                            isCompleted
                                            && (
                                              <span
                                                style={{
                                                  color:
                                                    "#198c56",
                                                  fontSize:
                                                    "10px",
                                                  fontWeight:
                                                    750,
                                                }}
                                              >
                                                Completed
                                              </span>
                                            )
                                          }

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


              {/* ==================================================
                  ISSUED MATERIALS
              ================================================== */}

              <div className="production-detail-section">

                <div className="production-detail-section-header">

                  <div>

                    <div className="production-detail-section-title">

                      <Boxes
                        size={16}
                      />

                      Materials Issued From Store

                    </div>


                    <div className="production-detail-section-subtitle">
                      Purchased materials issued by Store
                      to this Production Order.
                    </div>

                  </div>


                  <div className="production-detail-count">

                    {
                      selectedOrder
                        .materials
                        .length
                    } materials

                  </div>

                </div>


                {
                  selectedOrder
                    .materials
                    .length
                  === 0
                    ? (
                      <div className="production-detail-empty">
                        No materials have been issued
                        from Store yet.
                      </div>
                    )
                    : (
                      <div className="production-table-wrap">

                        <table className="production-table production-detail-table">

                          <thead>

                            <tr>

                              <th>
                                Material
                              </th>

                              <th>
                                Unit
                              </th>

                              <th>
                                Quantity Issued
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
                              selectedOrder
                                .materials
                                .map(
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
                                          material
                                            .unit
                                          || "-"
                                        }

                                      </td>


                                      <td>

                                        <strong>

                                          {
                                            formatNumber(
                                              material
                                                .quantity_issued
                                            )
                                          }

                                        </strong>

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
                            }

                          </tbody>

                        </table>

                      </div>
                    )
                }

              </div>


              {/* ==================================================
                  NOTES
              ================================================== */}

              <div className="production-notes-box">

                <div className="production-notes-title">

                  <ClipboardList
                    size={15}
                  />

                  Notes

                </div>


                <div className="production-notes-content">

                  {
                    selectedOrder.notes
                    || "No production notes."
                  }

                </div>

              </div>


              {/* ==================================================
                  COMPLETE PRODUCTION
              ================================================== */}

              {
                completionError
                && (
                  <div
                    className="production-error"
                    style={{
                      margin:
                        "18px 0 0",
                    }}
                  >
                    {
                      completionError
                    }
                  </div>
                )
              }


              {
                selectedOrder
                  .status
                  .toLowerCase()
                === "in progress"
                && (
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap:
                        "20px",
                      marginTop:
                        "18px",
                      padding:
                        "18px",
                      border:
                        "1px solid #cde9d9",
                      borderRadius:
                        "14px",
                      background:
                        "#f2fbf6",
                    }}
                  >

                    <div>

                      <div
                        style={{
                          color:
                            "#1d5940",
                          fontSize:
                            "12px",
                          fontWeight:
                            850,
                        }}
                      >
                        Production Finished?
                      </div>


                      <div
                        style={{
                          marginTop:
                            "4px",
                          color:
                            "#648271",
                          fontSize:
                            "10px",
                        }}
                      >
                        Complete all operations
                        before moving this job
                        to Finished Products.
                      </div>

                    </div>


                    <button
                      type="button"
                      className="production-refresh-button"
                      disabled={
                        completingProduction
                      }
                      onClick={() =>
                        void handleProductionCompleted()
                      }
                      style={{
                        minHeight:
                          "42px",
                        background:
                          "#159a5b",
                        borderColor:
                          "#159a5b",
                        color:
                          "#ffffff",
                      }}
                    >

                      {
                        completingProduction
                          ? (
                            <>

                              <Loader2
                                size={16}
                                className="production-spin"
                              />

                              Completing...

                            </>
                          )
                          : (
                            <>

                              <PackageCheck
                                size={16}
                              />

                              Production Completed

                            </>
                          )
                      }

                    </button>

                  </div>
                )
              }


              {
                selectedOrder
                  .status
                  .toLowerCase()
                === "completed"
                && (
                  <div className="production-complete-banner">

                    <PackageCheck
                      size={18}
                    />

                    This Production Order
                    has been completed.

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