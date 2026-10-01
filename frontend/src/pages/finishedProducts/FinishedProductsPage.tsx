import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Factory,
  FileText,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import "./FinishedProductsPage.css";

import {
  getFinishedProducts,
} from "../../services/finishedProductService";

import {
  getProductionOrders,
} from "../../services/productionService";

import {
  getProformas,
} from "../../services/proformaService";

import {
  getFinalBills,
} from "../../services/finalBillService";

import {
  getBusinessSettings,
} from "../../services/settingsService";

import type {
  FinishedProduct,
} from "../../types/finishedProduct";

import type {
  ProductionOrder,
} from "../../types/production";

import type {
  Proforma,
} from "../../types/proforma";

import type {
  FinalBill,
} from "../../types/finalBill";


const FALLBACK_PAGE_SIZE =
  10;


/* ============================================================
   HELPERS
============================================================ */

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


  return date.toLocaleDateString(
    "en-IN"
  );

}


function formatNumber(
  value:
    | string
    | number
) {

  const numericValue =
    Number(
      value
    );


  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return String(
      value
    );
  }


  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    numericValue
  );

}


/* ============================================================
   CONNECTED ROW
============================================================ */

interface FinishedProductRow {

  finishedProduct:
    FinishedProduct;

  productionOrder:
    ProductionOrder | null;

  proforma:
    Proforma | null;

  issuedInvoice:
    FinalBill | null;

  draftInvoice:
    FinalBill | null;

}


/* ============================================================
   BILL LOOKUP
============================================================ */

function getIssuedInvoice(
  bills:
    FinalBill[],

  proformaId:
    number | null
) {

  if (
    proformaId
    ===
    null
  ) {
    return null;
  }


  const matchingBills =
    bills
      .filter(
        bill =>
          bill.proforma_id
          ===
          proformaId
          &&
          bill.status
            .trim()
            .toLowerCase()
          ===
          "issued"
          &&
          !bill.invoice_type
            .trim()
            .toLowerCase()
            .includes(
              "credit"
            )
      )
      .sort(
        (
          a,
          b
        ) => {

          if (
            b.revision_number
            !==
            a.revision_number
          ) {

            return (
              b.revision_number
              -
              a.revision_number
            );

          }


          return (
            new Date(
              b.invoice_date
            ).getTime()
            -
            new Date(
              a.invoice_date
            ).getTime()
          );

        }
      );


  return (
    matchingBills[0]
    ??
    null
  );

}


function getDraftInvoice(
  bills:
    FinalBill[],

  proformaId:
    number | null
) {

  if (
    proformaId
    ===
    null
  ) {
    return null;
  }


  const matchingBills =
    bills
      .filter(
        bill =>
          bill.proforma_id
          ===
          proformaId
          &&
          bill.status
            .trim()
            .toLowerCase()
          ===
          "draft"
          &&
          !bill.invoice_type
            .trim()
            .toLowerCase()
            .includes(
              "credit"
            )
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.updated_at
          ).getTime()
          -
          new Date(
            a.updated_at
          ).getTime()
      );


  return (
    matchingBills[0]
    ??
    null
  );

}


/* ============================================================
   PAGE
============================================================ */

export default function FinishedProductsPage() {

  const navigate =
    useNavigate();


  const [
    finishedProducts,
    setFinishedProducts,
  ] =
    useState<
      FinishedProduct[]
    >([]);


  const [
    productionOrders,
    setProductionOrders,
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
    finalBills,
    setFinalBills,
  ] =
    useState<
      FinalBill[]
    >([]);


  const [
    search,
    setSearch,
  ] =
    useState(
      ""
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
      string |
      null
    >(
      null
    );


  /* ==========================================================
     SETTINGS CONTROLLED PAGINATION
  ========================================================== */

  const [
    pageSize,
    setPageSize,
  ] =
    useState(
      FALLBACK_PAGE_SIZE
    );


  const [
    toBeBilledPage,
    setToBeBilledPage,
  ] =
    useState(
      1
    );


  const [
    billedPage,
    setBilledPage,
  ] =
    useState(
      1
    );


  /* ==========================================================
     LOAD PAGE SIZE
  ========================================================== */

  useEffect(
    () => {

      async function loadPageSize() {

        try {

          const settings =
            await getBusinessSettings();


          const configuredSize =
            Number(
              settings.default_page_size
            );


          if (
            Number.isInteger(
              configuredSize
            )
            &&
            configuredSize >= 5
            &&
            configuredSize <= 100
          ) {

            setPageSize(
              configuredSize
            );

          } else {

            setPageSize(
              FALLBACK_PAGE_SIZE
            );

          }

        } catch (
          err
        ) {

          console.error(
            "Unable to load Finished Products page size:",
            err
          );


          setPageSize(
            FALLBACK_PAGE_SIZE
          );

        }

      }


      void loadPageSize();

    },
    []
  );


  /* ==========================================================
     LOAD DATA
  ========================================================== */

  async function loadFinishedProducts() {

    try {

      setLoading(
        true
      );


      setError(
        null
      );


      const [
        finishedProductData,
        productionData,
        proformaData,
        finalBillData,
      ] =
        await Promise.all([
          getFinishedProducts(),

          getProductionOrders(),

          getProformas(),

          getFinalBills(),
        ]);


      setFinishedProducts(
        finishedProductData
      );


      setProductionOrders(
        productionData
      );


      setProformas(
        proformaData
      );


      setFinalBills(
        finalBillData
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        "Unable to load Finished Products."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadFinishedProducts();

    },
    []
  );


  /* ==========================================================
     CONNECT RECORDS
  ========================================================== */

  const rows =
    useMemo<
      FinishedProductRow[]
    >(
      () => {

        const productionMap =
          new Map<
            number,
            ProductionOrder
          >(
            productionOrders.map(
              order => [
                order.id,
                order,
              ]
            )
          );


        const proformaMap =
          new Map<
            number,
            Proforma
          >(
            proformas.map(
              proforma => [
                proforma.id,
                proforma,
              ]
            )
          );


        return (
          finishedProducts

            .map(
              finishedProduct => {

                const productionOrder =
                  productionMap.get(
                    finishedProduct
                      .production_order_id
                  )
                  ??
                  null;


                const proforma =
                  productionOrder
                    ? (
                        proformaMap.get(
                          productionOrder
                            .proforma_id
                        )
                        ??
                        null
                      )
                    : null;


                const proformaId =
                  proforma?.id
                  ??
                  productionOrder
                    ?.proforma_id
                  ??
                  null;


                return {

                  finishedProduct,

                  productionOrder,

                  proforma,

                  issuedInvoice:
                    getIssuedInvoice(
                      finalBills,
                      proformaId
                    ),

                  draftInvoice:
                    getDraftInvoice(
                      finalBills,
                      proformaId
                    ),

                };

              }
            )

            .sort(
              (
                a,
                b
              ) =>
                new Date(
                  b.finishedProduct
                    .created_at
                ).getTime()
                -
                new Date(
                  a.finishedProduct
                    .created_at
                ).getTime()
            )
        );

      },
      [
        finishedProducts,
        productionOrders,
        proformas,
        finalBills,
      ]
    );


  /* ==========================================================
     SEARCH
  ========================================================== */

  const filteredRows =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (
          !query
        ) {
          return rows;
        }


        return rows.filter(
          row => {

            const values = [

              row
                .finishedProduct
                .finished_product_number,

              row
                .finishedProduct
                .product_name,

              row
                .productionOrder
                ?.production_number,

              row
                .proforma
                ?.proforma_number,

              row
                .proforma
                ?.company_name,

              row
                .issuedInvoice
                ?.invoice_number,

              row
                .draftInvoice
                ?.invoice_number,

            ];


            return values.some(
              value =>
                (
                  value
                  ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
            );

          }
        );

      },
      [
        rows,
        search,
      ]
    );


  /* ==========================================================
     RESET PAGES WHEN SEARCH / PAGE SIZE CHANGES
  ========================================================== */

  useEffect(
    () => {

      setToBeBilledPage(
        1
      );


      setBilledPage(
        1
      );

    },
    [
      search,
      pageSize,
    ]
  );


  /* ==========================================================
     BILLING GROUPS
  ========================================================== */

  const toBeBilledRows =
    useMemo(
      () =>
        filteredRows.filter(
          row =>
            row.issuedInvoice
            ===
            null
        ),
      [
        filteredRows,
      ]
    );


  const billedRows =
    useMemo(
      () =>
        filteredRows.filter(
          row =>
            row.issuedInvoice
            !==
            null
        ),
      [
        filteredRows,
      ]
    );


  /* ==========================================================
     TO BE BILLED PAGINATION
  ========================================================== */

  const toBeBilledTotalPages =
    Math.max(
      1,
      Math.ceil(
        toBeBilledRows.length
        /
        pageSize
      )
    );


  useEffect(
    () => {

      if (
        toBeBilledPage
        >
        toBeBilledTotalPages
      ) {

        setToBeBilledPage(
          toBeBilledTotalPages
        );

      }

    },
    [
      toBeBilledPage,
      toBeBilledTotalPages,
    ]
  );


  const paginatedToBeBilledRows =
    useMemo(
      () => {

        const start =
          (
            toBeBilledPage
            -
            1
          )
          *
          pageSize;


        return toBeBilledRows.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        toBeBilledRows,
        toBeBilledPage,
        pageSize,
      ]
    );


  /* ==========================================================
     BILLED PAGINATION
  ========================================================== */

  const billedTotalPages =
    Math.max(
      1,
      Math.ceil(
        billedRows.length
        /
        pageSize
      )
    );


  useEffect(
    () => {

      if (
        billedPage
        >
        billedTotalPages
      ) {

        setBilledPage(
          billedTotalPages
        );

      }

    },
    [
      billedPage,
      billedTotalPages,
    ]
  );


  const paginatedBilledRows =
    useMemo(
      () => {

        const start =
          (
            billedPage
            -
            1
          )
          *
          pageSize;


        return billedRows.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        billedRows,
        billedPage,
        pageSize,
      ]
    );


  /* ==========================================================
     KPI
  ========================================================== */

  const totalFinishedQuantity =
    useMemo(
      () =>
        rows.reduce(
          (
            total,
            row
          ) =>
            total
            +
            (
              row
                .productionOrder
                ?.quantity
              ??
              0
            ),
          0
        ),
      [
        rows,
      ]
    );


  const toBeBilledCount =
    useMemo(
      () =>
        rows.filter(
          row =>
            row.issuedInvoice
            ===
            null
        ).length,
      [
        rows,
      ]
    );


  const billedCount =
    useMemo(
      () =>
        rows.filter(
          row =>
            row.issuedInvoice
            !==
            null
        ).length,
      [
        rows,
      ]
    );


  /* ==========================================================
     VIEW
  ========================================================== */

  function openTraceability(
    finishedProduct:
      FinishedProduct
  ) {

    navigate(
      `/finished-products/${finishedProduct.id}`
    );

  }


  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div className="finished-products-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="finished-products-header">

        <div>

          <div className="finished-products-eyebrow">
            MANUFACTURED OUTPUT
          </div>


          <h1 className="finished-products-title">
            Finished Products
          </h1>


          <p className="finished-products-subtitle">
            Manufactured products completed
            by Production, separated by billing
            status with full traceability
            available through View.
          </p>

        </div>


        <button
          type="button"
          className="finished-products-refresh"
          onClick={
            () =>
              void loadFinishedProducts()
          }
        >

          <RefreshCw
            size={16}
          />

          Refresh

        </button>

      </div>


      {
        error
        &&
        (
          <div className="finished-products-error">
            {error}
          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="finished-products-kpi-grid">

        <div className="finished-products-kpi-card">

          <div>

            <div className="finished-products-kpi-label">
              Finished Products
            </div>


            <div className="finished-products-kpi-value">
              {rows.length}
            </div>

          </div>


          <div className="finished-products-kpi-icon blue">

            <PackageCheck
              size={20}
            />

          </div>

        </div>


        <div className="finished-products-kpi-card">

          <div>

            <div className="finished-products-kpi-label">
              To Be Billed
            </div>


            <div className="finished-products-kpi-value">
              {toBeBilledCount}
            </div>

          </div>


          <div className="finished-products-kpi-icon amber">

            <Clock3
              size={20}
            />

          </div>

        </div>


        <div className="finished-products-kpi-card">

          <div>

            <div className="finished-products-kpi-label">
              Billed
            </div>


            <div className="finished-products-kpi-value">
              {billedCount}
            </div>

          </div>


          <div className="finished-products-kpi-icon green">

            <CheckCircle2
              size={20}
            />

          </div>

        </div>


        <div className="finished-products-kpi-card">

          <div>

            <div className="finished-products-kpi-label">
              Finished Quantity
            </div>


            <div className="finished-products-kpi-value">

              {
                formatNumber(
                  totalFinishedQuantity
                )
              }

            </div>

          </div>


          <div className="finished-products-kpi-icon lavender">

            <Factory
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="finished-products-search-panel">

        <div className="finished-products-search">

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
            placeholder="Search manufactured product, Finished Product, Proforma, production order, customer or invoice..."
          />


          {
            search
            &&
            (
              <button
                type="button"
                className="finished-products-search-clear"
                onClick={
                  () =>
                    setSearch(
                      ""
                    )
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
              <div className="finished-products-state">

                <Loader2
                  size={23}
                  className="finished-products-spin"
                />

                Loading Finished Products...

              </div>
            )
          : (
              <>

                {/* ===============================================
                    TO BE BILLED
                ================================================ */}

                <div className="finished-products-panel">

                  <div className="finished-products-panel-header">

                    <div className="finished-products-section-heading">

                      <Clock3
                        size={18}
                      />


                      <div>

                        <div className="finished-products-panel-title">
                          TO BE BILLED
                        </div>


                        <div className="finished-products-panel-subtitle">
                          Production is completed,
                          but no issued invoice exists yet.
                        </div>

                      </div>

                    </div>


                    <div className="finished-products-count amber">

                      {
                        toBeBilledRows.length
                      }{" "}
                      pending

                    </div>

                  </div>


                  {
                    toBeBilledRows.length
                    ===
                    0
                      ? (
                          <div className="finished-products-state">

                            <CheckCircle2
                              size={25}
                            />

                            No Finished Products are
                            waiting for billing.

                          </div>
                        )
                      : (
                          <>

                            <div className="finished-products-list">

                              {
                                paginatedToBeBilledRows.map(
                                  row => (

                                    <div
                                      className="finished-product-row"
                                      key={
                                        row
                                          .finishedProduct
                                          .id
                                      }
                                    >

                                      <div className="finished-product-main">

                                        <div className="finished-product-icon pending">

                                          <PackageCheck
                                            size={20}
                                          />

                                        </div>


                                        <div>

                                          <div className="finished-product-name">

                                            {
                                              row
                                                .finishedProduct
                                                .product_name
                                            }

                                          </div>


                                          <div className="finished-product-meta">

                                            <span>

                                              {
                                                row
                                                  .finishedProduct
                                                  .finished_product_number
                                              }

                                            </span>


                                            <span className="finished-product-dot">
                                              •
                                            </span>


                                            <span>

                                              Qty{" "}

                                              <strong>

                                                {
                                                  formatNumber(
                                                    row
                                                      .productionOrder
                                                      ?.quantity
                                                    ??
                                                    0
                                                  )
                                                }

                                              </strong>

                                              {" "}

                                              {
                                                row
                                                  .finishedProduct
                                                  .unit
                                              }

                                            </span>

                                          </div>

                                        </div>

                                      </div>


                                      <div className="finished-product-business">

                                        <div className="finished-product-label">
                                          Proforma
                                        </div>


                                        <div className="finished-product-value">

                                          {
                                            row
                                              .proforma
                                              ?.proforma_number
                                            ??
                                            "-"
                                          }

                                        </div>


                                        <div className="finished-product-small">

                                          {
                                            formatDate(
                                              row
                                                .proforma
                                                ?.proforma_date
                                            )
                                          }

                                        </div>

                                      </div>


                                      <div className="finished-product-business">

                                        <div className="finished-product-label">
                                          Customer
                                        </div>


                                        <div className="finished-product-value">

                                          {
                                            row
                                              .proforma
                                              ?.company_name
                                            ??
                                            "-"
                                          }

                                        </div>


                                        <div className="finished-product-small">

                                          {
                                            row
                                              .productionOrder
                                              ?.production_number
                                            ??
                                            "-"
                                          }

                                        </div>

                                      </div>


                                      <div className="finished-product-business">

                                        <div className="finished-product-label">
                                          Production Completed
                                        </div>


                                        <div className="finished-product-value">

                                          {
                                            formatDate(
                                              row
                                                .productionOrder
                                                ?.actual_end_date
                                            )
                                          }

                                        </div>


                                        {
                                          row.draftInvoice
                                            ? (
                                                <div className="finished-product-draft">

                                                  Draft:{" "}

                                                  {
                                                    row
                                                      .draftInvoice
                                                      .invoice_number
                                                  }

                                                </div>
                                              )
                                            : (
                                                <div className="finished-product-ready">
                                                  Ready for billing
                                                </div>
                                              )
                                        }

                                      </div>


                                      <div className="finished-product-action">

                                        <button
                                          type="button"
                                          className="finished-products-view"
                                          onClick={
                                            () =>
                                              openTraceability(
                                                row
                                                  .finishedProduct
                                              )
                                          }
                                        >

                                          View

                                          <ChevronRight
                                            size={15}
                                          />

                                        </button>

                                      </div>

                                    </div>

                                  )
                                )
                              }

                            </div>


                            <PaginationFooter
                              currentPage={
                                toBeBilledPage
                              }
                              totalPages={
                                toBeBilledTotalPages
                              }
                              totalRecords={
                                toBeBilledRows.length
                              }
                              pageSize={
                                pageSize
                              }
                              onPrevious={
                                () =>
                                  setToBeBilledPage(
                                    page =>
                                      Math.max(
                                        1,
                                        page - 1
                                      )
                                  )
                              }
                              onNext={
                                () =>
                                  setToBeBilledPage(
                                    page =>
                                      Math.min(
                                        toBeBilledTotalPages,
                                        page + 1
                                      )
                                  )
                              }
                            />

                          </>
                        )
                  }

                </div>


                {/* ===============================================
                    BILLED
                ================================================ */}

                <div className="finished-products-panel">

                  <div className="finished-products-panel-header">

                    <div className="finished-products-section-heading">

                      <CircleDollarSign
                        size={18}
                      />


                      <div>

                        <div className="finished-products-panel-title">
                          BILLED FINISHED PRODUCTS
                        </div>


                        <div className="finished-products-panel-subtitle">
                          Finished Products linked
                          to an issued Tax or Revised Invoice.
                        </div>

                      </div>

                    </div>


                    <div className="finished-products-count green">

                      {
                        billedRows.length
                      }{" "}
                      billed

                    </div>

                  </div>


                  {
                    billedRows.length
                    ===
                    0
                      ? (
                          <div className="finished-products-state">

                            <FileText
                              size={25}
                            />

                            No Finished Products
                            have been billed yet.

                          </div>
                        )
                      : (
                          <>

                            <div className="finished-products-list">

                              {
                                paginatedBilledRows.map(
                                  row => (

                                    <div
                                      className="finished-product-row"
                                      key={
                                        row
                                          .finishedProduct
                                          .id
                                      }
                                    >

                                      <div className="finished-product-main">

                                        <div className="finished-product-icon billed">

                                          <CheckCircle2
                                            size={20}
                                          />

                                        </div>


                                        <div>

                                          <div className="finished-product-name">

                                            {
                                              row
                                                .finishedProduct
                                                .product_name
                                            }

                                          </div>


                                          <div className="finished-product-meta">

                                            <span>

                                              {
                                                row
                                                  .finishedProduct
                                                  .finished_product_number
                                              }

                                            </span>


                                            <span className="finished-product-dot">
                                              •
                                            </span>


                                            <span>

                                              Qty{" "}

                                              <strong>

                                                {
                                                  formatNumber(
                                                    row
                                                      .productionOrder
                                                      ?.quantity
                                                    ??
                                                    0
                                                  )
                                                }

                                              </strong>

                                              {" "}

                                              {
                                                row
                                                  .finishedProduct
                                                  .unit
                                              }

                                            </span>

                                          </div>

                                        </div>

                                      </div>


                                      <div className="finished-product-business">

                                        <div className="finished-product-label">
                                          Proforma
                                        </div>


                                        <div className="finished-product-value">

                                          {
                                            row
                                              .proforma
                                              ?.proforma_number
                                            ??
                                            "-"
                                          }

                                        </div>


                                        <div className="finished-product-small">

                                          {
                                            formatDate(
                                              row
                                                .proforma
                                                ?.proforma_date
                                            )
                                          }

                                        </div>

                                      </div>


                                      <div className="finished-product-business">

                                        <div className="finished-product-label">
                                          Invoice
                                        </div>


                                        <div className="finished-product-value">

                                          {
                                            row
                                              .issuedInvoice
                                              ?.invoice_number
                                            ??
                                            "-"
                                          }

                                        </div>


                                        <div className="finished-product-small">

                                          {
                                            row
                                              .issuedInvoice
                                              ?.invoice_type
                                            ??
                                            "-"
                                          }

                                        </div>

                                      </div>


                                      <div className="finished-product-business">

                                        <div className="finished-product-label">
                                          Billed Date
                                        </div>


                                        <div className="finished-product-value">

                                          {
                                            formatDate(
                                              row
                                                .issuedInvoice
                                                ?.invoice_date
                                            )
                                          }

                                        </div>


                                        <div className="finished-product-billed">
                                          Billed
                                        </div>

                                      </div>


                                      <div className="finished-product-action">

                                        <button
                                          type="button"
                                          className="finished-products-view"
                                          onClick={
                                            () =>
                                              openTraceability(
                                                row
                                                  .finishedProduct
                                              )
                                          }
                                        >

                                          View

                                          <ChevronRight
                                            size={15}
                                          />

                                        </button>

                                      </div>

                                    </div>

                                  )
                                )
                              }

                            </div>


                            <PaginationFooter
                              currentPage={
                                billedPage
                              }
                              totalPages={
                                billedTotalPages
                              }
                              totalRecords={
                                billedRows.length
                              }
                              pageSize={
                                pageSize
                              }
                              onPrevious={
                                () =>
                                  setBilledPage(
                                    page =>
                                      Math.max(
                                        1,
                                        page - 1
                                      )
                                  )
                              }
                              onNext={
                                () =>
                                  setBilledPage(
                                    page =>
                                      Math.min(
                                        billedTotalPages,
                                        page + 1
                                      )
                                  )
                              }
                            />

                          </>
                        )
                  }

                </div>

              </>
            )
      }

    </div>
  );

}


/* ============================================================
   PAGINATION FOOTER
============================================================ */

function PaginationFooter(
  {
    currentPage,
    totalPages,
    totalRecords,
    pageSize,
    onPrevious,
    onNext,
  }:
  {
    currentPage:
      number;

    totalPages:
      number;

    totalRecords:
      number;

    pageSize:
      number;

    onPrevious:
      () => void;

    onNext:
      () => void;
  }
) {

  const firstRecord =
    totalRecords
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

      totalRecords
    );


  return (
    <div
      style={{
        display:
          "flex",

        justifyContent:
          "space-between",

        alignItems:
          "center",

        gap:
          "14px",

        padding:
          "14px 18px",

        borderTop:
          "1px solid #e8eef7",

        background:
          "#ffffff",

        flexWrap:
          "wrap",
      }}
    >

      <div
        style={{
          color:
            "#8a9bb3",

          fontSize:
            "10px",
        }}
      >

        Showing{" "}

        <strong
          style={{
            color:
              "#526b8f",
          }}
        >
          {firstRecord}
        </strong>

        {"–"}

        <strong
          style={{
            color:
              "#526b8f",
          }}
        >
          {lastRecord}
        </strong>

        {" of "}

        <strong
          style={{
            color:
              "#526b8f",
          }}
        >
          {totalRecords}
        </strong>

        {" records • "}

        {pageSize}

        {" per page"}

      </div>


      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            "9px",
        }}
      >

        <button
          type="button"
          disabled={
            currentPage
            <=
            1
          }
          onClick={
            onPrevious
          }
          style={{
            minHeight:
              "36px",

            padding:
              "0 12px",

            border:
              "1px solid #d7e2f3",

            borderRadius:
              "9px",

            background:
              "#ffffff",

            color:
              "#50688e",

            fontSize:
              "10px",

            fontWeight:
              700,

            cursor:
              currentPage
              <=
              1
                ? "not-allowed"
                : "pointer",

            opacity:
              currentPage
              <=
              1
                ? 0.5
                : 1,
          }}
        >
          Previous
        </button>


        <span
          style={{
            minWidth:
              "74px",

            textAlign:
              "center",

            color:
              "#7183a0",

            fontSize:
              "10px",
          }}
        >

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
          disabled={
            currentPage
            >=
            totalPages
          }
          onClick={
            onNext
          }
          style={{
            minHeight:
              "36px",

            padding:
              "0 12px",

            border:
              "1px solid #d7e2f3",

            borderRadius:
              "9px",

            background:
              "#ffffff",

            color:
              "#50688e",

            fontSize:
              "10px",

            fontWeight:
              700,

            cursor:
              currentPage
              >=
              totalPages
                ? "not-allowed"
                : "pointer",

            opacity:
              currentPage
              >=
              totalPages
                ? 0.5
                : 1,
          }}
        >
          Next
        </button>

      </div>

    </div>
  );

}