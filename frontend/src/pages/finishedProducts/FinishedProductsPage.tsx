import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Factory,
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
  getProducts,
} from "../../services/productService";

import {
  getProductionOrders,
} from "../../services/productionService";

import type {
  FinishedProduct,
} from "../../types/finishedProduct";

import type {
  Product,
} from "../../types/product";

import type {
  ProductionOrder,
} from "../../types/production";


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


interface FinishedProductRow {
  finishedProduct: FinishedProduct;
  product: Product | null;
  productionOrder: ProductionOrder | null;
}


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
    products,
    setProducts,
  ] =
    useState<
      Product[]
    >([]);

  const [
    productionOrders,
    setProductionOrders,
  ] =
    useState<
      ProductionOrder[]
    >([]);

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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);


  async function loadFinishedProducts() {
    try {
      setLoading(true);
      setError(null);

      const [
        finishedProductData,
        productData,
        productionData,
      ] =
        await Promise.all([
          getFinishedProducts(),
          getProducts(),
          getProductionOrders(),
        ]);

      setFinishedProducts(
        finishedProductData
      );

      setProducts(
        productData
      );

      setProductionOrders(
        productionData
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load Finished Products."
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(
    () => {
      void loadFinishedProducts();
    },
    []
  );


  const rows =
    useMemo<
      FinishedProductRow[]
    >(
      () => {
        const productMap =
          new Map<
            number,
            Product
          >(
            products.map(
              (product) => [
                product.id,
                product,
              ]
            )
          );

        const productionMap =
          new Map<
            number,
            ProductionOrder
          >(
            productionOrders.map(
              (order) => [
                order.id,
                order,
              ]
            )
          );

        return finishedProducts.map(
          (
            finishedProduct
          ) => ({
            finishedProduct,

            product:
              productMap.get(
                finishedProduct
                  .product_master_id
              ) ?? null,

            productionOrder:
              productionMap.get(
                finishedProduct
                  .production_order_id
              ) ?? null,
          })
        );
      },
      [
        finishedProducts,
        products,
        productionOrders,
      ]
    );


  const filteredRows =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return rows;
        }

        return rows.filter(
          (row) => {
            const finishedNumber =
              row
                .finishedProduct
                .finished_product_number
                .toLowerCase();

            const productCode =
              row
                .product
                ?.product_code
                .toLowerCase() ??
              "";

            const productName =
              row
                .product
                ?.product_name
                .toLowerCase() ??
              "";

            const productionNumber =
              row
                .productionOrder
                ?.production_number
                .toLowerCase() ??
              "";

            return (
              finishedNumber.includes(
                query
              ) ||
              productCode.includes(
                query
              ) ||
              productName.includes(
                query
              ) ||
              productionNumber.includes(
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


  const totalFinishedQuantity =
    useMemo(
      () =>
        rows.reduce(
          (
            total,
            row
          ) =>
            total +
            (
              row
                .productionOrder
                ?.quantity ??
              0
            ),
          0
        ),
      [rows]
    );


  const linkedProductCount =
    useMemo(
      () => {
        const productIds =
          new Set(
            rows
              .filter(
                (row) =>
                  row.product
                    !== null
              )
              .map(
                (row) =>
                  row
                    .finishedProduct
                    .product_master_id
              )
          );

        return productIds.size;
      },
      [rows]
    );


  function openTraceability(
    finishedProduct:
      FinishedProduct
  ) {
    navigate(
      `/finished-products/${finishedProduct.id}`
    );
  }


  return (
    <div className="finished-products-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="finished-products-header">

        <div>

          <div className="finished-products-eyebrow">
            PRODUCT TRACEABILITY
          </div>

          <h1 className="finished-products-title">
            Finished Products
          </h1>

          <p className="finished-products-subtitle">
            Trace every manufactured product
            from enquiry and customer through
            production, material consumption,
            operations, finished-goods receipt,
            production cost and final billing.
          </p>

        </div>


        <button
          type="button"
          className="finished-products-refresh"
          onClick={() =>
            void loadFinishedProducts()
          }
        >
          <RefreshCw
            size={16}
          />

          Refresh
        </button>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="finished-products-error">
          {error}
        </div>
      )}


      {/* =====================================================
          KPI CARDS
      ====================================================== */}

      <div className="finished-products-kpi-grid">

        <div className="finished-products-kpi-card">

          <div>

            <div className="finished-products-kpi-label">
              Finished Products
            </div>

            <div className="finished-products-kpi-value">
              {
                finishedProducts
                  .length
              }
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
              Product Masters
            </div>

            <div className="finished-products-kpi-value">
              {
                linkedProductCount
              }
            </div>

          </div>


          <div className="finished-products-kpi-icon lavender">
            <Boxes
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
              {formatNumber(
                totalFinishedQuantity
              )}
            </div>

          </div>


          <div className="finished-products-kpi-icon green">
            <Factory
              size={20}
            />
          </div>

        </div>


        <div className="finished-products-kpi-card">

          <div>

            <div className="finished-products-kpi-label">
              Traceability
            </div>

            <div className="finished-products-kpi-value small">
              Active
            </div>

          </div>


          <div className="finished-products-kpi-icon amber">
            <CircleDollarSign
              size={20}
            />
          </div>

        </div>

      </div>


      {/* =====================================================
          FINISHED PRODUCTS TABLE
      ====================================================== */}

      <div className="finished-products-panel">

        <div className="finished-products-panel-header">

          <div>

            <div className="finished-products-panel-title">
              Manufactured Products
            </div>

            <div className="finished-products-panel-subtitle">
              Finished products created
              from completed production
              and finished-goods receipts.
            </div>

          </div>


          <div className="finished-products-count">
            {
              filteredRows
                .length
            }
            {" "}
            records
          </div>

        </div>


        {/* ===================================================
            SEARCH
        ==================================================== */}

        <div className="finished-products-toolbar">

          <div className="finished-products-search">

            <Search
              size={16}
            />

            <input
              type="text"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search finished product, product name or production number..."
            />


            {search && (
              <button
                type="button"
                className="finished-products-search-clear"
                onClick={() =>
                  setSearch("")
                }
              >
                <X
                  size={15}
                />
              </button>
            )}

          </div>

        </div>


        {/* ===================================================
            TABLE STATE
        ==================================================== */}

        {loading ? (

          <div className="finished-products-state">

            <Loader2
              size={22}
              className="finished-products-spin"
            />

            Loading Finished Products...

          </div>

        ) : filteredRows.length ===
          0 ? (

          <div className="finished-products-state">

            <PackageCheck
              size={25}
            />

            No Finished Products found.

          </div>

        ) : (

          <div className="finished-products-table-wrap">

            <table className="finished-products-table">

              <thead>
                <tr>

                  <th>
                    Finished Product
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    Production Order
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Created
                  </th>

                  <th>
                    Action
                  </th>

                </tr>
              </thead>


              <tbody>

                {filteredRows.map(
                  (row) => (

                    <tr
                      key={
                        row
                          .finishedProduct
                          .id
                      }
                    >

                      {/* ===============================
                          FINISHED PRODUCT
                      ================================ */}

                      <td>

                        <div className="finished-products-primary">
                          {
                            row
                              .finishedProduct
                              .finished_product_number
                          }
                        </div>

                        <div className="finished-products-secondary">
                          Traceability ID #
                          {
                            row
                              .finishedProduct
                              .id
                          }
                        </div>

                      </td>


                      {/* ===============================
                          PRODUCT
                      ================================ */}

                      <td>

                        {row.product ? (

                          <>

                            <div className="finished-products-primary">
                              {
                                row
                                  .product
                                  .product_name
                              }
                            </div>

                            <div className="finished-products-secondary">
                              {
                                row
                                  .product
                                  .product_code
                              }
                            </div>

                          </>

                        ) : (

                          <span className="finished-products-muted">
                            Product #
                            {
                              row
                                .finishedProduct
                                .product_master_id
                            }
                          </span>

                        )}

                      </td>


                      {/* ===============================
                          PRODUCTION
                      ================================ */}

                      <td>

                        {row.productionOrder ? (

                          <>

                            <div className="finished-products-primary">
                              {
                                row
                                  .productionOrder
                                  .production_number
                              }
                            </div>

                            <span className="finished-products-status">
                              {
                                row
                                  .productionOrder
                                  .status
                              }
                            </span>

                          </>

                        ) : (

                          <span className="finished-products-muted">
                            Production #
                            {
                              row
                                .finishedProduct
                                .production_order_id
                            }
                          </span>

                        )}

                      </td>


                      {/* ===============================
                          QUANTITY
                      ================================ */}

                      <td>

                        <div className="finished-products-primary">

                          {formatNumber(
                            row
                              .productionOrder
                              ?.quantity ??
                            0
                          )}

                        </div>

                        <div className="finished-products-secondary">
                          {
                            row
                              .product
                              ?.unit ??
                            "units"
                          }
                        </div>

                      </td>


                      {/* ===============================
                          CREATED
                      ================================ */}

                      <td>

                        {formatDate(
                          row
                            .finishedProduct
                            .created_at
                        )}

                      </td>


                      {/* ===============================
                          TRACEABILITY ACTION
                      ================================ */}

                      <td>

                        <button
                          type="button"
                          className="finished-products-view"
                          onClick={() =>
                            openTraceability(
                              row
                                .finishedProduct
                            )
                          }
                        >
                          View Traceability

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

    </div>
  );
}