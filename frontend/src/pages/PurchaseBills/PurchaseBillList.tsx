import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import axios from "axios";


interface PurchaseBill {
  id: number;

  bill_number: string;
  bill_date: string;

  supplier_name?:
    string | null;

  subtotal: number;
  total_gst: number;
  grand_total: number;

  status?: string;
}


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


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
    number
    | string
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


export default function PurchaseBillList() {

  const navigate =
    useNavigate();


  const [
    purchaseBills,
    setPurchaseBills,
  ] =
    useState<
      PurchaseBill[]
    >(
      []
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
    useState(
      ""
    );


  const fetchPurchaseBills =
    async () => {

      try {

        setLoading(
          true
        );

        setError(
          ""
        );


        const token =
          localStorage.getItem(
            "access_token"
          );


        const response =
          await axios.get<
            PurchaseBill[]
          >(
            `${API_BASE_URL}/purchase-bills`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        setPurchaseBills(
          response.data
        );

      } catch (
        err
      ) {

        console.error(
          "Purchase bill loading error:",
          err
        );


        setError(
          "Unable to load purchase bills."
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


        <button
          type="button"
          onClick={() =>
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
            fetchPurchaseBills
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
          ERROR
      ========================================================= */}

      {
        error
        && (
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
            === 0
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


                <button
                  type="button"
                  onClick={() =>
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
                      purchaseBills.map(
                        (
                          bill
                        ) => (
                          <tr
                            key={
                              bill.id
                            }
                            style={{
                              borderTop:
                                "1px solid #e5e7eb",
                            }}
                          >

                            {/* ==================================
                                BILL NUMBER + SUPPLIER
                            =================================== */}

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
                                  || "Supplier name unavailable"
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
                                {
                                  bill.status
                                  || "Active"
                                }
                              </span>

                            </td>


                            <td
                              style={{
                                padding:
                                  "14px",
                              }}
                            >

                              <button
                                type="button"
                                onClick={() =>
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
  );
}