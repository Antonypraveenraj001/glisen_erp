import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import axios from "axios";

import {
  usePermissions,
} from "../../hooks/usePermissions";

import {
  deactivatePurchaseBill,
  getPurchaseBills,
} from "../../services/purchaseBillService";

import type {
  PurchaseBill,
} from "../../types/purchaseBill";


const PAGE_SIZE =
  10;


/* ================================================================
   HELPERS
================================================================ */

function formatDate(
  value: string
) {

  if (!value) {
    return "—";
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
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}


function formatCurrency(
  value:
    number |
    string
) {

  const amount =
    Number(
      value || 0
    );


  return new Intl.NumberFormat(
    "en-IN",
    {
      style:
        "currency",

      currency:
        "INR",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(
    amount
  );

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
      typeof detail
      ===
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


/* ================================================================
   PAGE
================================================================ */

export default function PurchaseBillList() {

  const navigate =
    useNavigate();


  const {
    hasPermission,
  } =
    usePermissions();


  const canCancelPurchaseBill =
    hasPermission(
      "purchase_bills.cancel"
    );


  const canScanPurchaseBill =
    hasPermission(
      "purchase_bills.ai_scan"
    );


  const [
    purchaseBills,
    setPurchaseBills,
  ] =
    useState<
      PurchaseBill[]
    >([]);


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
    useState(
      ""
    );


  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1
    );


  const [
    cancellingBillId,
    setCancellingBillId,
  ] =
    useState<
      number |
      null
    >(
      null
    );


  /* ==============================================================
     LOAD
  ============================================================== */

  const fetchPurchaseBills =
    async () => {

      try {

        setLoading(
          true
        );


        setError(
          ""
        );


        const data =
          await getPurchaseBills();


        setPurchaseBills(
          data
        );

      } catch (
        err
      ) {

        console.error(
          "Purchase bill loading error:",
          err
        );


        setError(
          getApiErrorMessage(
            err,
            "Unable to load purchase bills."
          )
        );

      } finally {

        setLoading(
          false
        );

      }

    };


  useEffect(
    () => {

      void fetchPurchaseBills();

    },
    []
  );


  /* ==============================================================
     PAGINATION
  ============================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        purchaseBills.length
        /
        PAGE_SIZE
      )
    );


  const paginatedPurchaseBills =
    useMemo(
      () => {

        const startIndex =
          (
            currentPage
            -
            1
          )
          *
          PAGE_SIZE;


        return purchaseBills.slice(
          startIndex,
          startIndex
          +
          PAGE_SIZE
        );

      },
      [
        purchaseBills,
        currentPage,
      ]
    );


  const firstRecord =
    purchaseBills.length
    >
    0
      ? (
          (
            currentPage
            -
            1
          )
          *
          PAGE_SIZE
        )
        +
        1
      : 0;


  const lastRecord =
    Math.min(
      currentPage
      *
      PAGE_SIZE,

      purchaseBills.length
    );


  useEffect(
    () => {

      if (
        currentPage
        >
        totalPages
      ) {

        setCurrentPage(
          totalPages
        );

      }

    },
    [
      currentPage,
      totalPages,
    ]
  );


  /* ==============================================================
     CANCEL PURCHASE BILL
  ============================================================== */

  async function handleCancelPurchaseBill(
    bill:
      PurchaseBill
  ) {

    if (
      !canCancelPurchaseBill
    ) {

      setError(
        "You do not have permission to cancel Purchase Bills."
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Cancel Purchase Bill ${bill.bill_number}?\n\n`
        +
        `Supplier: ${bill.supplier_name || "Unknown"}\n`
        +
        `Grand Total: ${formatCurrency(bill.grand_total)}\n\n`
        +
        "Cancelling this Purchase Bill will reverse the stock "
        +
        "that was added by this bill.\n\n"
        +
        "This action will not permanently delete the Purchase Bill."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setCancellingBillId(
        bill.id
      );


      setError(
        ""
      );


      setSuccess(
        ""
      );


      const result =
        await deactivatePurchaseBill(
          bill.id
        );


      setSuccess(
        result.message
        ||
        `Purchase Bill ${bill.bill_number} cancelled successfully.`
      );


      await fetchPurchaseBills();

    } catch (
      err
    ) {

      console.error(
        "Purchase bill cancellation error:",
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to cancel Purchase Bill."
        )
      );

    } finally {

      setCancellingBillId(
        null
      );

    }

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div>

      {/* ========================================================
          HEADER
      ========================================================= */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          marginBottom:
            "25px",

          gap:
            "20px",
        }}
      >

        <div>

          <h1
            style={{
              margin:
                "0 0 5px",
            }}
          >
            Purchase Bills
          </h1>


          <p
            style={{
              margin:
                0,

              color:
                "#6b7280",
            }}
          >
            Manage supplier purchase bills.
          </p>

        </div>


        {
          canScanPurchaseBill
          &&
          (
            <button
              type="button"
              onClick={
                () =>
                  navigate(
                    "/purchase-bills/scan"
                  )
              }
              style={{
                background:
                  "#2563eb",

                color:
                  "#ffffff",

                border:
                  "none",

                borderRadius:
                  "7px",

                padding:
                  "12px 18px",

                cursor:
                  "pointer",

                fontWeight:
                  600,
              }}
            >
              + Scan Purchase Bill
            </button>
          )
        }

      </div>


      {/* ========================================================
          REFRESH
      ========================================================= */}

      <div
        style={{
          display:
            "flex",

          gap:
            "10px",

          marginBottom:
            "20px",
        }}
      >

        <button
          type="button"
          onClick={
            () =>
              void fetchPurchaseBills()
          }
          disabled={
            loading
          }
          style={{
            padding:
              "10px 16px",

            border:
              "1px solid #d1d5db",

            borderRadius:
              "6px",

            background:
              "#ffffff",

            cursor:
              loading
                ? "not-allowed"
                : "pointer",
          }}
        >
          Refresh
        </button>

      </div>


      {/* ========================================================
          SUCCESS
      ========================================================= */}

      {
        success
        &&
        (
          <div
            style={{
              padding:
                "12px",

              marginBottom:
                "20px",

              background:
                "#ecfdf5",

              color:
                "#166534",

              border:
                "1px solid #bbf7d0",

              borderRadius:
                "6px",
            }}
          >
            {success}
          </div>
        )
      }


      {/* ========================================================
          ERROR
      ========================================================= */}

      {
        error
        &&
        (
          <div
            style={{
              padding:
                "12px",

              marginBottom:
                "20px",

              background:
                "#fee2e2",

              color:
                "#991b1b",

              border:
                "1px solid #fecaca",

              borderRadius:
                "6px",
            }}
          >
            {error}
          </div>
        )
      }


      {/* ========================================================
          CONTENT
      ========================================================= */}

      {
        loading
          ? (
              <p>
                Loading purchase bills...
              </p>
            )
          : purchaseBills.length
            ===
            0
              ? (
                  <div
                    style={{
                      background:
                        "#ffffff",

                      border:
                        "1px solid #e5e7eb",

                      borderRadius:
                        "8px",

                      padding:
                        "40px",

                      textAlign:
                        "center",
                    }}
                  >

                    <h3>
                      No Purchase Bills Found
                    </h3>


                    <p
                      style={{
                        color:
                          "#6b7280",
                      }}
                    >
                      Scan your first purchase bill
                      to get started.
                    </p>


                    {
                      canScanPurchaseBill
                      &&
                      (
                        <button
                          type="button"
                          onClick={
                            () =>
                              navigate(
                                "/purchase-bills/scan"
                              )
                          }
                          style={{
                            background:
                              "#2563eb",

                            color:
                              "#ffffff",

                            border:
                              "none",

                            borderRadius:
                              "6px",

                            padding:
                              "10px 18px",

                            cursor:
                              "pointer",
                          }}
                        >
                          Scan Purchase Bill
                        </button>
                      )
                    }

                  </div>
                )
              : (
                  <div
                    style={{
                      background:
                        "#ffffff",

                      border:
                        "1px solid #e5e7eb",

                      borderRadius:
                        "10px",

                      overflow:
                        "hidden",
                    }}
                  >

                    {/* ==========================================
                        TABLE
                    =========================================== */}

                    <div
                      style={{
                        overflowX:
                          "auto",
                      }}
                    >

                      <table
                        style={{
                          width:
                            "100%",

                          borderCollapse:
                            "collapse",
                        }}
                      >

                        <thead>

                          <tr
                            style={{
                              background:
                                "#f3f4f6",

                              textAlign:
                                "left",
                            }}
                          >

                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              Purchase Bill
                            </th>


                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              Bill Date
                            </th>


                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              Subtotal
                            </th>


                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              GST
                            </th>


                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              Grand Total
                            </th>


                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              Status
                            </th>


                            <th
                              style={{
                                padding:
                                  "14px",
                              }}
                            >
                              Action
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {
                            paginatedPurchaseBills.map(
                              bill => (

                                <tr
                                  key={
                                    bill.id
                                  }
                                  style={{
                                    borderTop:
                                      "1px solid #e5e7eb",
                                  }}
                                >

                                  {/* ==============================
                                      BILL NUMBER + SUPPLIER
                                  =============================== */}

                                  <td
                                    style={{
                                      padding:
                                        "14px",
                                    }}
                                  >

                                    <div
                                      style={{
                                        color:
                                          "#1f3555",

                                        fontWeight:
                                          700,

                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      {
                                        bill.bill_number
                                      }
                                    </div>


                                    <div
                                      style={{
                                        marginTop:
                                          "5px",

                                        color:
                                          "#6b7d98",

                                        fontSize:
                                          "11px",

                                        fontWeight:
                                          500,
                                      }}
                                    >
                                      {
                                        bill.supplier_name
                                        ||
                                        "Supplier name unavailable"
                                      }
                                    </div>

                                  </td>


                                  <td
                                    style={{
                                      padding:
                                        "14px",
                                    }}
                                  >
                                    {
                                      formatDate(
                                        bill.bill_date
                                      )
                                    }
                                  </td>


                                  <td
                                    style={{
                                      padding:
                                        "14px",
                                    }}
                                  >
                                    {
                                      formatCurrency(
                                        bill.subtotal
                                      )
                                    }
                                  </td>


                                  <td
                                    style={{
                                      padding:
                                        "14px",
                                    }}
                                  >
                                    {
                                      formatCurrency(
                                        bill.total_gst
                                      )
                                    }
                                  </td>


                                  <td
                                    style={{
                                      padding:
                                        "14px",

                                      fontWeight:
                                        700,

                                      color:
                                        "#1f3555",
                                    }}
                                  >
                                    {
                                      formatCurrency(
                                        bill.grand_total
                                      )
                                    }
                                  </td>


                                  <td
                                    style={{
                                      padding:
                                        "14px",
                                    }}
                                  >

                                    <span
                                      style={{
                                        display:
                                          "inline-flex",

                                        alignItems:
                                          "center",

                                        padding:
                                          "5px 9px",

                                        borderRadius:
                                          "999px",

                                        background:
                                          "#eef6ff",

                                        color:
                                          "#3567b7",

                                        fontSize:
                                          "10px",

                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      Active
                                    </span>

                                  </td>


                                  <td
                                    style={{
                                      padding:
                                        "14px",
                                    }}
                                  >

                                    <div
                                      style={{
                                        display:
                                          "flex",

                                        alignItems:
                                          "center",

                                        gap:
                                          "8px",

                                        flexWrap:
                                          "wrap",
                                      }}
                                    >

                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            navigate(
                                              `/purchase-bills/${bill.id}`
                                            )
                                        }
                                        style={{
                                          padding:
                                            "7px 13px",

                                          border:
                                            "1px solid #2563eb",

                                          color:
                                            "#2563eb",

                                          background:
                                            "#ffffff",

                                          borderRadius:
                                            "6px",

                                          cursor:
                                            "pointer",

                                          fontWeight:
                                            600,
                                        }}
                                      >
                                        View
                                      </button>


                                      {
                                        canCancelPurchaseBill
                                        &&
                                        (
                                          <button
                                            type="button"
                                            disabled={
                                              cancellingBillId
                                              ===
                                              bill.id
                                            }
                                            onClick={
                                              () =>
                                                void handleCancelPurchaseBill(
                                                  bill
                                                )
                                            }
                                            style={{
                                              padding:
                                                "7px 13px",

                                              border:
                                                "1px solid #dc2626",

                                              color:
                                                cancellingBillId
                                                ===
                                                bill.id
                                                  ? "#9ca3af"
                                                  : "#dc2626",

                                              background:
                                                "#ffffff",

                                              borderRadius:
                                                "6px",

                                              cursor:
                                                cancellingBillId
                                                ===
                                                bill.id
                                                  ? "not-allowed"
                                                  : "pointer",

                                              fontWeight:
                                                600,
                                            }}
                                          >

                                            {
                                              cancellingBillId
                                              ===
                                              bill.id
                                                ? "Cancelling..."
                                                : "Cancel"
                                            }

                                          </button>
                                        )
                                      }

                                    </div>

                                  </td>

                                </tr>

                              )
                            )
                          }

                        </tbody>

                      </table>

                    </div>


                    {/* ==========================================
                        PAGINATION
                    =========================================== */}

                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        alignItems:
                          "center",

                        gap:
                          "15px",

                        padding:
                          "15px 16px",

                        borderTop:
                          "1px solid #e5e7eb",

                        background:
                          "#ffffff",
                      }}
                    >

                      <div
                        style={{
                          color:
                            "#6b7280",

                          fontSize:
                            "13px",
                        }}
                      >

                        Showing{" "}

                        <strong>
                          {firstRecord}
                        </strong>

                        {"–"}

                        <strong>
                          {lastRecord}
                        </strong>

                        {" of "}

                        <strong>
                          {
                            purchaseBills.length
                          }
                        </strong>

                        {" records"}

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
                          disabled={
                            currentPage
                            <=
                            1
                          }
                          onClick={
                            () =>
                              setCurrentPage(
                                page =>
                                  Math.max(
                                    1,
                                    page
                                    -
                                    1
                                  )
                              )
                          }
                          style={{
                            padding:
                              "8px 12px",

                            border:
                              "1px solid #d1d5db",

                            background:
                              "#ffffff",

                            borderRadius:
                              "6px",

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
                            color:
                              "#4b5563",

                            fontSize:
                              "13px",

                            whiteSpace:
                              "nowrap",
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
                            () =>
                              setCurrentPage(
                                page =>
                                  Math.min(
                                    totalPages,
                                    page
                                    +
                                    1
                                  )
                              )
                          }
                          style={{
                            padding:
                              "8px 12px",

                            border:
                              "1px solid #d1d5db",

                            background:
                              "#ffffff",

                            borderRadius:
                              "6px",

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

                  </div>
                )
      }

    </div>
  );
}