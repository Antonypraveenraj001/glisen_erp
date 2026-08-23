import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getPurchaseBill } from "../../services/purchaseBillService";

interface PurchaseBillItem {
  product_id: number;
  quantity: string | number;
  purchase_price: string | number;
  gst_percentage: string | number;
  line_total: string | number;
  id: number;
}

interface PurchaseBill {
  bill_number: string;
  supplier_id: number;
  bill_date: string;
  subtotal: string | number;
  total_gst: string | number;
  grand_total: string | number;
  remarks: string;
  id: number;
  created_by: number;
  created_at: string;
  items: PurchaseBillItem[];
}

export default function PurchaseBillDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [purchaseBill, setPurchaseBill] =
    useState<PurchaseBill | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  ========================================
  LOAD PURCHASE BILL
  ========================================
  */

  useEffect(() => {
    const loadPurchaseBill = async () => {
      if (!id) {
        setError("Purchase Bill ID is missing.");
        setLoading(false);
        return;
      }

      const purchaseBillId = Number(id);

      if (Number.isNaN(purchaseBillId)) {
        setError("Invalid Purchase Bill ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getPurchaseBill(
          purchaseBillId
        );

        setPurchaseBill(response as PurchaseBill);
      } catch (err) {
        console.error(
          "Purchase bill details loading error:",
          err
        );

        setError(
          "Unable to load purchase bill details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseBill();
  }, [id]);

  /*
  ========================================
  FORMAT CURRENCY
  ========================================
  */

  const formatCurrency = (
    value: string | number
  ) => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return "₹0.00";
    }

    return `₹${numericValue.toFixed(2)}`;
  };

  /*
  ========================================
  FORMAT DATE
  ========================================
  */

  const formatDate = (value: string) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /*
  ========================================
  LOADING
  ========================================
  */

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1>Purchase Bill Details</h1>

        <p>
          Loading purchase bill details...
        </p>
      </div>
    );
  }

  /*
  ========================================
  ERROR
  ========================================
  */

  if (error || !purchaseBill) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1>Purchase Bill Details</h1>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              View purchase bill information.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/purchase-bills")
            }
            style={{
              padding: "10px 16px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            Back to Purchase Bills
          </button>
        </div>

        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error || "Purchase bill not found."}
        </div>
      </div>
    );
  }

  /*
  ========================================
  PAGE
  ========================================
  */

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* ========================================
          HEADER
          ======================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h1
            style={{
              marginBottom: "5px",
            }}
          >
            Purchase Bill Details
          </h1>

          <p
            style={{
              color: "#6b7280",
              margin: 0,
            }}
          >
            View the complete purchase bill
            information.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/purchase-bills")
          }
          style={{
            padding: "10px 16px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          Back to Purchase Bills
        </button>
      </div>

      {/* ========================================
          BILL INFORMATION
          ======================================== */}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "20px",
          }}
        >
          Bill Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "20px",
          }}
        >
          <InfoField
            label="Purchase Bill ID"
            value={String(purchaseBill.id)}
          />

          <InfoField
            label="Bill Number"
            value={
              purchaseBill.bill_number || "-"
            }
          />

          <InfoField
            label="Bill Date"
            value={formatDate(
              purchaseBill.bill_date
            )}
          />

          <InfoField
            label="Supplier ID"
            value={String(
              purchaseBill.supplier_id
            )}
          />

          <InfoField
            label="Created By"
            value={String(
              purchaseBill.created_by
            )}
          />

          <InfoField
            label="Created At"
            value={formatDateTime(
              purchaseBill.created_at
            )}
          />
        </div>
      </section>

      {/* ========================================
          FINANCIAL SUMMARY
          ======================================== */}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "20px",
          }}
        >
          Financial Summary
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "20px",
          }}
        >
          <SummaryCard
            label="Subtotal"
            value={formatCurrency(
              purchaseBill.subtotal
            )}
          />

          <SummaryCard
            label="Total GST"
            value={formatCurrency(
              purchaseBill.total_gst
            )}
          />

          <SummaryCard
            label="Grand Total"
            value={formatCurrency(
              purchaseBill.grand_total
            )}
            highlight
          />
        </div>
      </section>

      {/* ========================================
          PURCHASE BILL ITEMS
          ======================================== */}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "25px",
          marginBottom: "20px",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
            }}
          >
            Purchase Bill Items
          </h2>

          <span
            style={{
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            {purchaseBill.items.length} item
            {purchaseBill.items.length !== 1
              ? "s"
              : ""}
          </span>
        </div>

        {purchaseBill.items.length === 0 ? (
          <p
            style={{
              color: "#6b7280",
            }}
          >
            No items found for this purchase
            bill.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f3f4f6",
                  textAlign: "left",
                }}
              >
                <th
                  style={{
                    padding: "14px",
                  }}
                >
                  Item ID
                </th>

                <th
                  style={{
                    padding: "14px",
                  }}
                >
                  Product ID
                </th>

                <th
                  style={{
                    padding: "14px",
                  }}
                >
                  Quantity
                </th>

                <th
                  style={{
                    padding: "14px",
                  }}
                >
                  Purchase Price
                </th>

                <th
                  style={{
                    padding: "14px",
                  }}
                >
                  GST %
                </th>

                <th
                  style={{
                    padding: "14px",
                  }}
                >
                  Line Total
                </th>
              </tr>
            </thead>

            <tbody>
              {purchaseBill.items.map(
                (item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px",
                      }}
                    >
                      {item.id}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                      }}
                    >
                      {item.product_id}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                      }}
                    >
                      {Number(
                        item.quantity
                      ).toFixed(2)}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                      }}
                    >
                      {formatCurrency(
                        item.purchase_price
                      )}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                      }}
                    >
                      {Number(
                        item.gst_percentage
                      ).toFixed(2)}
                      %
                    </td>

                    <td
                      style={{
                        padding: "14px",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(
                        item.line_total
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* ========================================
          REMARKS
          ======================================== */}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "25px",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "15px",
          }}
        >
          Remarks
        </h2>

        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "15px",
            minHeight: "50px",
          }}
        >
          {purchaseBill.remarks || "-"}
        </div>
      </section>

      {/* ========================================
          ACTIONS
          ======================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          marginBottom: "40px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate("/purchase-bills")
          }
          style={{
            padding: "10px 18px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          Back to Purchase Bills
        </button>
      </div>
    </div>
  );
}

/*
========================================
INFO FIELD
========================================
*/

interface InfoFieldProps {
  label: string;
  value: string;
}

function InfoField({
  label,
  value,
}: InfoFieldProps) {
  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          color: "#6b7280",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
========================================
SUMMARY CARD
========================================
*/

interface SummaryCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: SummaryCardProps) {
  return (
    <div
      style={{
        background: highlight
          ? "#eff6ff"
          : "#f9fafb",
        border: highlight
          ? "1px solid #bfdbfe"
          : "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#6b7280",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: highlight
            ? "#1d4ed8"
            : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
========================================
DATE TIME FORMATTER
========================================
*/

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}