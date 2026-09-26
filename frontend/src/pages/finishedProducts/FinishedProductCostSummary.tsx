import {
    BadgeIndianRupee,
    Building2,
    CircleDollarSign,
    Factory,
    LockKeyhole,
    ShoppingCart,
    Users,
    Wrench,
  } from "lucide-react";
  
  import type {
    FinishedProductCostSummary,
  } from "../../types/finishedProduct";
  
  
  interface FinishedProductCostSummaryProps {
    costSummary:
      FinishedProductCostSummary;
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
    value: string | null
  ) {
    if (!value) {
      return null;
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
  
    return date.toLocaleString(
      "en-IN"
    );
  }
  
  
  export default function FinishedProductCostSummaryView(
    {
      costSummary,
    }: FinishedProductCostSummaryProps
  ) {
  
    const snapshotDate =
      formatDateTime(
        costSummary.cost_snapshot_at
      );
  
  
    return (
      <>
  
        {/* ======================================================
            COST BREAKDOWN
        ====================================================== */}
  
        <section
          style={{
            border:
              "1px solid #dfe7f3",
  
            borderRadius:
              "15px",
  
            overflow:
              "hidden",
  
            background:
              "#ffffff",
          }}
        >
  
          {/* HEADER */}
  
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
  
              padding:
                "17px 20px",
  
              borderBottom:
                "1px solid #e9eef5",
  
              background:
                "#fbfcff",
            }}
          >
  
            <div
              style={{
                display:
                  "flex",
  
                alignItems:
                  "center",
  
                gap:
                  "11px",
              }}
            >
  
              <div
                className="fp-detail-section-icon green"
              >
  
                <BadgeIndianRupee
                  size={18}
                />
  
              </div>
  
  
              <div>
  
                <h2
                  style={{
                    margin:
                      0,
  
                    color:
                      "#203759",
  
                    fontSize:
                      "13px",
  
                    fontWeight:
                      820,
                  }}
                >
                  Production Cost Breakdown
                </h2>
  
  
                <p
                  style={{
                    margin:
                      "4px 0 0",
  
                    color:
                      "#8796ab",
  
                    fontSize:
                      "9px",
                  }}
                >
                  Complete manufacturing cost
                  captured when the Finished
                  Product was created.
                </p>
  
              </div>
  
            </div>
  
  
            {
              costSummary
                .cost_snapshot_at
                ? (
                  <div
                    style={{
                      display:
                        "inline-flex",
  
                      alignItems:
                        "center",
  
                      gap:
                        "6px",
  
                      padding:
                        "6px 9px",
  
                      border:
                        "1px solid #cce8da",
  
                      borderRadius:
                        "999px",
  
                      background:
                        "#edf9f3",
  
                      color:
                        "#287657",
  
                      fontSize:
                        "8px",
  
                      fontWeight:
                        850,
  
                      whiteSpace:
                        "nowrap",
                    }}
                  >
  
                    <LockKeyhole
                      size={12}
                    />
  
                    Frozen Cost Snapshot
  
                  </div>
                )
                : (
                  <div
                    style={{
                      padding:
                        "6px 9px",
  
                      borderRadius:
                        "999px",
  
                      background:
                        "#fff4dc",
  
                      color:
                        "#9b6718",
  
                      fontSize:
                        "8px",
  
                      fontWeight:
                        850,
                    }}
                  >
                    Legacy Cost Record
                  </div>
                )
            }
  
          </div>
  
  
          {/* COST COMPONENTS */}
  
          <div
            style={{
              display:
                "grid",
  
              gridTemplateColumns:
                "repeat(5, minmax(0, 1fr))",
  
              gap:
                "1px",
  
              background:
                "#e6ebf2",
            }}
          >
  
            <CostItem
              icon={
                <ShoppingCart
                  size={17}
                />
              }
              label="Material Cost"
              value={
                costSummary
                  .actual_material_cost
              }
            />
  
  
            <CostItem
              icon={
                <Wrench
                  size={17}
                />
              }
              label="Operation Cost"
              value={
                costSummary
                  .actual_operation_cost
              }
            />
  
  
            <CostItem
              icon={
                <CircleDollarSign
                  size={17}
                />
              }
              label="Direct Production"
              value={
                costSummary
                  .direct_expense_cost
              }
            />
  
  
            <CostItem
              icon={
                <Users
                  size={17}
                />
              }
              label="Staff Allocation"
              value={
                costSummary
                  .allocated_staff_cost
              }
            />
  
  
            <CostItem
              icon={
                <Building2
                  size={17}
                />
              }
              label="Overhead Allocation"
              value={
                costSummary
                  .allocated_overhead_cost
              }
            />
  
          </div>
  
  
          {/* TOTAL */}
  
          <div
            style={{
              display:
                "grid",
  
              gridTemplateColumns:
                "2fr 1fr",
  
              gap:
                "1px",
  
              borderTop:
                "1px solid #dfe7f3",
  
              background:
                "#dfe7f3",
            }}
          >
  
            <div
              style={{
                display:
                  "flex",
  
                alignItems:
                  "center",
  
                gap:
                  "13px",
  
                padding:
                  "18px 20px",
  
                background:
                  "#f3f8ff",
              }}
            >
  
              <div
                className="fp-detail-kpi-icon green"
              >
  
                <Factory
                  size={19}
                />
  
              </div>
  
  
              <div>
  
                <div
                  style={{
                    color:
                      "#8293aa",
  
                    fontSize:
                      "8px",
  
                    fontWeight:
                      850,
  
                    textTransform:
                      "uppercase",
                  }}
                >
                  Total Production Cost
                </div>
  
  
                <div
                  style={{
                    marginTop:
                      "5px",
  
                    color:
                      "#15365f",
  
                    fontSize:
                      "20px",
  
                    fontWeight:
                      900,
                  }}
                >
  
                  {
                    formatCurrency(
                      costSummary
                        .actual_production_cost
                    )
                  }
  
                </div>
  
              </div>
  
            </div>
  
  
            <div
              style={{
                display:
                  "flex",
  
                alignItems:
                  "center",
  
                gap:
                  "13px",
  
                padding:
                  "18px 20px",
  
                background:
                  "#ffffff",
              }}
            >
  
              <div
                className="fp-detail-kpi-icon amber"
              >
  
                <CircleDollarSign
                  size={19}
                />
  
              </div>
  
  
              <div>
  
                <div
                  style={{
                    color:
                      "#8293aa",
  
                    fontSize:
                      "8px",
  
                    fontWeight:
                      850,
  
                    textTransform:
                      "uppercase",
                  }}
                >
                  Cost Per Unit
                </div>
  
  
                <div
                  style={{
                    marginTop:
                      "5px",
  
                    color:
                      "#1b3155",
  
                    fontSize:
                      "18px",
  
                    fontWeight:
                      900,
                  }}
                >
  
                  {
                    formatCurrency(
                      costSummary
                        .cost_per_unit
                    )
                  }
  
                </div>
  
              </div>
  
            </div>
  
          </div>
  
  
          {/* SNAPSHOT AUDIT */}
  
          {
            snapshotDate
            && (
              <div
                style={{
                  display:
                    "flex",
  
                  alignItems:
                    "center",
  
                  gap:
                    "7px",
  
                  padding:
                    "10px 20px",
  
                  borderTop:
                    "1px solid #edf1f6",
  
                  background:
                    "#fafcff",
  
                  color:
                    "#7d8ea7",
  
                  fontSize:
                    "9px",
                }}
              >
  
                <LockKeyhole
                  size={12}
                />
  
                Cost frozen on
  
                <strong
                  style={{
                    color:
                      "#536b8c",
                  }}
                >
                  {snapshotDate}
                </strong>
  
                — later salary and overhead
                changes do not modify this
                Finished Product.
  
              </div>
            )
          }
  
        </section>
  
      </>
    );
  }
  
  
  /* ================================================================
     COST ITEM
  ================================================================ */
  
  interface CostItemProps {
    icon:
      React.ReactNode;
  
    label:
      string;
  
    value:
      string | number;
  }
  
  
  function CostItem(
    {
      icon,
      label,
      value,
    }: CostItemProps
  ) {
  
    return (
      <div
        style={{
          minWidth:
            0,
  
          padding:
            "16px",
  
          background:
            "#ffffff",
        }}
      >
  
        <div
          style={{
            color:
              "#55749c",
          }}
        >
          {icon}
        </div>
  
  
        <div
          style={{
            marginTop:
              "11px",
  
            color:
              "#8796ad",
  
            fontSize:
              "8px",
  
            fontWeight:
              800,
  
            textTransform:
              "uppercase",
          }}
        >
          {label}
        </div>
  
  
        <div
          style={{
            marginTop:
              "5px",
  
            color:
              "#203759",
  
            fontSize:
              "13px",
  
            fontWeight:
              850,
          }}
        >
  
          {
            formatCurrency(
              value
            )
          }
  
        </div>
  
      </div>
    );
  }