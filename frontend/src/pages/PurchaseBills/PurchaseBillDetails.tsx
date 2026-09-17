import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import axios from "axios";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  getPurchaseBill,
  getPurchaseBillPaymentSummary,
  recordPurchaseBillPayment,
} from "../../services/purchaseBillService";

import type {
  MoneyValue,
  PurchaseBill,
  PurchaseBillPaymentCreate,
  PurchaseBillPaymentSummary,
} from "../../types/purchaseBill";


/* ================================================================
   FORMAT CURRENCY
================================================================ */

function formatCurrency(
  value:
    MoneyValue
    | null
    | undefined
) {
  const numericValue =
    Number(
      value ?? 0
    );

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "₹0.00";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    numericValue
  );
}


/* ================================================================
   FORMAT DATE
================================================================ */

function formatDate(
  value:
    string
    | null
    | undefined
) {
  if (!value) {
    return "—";
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
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


/* ================================================================
   FORMAT DATE TIME
================================================================ */

function formatDateTime(
  value:
    string
    | null
    | undefined
) {
  if (!value) {
    return "—";
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
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


/* ================================================================
   DEFAULT PAYMENT DATE / TIME
================================================================ */

function getCurrentDateTimeInputValue() {
  const now =
    new Date();

  const offset =
    now.getTimezoneOffset();

  const localDate =
    new Date(
      now.getTime()
      - offset
      * 60
      * 1000
    );

  return localDate
    .toISOString()
    .slice(
      0,
      16
    );
}


/* ================================================================
   API ERROR
================================================================ */

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    axios.isAxiosError(
      error
    )
  ) {
    const detail =
      error.response?.data?.detail;

    if (
      typeof detail
      === "string"
    ) {
      return detail;
    }
  }

  return fallback;
}


/* ================================================================
   PAYMENT STATUS COLORS
================================================================ */

function getPaymentStatusStyle(
  status: string
) {
  switch (
    status
  ) {
    case "Paid":
      return {
        background:
          "#eaf8f0",
        color:
          "#267650",
        border:
          "1px solid #c8ecd8",
      };

    case "Partially Paid":
      return {
        background:
          "#fff6df",
        color:
          "#9b6d13",
        border:
          "1px solid #f3dfac",
      };

    case "Unpaid":
      return {
        background:
          "#fff0f3",
        color:
          "#b8415a",
        border:
          "1px solid #f5ccd5",
      };

    default:
      return {
        background:
          "#eef3f8",
        color:
          "#60728e",
        border:
          "1px solid #dbe4ef",
      };
  }
}


/* ================================================================
   PAGE
================================================================ */

export default function PurchaseBillDetails() {

  const navigate =
    useNavigate();

  const {
    id,
  } =
    useParams<{
      id: string;
    }>();


  const {
    user,
  } =
    useAuth();


  const [
    purchaseBill,
    setPurchaseBill,
  ] =
    useState<
      PurchaseBill | null
    >(
      null
    );


  const [
    paymentSummary,
    setPaymentSummary,
  ] =
    useState<
      PurchaseBillPaymentSummary
      | null
    >(
      null
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


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState(
      ""
    );


  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      getCurrentDateTimeInputValue()
    );


  const [
    paymentMode,
    setPaymentMode,
  ] =
    useState(
      "Bank Transfer"
    );


  const [
    referenceNumber,
    setReferenceNumber,
  ] =
    useState(
      ""
    );


  const [
    paymentNotes,
    setPaymentNotes,
  ] =
    useState(
      ""
    );


  const [
    paymentSubmitting,
    setPaymentSubmitting,
  ] =
    useState(
      false
    );


  const [
    paymentError,
    setPaymentError,
  ] =
    useState(
      ""
    );


  const [
    paymentSuccess,
    setPaymentSuccess,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     ROLE
  ============================================================== */

  const canRecordPayment =
    user?.role === "Boss"
    || user?.role === "Accounts";


  /* ==============================================================
     LOAD BILL + PAYMENT SUMMARY
  ============================================================== */

  useEffect(
    () => {

      let active =
        true;


      async function loadData() {

        if (!id) {
          setError(
            "Purchase Bill ID is missing."
          );

          setLoading(
            false
          );

          return;
        }


        const purchaseBillId =
          Number(
            id
          );


        if (
          Number.isNaN(
            purchaseBillId
          )
        ) {
          setError(
            "Invalid Purchase Bill ID."
          );

          setLoading(
            false
          );

          return;
        }


        try {

          setLoading(
            true
          );

          setError(
            ""
          );


          const [
            billResponse,
            paymentResponse,
          ] =
            await Promise.all([
              getPurchaseBill(
                purchaseBillId
              ),

              getPurchaseBillPaymentSummary(
                purchaseBillId
              ),
            ]);


          if (
            active
          ) {
            setPurchaseBill(
              billResponse
            );

            setPaymentSummary(
              paymentResponse
            );
          }

        } catch (
          err
        ) {

          console.error(
            "Purchase bill details loading error:",
            err
          );


          if (
            active
          ) {
            setError(
              getErrorMessage(
                err,
                "Unable to load purchase bill details."
              )
            );
          }

        } finally {

          if (
            active
          ) {
            setLoading(
              false
            );
          }

        }

      }


      void loadData();


      return () => {
        active =
          false;
      };

    },
    [
      id,
    ]
  );


  /* ==============================================================
     BALANCE
  ============================================================== */

  const outstandingBalance =
    Number(
      paymentSummary
        ?.balance_amount
      ?? 0
    );


  const isFullyPaid =
    paymentSummary
      ?.payment_status
    === "Paid"
    || outstandingBalance
    <= 0;


  /* ==============================================================
     PAYMENT HISTORY
  ============================================================== */

  const paymentHistory =
    useMemo(
      () => {

        if (
          !paymentSummary
        ) {
          return [];
        }

        return [
          ...paymentSummary.payments,
        ].reverse();

      },
      [
        paymentSummary,
      ]
    );


  /* ==============================================================
     RECORD PAYMENT
  ============================================================== */

  async function handlePaymentSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    if (
      !purchaseBill
      || !paymentSummary
    ) {
      return;
    }


    setPaymentError(
      ""
    );

    setPaymentSuccess(
      ""
    );


    const amount =
      Number(
        paymentAmount
      );


    if (
      Number.isNaN(
        amount
      )
      || amount <= 0
    ) {
      setPaymentError(
        "Enter a valid payment amount greater than zero."
      );

      return;
    }


    if (
      amount
      > outstandingBalance
    ) {
      setPaymentError(
        `Payment cannot exceed the outstanding balance of ${formatCurrency(
          outstandingBalance
        )}.`
      );

      return;
    }


    if (
      !paymentDate
    ) {
      setPaymentError(
        "Payment date is required."
      );

      return;
    }


    const billDate =
      new Date(
        purchaseBill.bill_date
      );


    const selectedPaymentDate =
      new Date(
        paymentDate
      );


    if (
      !Number.isNaN(
        billDate.getTime()
      )
      && !Number.isNaN(
        selectedPaymentDate.getTime()
      )
      && selectedPaymentDate
        < billDate
    ) {
      setPaymentError(
        "Payment date cannot be earlier than the Purchase Bill date."
      );

      return;
    }


    const request:
      PurchaseBillPaymentCreate =
      {
        payment_date:
          paymentDate,

        amount:
          amount,

        payment_mode:
          paymentMode
          || null,

        reference_number:
          referenceNumber.trim()
          || null,

        notes:
          paymentNotes.trim()
          || null,
      };


    try {

      setPaymentSubmitting(
        true
      );


      await recordPurchaseBillPayment(
        purchaseBill.id,
        request
      );


      const refreshedSummary =
        await getPurchaseBillPaymentSummary(
          purchaseBill.id
        );


      setPaymentSummary(
        refreshedSummary
      );


      setPaymentAmount(
        ""
      );

      setReferenceNumber(
        ""
      );

      setPaymentNotes(
        ""
      );

      setPaymentDate(
        getCurrentDateTimeInputValue()
      );


      setPaymentSuccess(
        "Supplier payment recorded successfully."
      );

    } catch (
      err
    ) {

      console.error(
        "Payment recording error:",
        err
      );


      setPaymentError(
        getErrorMessage(
          err,
          "Unable to record supplier payment."
        )
      );

    } finally {

      setPaymentSubmitting(
        false
      );

    }

  }


  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {
    return (
      <div
        style={{
          minHeight:
            "340px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          gap:
            "10px",

          color:
            "#7486a2",
        }}
      >

        <Loader2
          size={20}
          style={{
            animation:
              "spin 0.8s linear infinite",
          }}
        />

        Loading Purchase Bill...

      </div>
    );
  }


  /* ==============================================================
     ERROR
  ============================================================== */

  if (
    error
    || !purchaseBill
    || !paymentSummary
  ) {
    return (
      <div
        style={{
          maxWidth:
            "1280px",

          margin:
            "0 auto",
        }}
      >

        <button
          type="button"
          onClick={() =>
            navigate(
              "/purchase-bills"
            )
          }
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            gap:
              "7px",

            padding:
              "9px 13px",

            marginBottom:
              "20px",

            border:
              "1px solid #dbe4ef",

            borderRadius:
              "9px",

            background:
              "#ffffff",

            color:
              "#526783",

            cursor:
              "pointer",
          }}
        >
          <ArrowLeft
            size={15}
          />

          Back
        </button>


        <div
          style={{
            padding:
              "16px",

            border:
              "1px solid #fecaca",

            borderRadius:
              "10px",

            background:
              "#fff4f4",

            color:
              "#b91c1c",
          }}
        >
          {
            error
            || "Purchase Bill not found."
          }
        </div>

      </div>
    );
  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div
      style={{
        width:
          "100%",

        maxWidth:
          "1280px",

        margin:
          "0 auto",

        display:
          "flex",

        flexDirection:
          "column",

        gap:
          "18px",

        paddingBottom:
          "36px",
      }}
    >

      {/* ==========================================================
          HEADER
      ========================================================== */}

      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap:
            "20px",
        }}
      >

        <div>

          <h1
            style={{
              margin:
                0,

              color:
                "#172a4a",

              fontSize:
                "28px",

              letterSpacing:
                "-0.03em",
            }}
          >
            Purchase Bill Details
          </h1>


          <p
            style={{
              margin:
                "7px 0 0",

              color:
                "#8291a9",

              fontSize:
                "11px",
            }}
          >
            Bill {
              purchaseBill.bill_number
            } · supplier purchase
            and payment tracking
          </p>

        </div>


        <button
          type="button"
          onClick={() =>
            navigate(
              "/purchase-bills"
            )
          }
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            gap:
              "7px",

            padding:
              "9px 13px",

            border:
              "1px solid #dbe4ef",

            borderRadius:
              "9px",

            background:
              "#ffffff",

            color:
              "#526783",

            cursor:
              "pointer",
          }}
        >
          <ArrowLeft
            size={15}
          />

          Back to Purchase Bills
        </button>

      </div>


      {/* ==========================================================
          BILL INFORMATION
      ========================================================== */}

      <section
        style={{
          padding:
            "20px",

          border:
            "1px solid #dfe7f2",

          borderRadius:
            "14px",

          background:
            "#ffffff",
        }}
      >

        <SectionHeading
          title="Bill Information"
          subtitle="Purchase Bill identity and supplier credit terms"
          icon={
            <ReceiptText
              size={18}
            />
          }
        />


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",

            gap:
              "20px",

            marginTop:
              "20px",
          }}
        >

          <InfoField
            label="Purchase Bill ID"
            value={
              String(
                purchaseBill.id
              )
            }
          />

          <InfoField
            label="Bill Number"
            value={
              purchaseBill.bill_number
              || "—"
            }
          />

          <InfoField
            label="Bill Date"
            value={
              formatDate(
                purchaseBill.bill_date
              )
            }
          />

          <InfoField
            label="Supplier ID"
            value={
              String(
                purchaseBill.supplier_id
              )
            }
          />

          <InfoField
            label="Credit Days"
            value={
              paymentSummary.due_date
                ? `${paymentSummary.credit_days} days`
                : "Untracked"
            }
          />

          <InfoField
            label="Due Date"
            value={
              formatDate(
                paymentSummary.due_date
              )
            }
          />

          <InfoField
            label="Created By"
            value={
              String(
                purchaseBill.created_by
              )
            }
          />

          <InfoField
            label="Created At"
            value={
              formatDateTime(
                purchaseBill.created_at
              )
            }
          />

        </div>


        {
          paymentSummary.due_date
          === null
          && (
            <div
              style={{
                marginTop:
                  "18px",

                padding:
                  "11px 13px",

                border:
                  "1px solid #e0e7f0",

                borderRadius:
                  "9px",

                background:
                  "#f7f9fc",

                color:
                  "#72839c",

                fontSize:
                  "10px",

                lineHeight:
                  1.6,
              }}
            >
              This is a legacy Purchase Bill with
              no recorded supplier credit terms.
              Its payment state remains
              <strong>
                {" "}Untracked{" "}
              </strong>
              until payment activity or credit
              terms are recorded.
            </div>
          )
        }

      </section>


      {/* ==========================================================
          PAYMENT SUMMARY
      ========================================================== */}

      <section
        style={{
          padding:
            "20px",

          border:
            "1px solid #dfe7f2",

          borderRadius:
            "14px",

          background:
            "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap:
              "16px",
          }}
        >

          <SectionHeading
            title="Supplier Payment Summary"
            subtitle="Derived from the immutable Purchase Bill payment ledger"
            icon={
              <WalletCards
                size={18}
              />
            }
          />


          <span
            style={{
              ...getPaymentStatusStyle(
                paymentSummary.payment_status
              ),

              display:
                "inline-flex",

              alignItems:
                "center",

              padding:
                "6px 11px",

              borderRadius:
                "999px",

              fontSize:
                "10px",

              fontWeight:
                800,

              whiteSpace:
                "nowrap",
            }}
          >
            {
              paymentSummary
                .payment_status
            }
          </span>

        </div>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",

            gap:
              "14px",

            marginTop:
              "20px",
          }}
        >

          <SummaryCard
            label="Grand Total"
            value={
              formatCurrency(
                paymentSummary.grand_total
              )
            }
          />

          <SummaryCard
            label="Paid Amount"
            value={
              formatCurrency(
                paymentSummary.paid_amount
              )
            }
            variant="success"
          />

          <SummaryCard
            label="Balance Amount"
            value={
              formatCurrency(
                paymentSummary.balance_amount
              )
            }
            variant={
              outstandingBalance > 0
                ? "warning"
                : "success"
            }
          />

          <SummaryCard
            label="Payment Status"
            value={
              paymentSummary
                .payment_status
            }
            variant="primary"
          />

        </div>

      </section>


      {/* ==========================================================
          RECORD PAYMENT
      ========================================================== */}

      {
        canRecordPayment
        && !isFullyPaid
        && (
          <section
            style={{
              padding:
                "20px",

              border:
                "1px solid #dfe7f2",

              borderRadius:
                "14px",

              background:
                "#ffffff",
            }}
          >

            <SectionHeading
              title="Record Supplier Payment"
              subtitle={`Outstanding balance: ${formatCurrency(
                paymentSummary.balance_amount
              )}`}
              icon={
                <Banknote
                  size={18}
                />
              }
            />


            {
              paymentError
              && (
                <div
                  style={{
                    marginTop:
                      "16px",

                    padding:
                      "11px 13px",

                    border:
                      "1px solid #fecaca",

                    borderRadius:
                      "9px",

                    background:
                      "#fff4f4",

                    color:
                      "#b91c1c",

                    fontSize:
                      "10px",
                  }}
                >
                  {
                    paymentError
                  }
                </div>
              )
            }


            {
              paymentSuccess
              && (
                <div
                  style={{
                    marginTop:
                      "16px",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "7px",

                    padding:
                      "11px 13px",

                    border:
                      "1px solid #c7ead7",

                    borderRadius:
                      "9px",

                    background:
                      "#effaf4",

                    color:
                      "#25754e",

                    fontSize:
                      "10px",
                  }}
                >
                  <CheckCircle2
                    size={15}
                  />

                  {
                    paymentSuccess
                  }
                </div>
              )
            }


            <form
              onSubmit={
                handlePaymentSubmit
              }
            >

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",

                  gap:
                    "16px",

                  marginTop:
                    "20px",
                }}
              >

                <FormField
                  label="Payment Amount *"
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={
                      outstandingBalance
                    }
                    value={
                      paymentAmount
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setPaymentAmount(
                          event.target.value
                        )
                    }
                    placeholder="0.00"
                    required
                    style={
                      inputStyle
                    }
                  />
                </FormField>


                <FormField
                  label="Payment Date *"
                >
                  <input
                    type="datetime-local"
                    value={
                      paymentDate
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setPaymentDate(
                          event.target.value
                        )
                    }
                    required
                    style={
                      inputStyle
                    }
                  />
                </FormField>


                <FormField
                  label="Payment Mode"
                >
                  <select
                    value={
                      paymentMode
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setPaymentMode(
                          event.target.value
                        )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>

                    <option value="NEFT">
                      NEFT
                    </option>

                    <option value="RTGS">
                      RTGS
                    </option>

                    <option value="IMPS">
                      IMPS
                    </option>

                    <option value="UPI">
                      UPI
                    </option>

                    <option value="Cheque">
                      Cheque
                    </option>

                    <option value="Cash">
                      Cash
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </FormField>


                <FormField
                  label="Reference Number"
                >
                  <input
                    type="text"
                    value={
                      referenceNumber
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setReferenceNumber(
                          event.target.value
                        )
                    }
                    placeholder="Transaction / cheque reference"
                    style={
                      inputStyle
                    }
                  />
                </FormField>


                <div
                  style={{
                    gridColumn:
                      "1 / -1",
                  }}
                >
                  <FormField
                    label="Notes"
                  >
                    <textarea
                      value={
                        paymentNotes
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setPaymentNotes(
                            event.target.value
                          )
                      }
                      rows={3}
                      placeholder="Optional payment remarks"
                      style={{
                        ...inputStyle,

                        resize:
                          "vertical",
                      }}
                    />
                  </FormField>
                </div>

              </div>


              <div
                style={{
                  marginTop:
                    "18px",

                  display:
                    "flex",

                  justifyContent:
                    "flex-end",
                }}
              >

                <button
                  type="submit"
                  disabled={
                    paymentSubmitting
                  }
                  style={{
                    minWidth:
                      "150px",

                    minHeight:
                      "39px",

                    display:
                      "inline-flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    gap:
                      "8px",

                    border:
                      "none",

                    borderRadius:
                      "9px",

                    background:
                      paymentSubmitting
                        ? "#9db2d9"
                        : "#4f7fd8",

                    color:
                      "#ffffff",

                    cursor:
                      paymentSubmitting
                        ? "not-allowed"
                        : "pointer",

                    fontSize:
                      "11px",

                    fontWeight:
                      750,
                  }}
                >

                  {
                    paymentSubmitting
                      ? (
                        <>
                          <Loader2
                            size={15}
                          />

                          Recording...
                        </>
                      )
                      : (
                        <>
                          <CreditCard
                            size={15}
                          />

                          Record Payment
                        </>
                      )
                  }

                </button>

              </div>

            </form>

          </section>
        )
      }


      {/* ==========================================================
          FULLY PAID MESSAGE
      ========================================================== */}

      {
        canRecordPayment
        && isFullyPaid
        && (
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "9px",

              padding:
                "13px 15px",

              border:
                "1px solid #c8ead8",

              borderRadius:
                "11px",

              background:
                "#effaf4",

              color:
                "#277650",

              fontSize:
                "10px",
            }}
          >
            <CheckCircle2
              size={17}
            />

            This Purchase Bill has been
            fully paid. No outstanding
            supplier balance remains.
          </div>
        )
      }


      {/* ==========================================================
          PAYMENT HISTORY
      ========================================================== */}

      <section
        style={{
          overflow:
            "hidden",

          border:
            "1px solid #dfe7f2",

          borderRadius:
            "14px",

          background:
            "#ffffff",
        }}
      >

        <div
          style={{
            padding:
              "18px 20px",

            borderBottom:
              "1px solid #e9eef5",
          }}
        >

          <SectionHeading
            title="Payment History"
            subtitle={`${paymentHistory.length} recorded payment${
              paymentHistory.length === 1
                ? ""
                : "s"
            }`}
            icon={
              <Clock3
                size={18}
              />
            }
          />

        </div>


        {
          paymentHistory.length
          === 0
            ? (
              <div
                style={{
                  padding:
                    "26px 20px",

                  color:
                    "#8a9ab1",

                  fontSize:
                    "10px",
                }}
              >
                No supplier payments have
                been recorded for this bill.
              </div>
            )
            : (
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

                    minWidth:
                      "820px",

                    borderCollapse:
                      "collapse",
                  }}
                >

                  <thead>

                    <tr
                      style={{
                        background:
                          "#f8fbff",

                        color:
                          "#7587a3",

                        textAlign:
                          "left",

                        fontSize:
                          "9px",
                      }}
                    >

                      <th style={tableHeaderStyle}>
                        Payment Date
                      </th>

                      <th style={tableHeaderStyle}>
                        Amount
                      </th>

                      <th style={tableHeaderStyle}>
                        Mode
                      </th>

                      <th style={tableHeaderStyle}>
                        Reference
                      </th>

                      <th style={tableHeaderStyle}>
                        Notes
                      </th>

                      <th style={tableHeaderStyle}>
                        Recorded At
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      paymentHistory.map(
                        (
                          payment
                        ) => (
                          <tr
                            key={
                              payment.id
                            }
                            style={{
                              borderTop:
                                "1px solid #edf1f6",
                            }}
                          >

                            <td style={tableCellStyle}>
                              {
                                formatDateTime(
                                  payment.payment_date
                                )
                              }
                            </td>

                            <td
                              style={{
                                ...tableCellStyle,

                                color:
                                  "#247553",

                                fontWeight:
                                  800,
                              }}
                            >
                              {
                                formatCurrency(
                                  payment.amount
                                )
                              }
                            </td>

                            <td style={tableCellStyle}>
                              {
                                payment.payment_mode
                                || "—"
                              }
                            </td>

                            <td style={tableCellStyle}>
                              {
                                payment.reference_number
                                || "—"
                              }
                            </td>

                            <td style={tableCellStyle}>
                              {
                                payment.notes
                                || "—"
                              }
                            </td>

                            <td style={tableCellStyle}>
                              {
                                formatDateTime(
                                  payment.created_at
                                )
                              }
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

      </section>


      {/* ==========================================================
          ORIGINAL FINANCIAL SUMMARY
      ========================================================== */}

      <section
        style={{
          padding:
            "20px",

          border:
            "1px solid #dfe7f2",

          borderRadius:
            "14px",

          background:
            "#ffffff",
        }}
      >

        <SectionHeading
          title="Purchase Value"
          subtitle="Original Purchase Bill financial totals"
          icon={
            <Banknote
              size={18}
            />
          }
        />


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",

            gap:
              "14px",

            marginTop:
              "20px",
          }}
        >

          <SummaryCard
            label="Subtotal"
            value={
              formatCurrency(
                purchaseBill.subtotal
              )
            }
          />

          <SummaryCard
            label="Total GST"
            value={
              formatCurrency(
                purchaseBill.total_gst
              )
            }
          />

          <SummaryCard
            label="Grand Total"
            value={
              formatCurrency(
                purchaseBill.grand_total
              )
            }
            variant="primary"
          />

        </div>

      </section>


      {/* ==========================================================
          ITEMS
      ========================================================== */}

      <section
        style={{
          overflow:
            "hidden",

          border:
            "1px solid #dfe7f2",

          borderRadius:
            "14px",

          background:
            "#ffffff",
        }}
      >

        <div
          style={{
            padding:
              "18px 20px",

            borderBottom:
              "1px solid #e9eef5",
          }}
        >

          <SectionHeading
            title="Purchase Bill Items"
            subtitle={`${purchaseBill.items.length} item${
              purchaseBill.items.length === 1
                ? ""
                : "s"
            }`}
            icon={
              <ReceiptText
                size={18}
              />
            }
          />

        </div>


        {
          purchaseBill
            .items
            .length
          === 0
            ? (
              <div
                style={{
                  padding:
                    "26px 20px",

                  color:
                    "#8a9ab1",

                  fontSize:
                    "10px",
                }}
              >
                No items found.
              </div>
            )
            : (
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

                    minWidth:
                      "760px",

                    borderCollapse:
                      "collapse",
                  }}
                >

                  <thead>

                    <tr
                      style={{
                        background:
                          "#f8fbff",

                        color:
                          "#7587a3",

                        textAlign:
                          "left",

                        fontSize:
                          "9px",
                      }}
                    >

                      <th style={tableHeaderStyle}>
                        Item ID
                      </th>

                      <th style={tableHeaderStyle}>
                        Product ID
                      </th>

                      <th style={tableHeaderStyle}>
                        Quantity
                      </th>

                      <th style={tableHeaderStyle}>
                        Purchase Price
                      </th>

                      <th style={tableHeaderStyle}>
                        GST %
                      </th>

                      <th style={tableHeaderStyle}>
                        Line Total
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      purchaseBill
                        .items
                        .map(
                          (
                            item
                          ) => (
                            <tr
                              key={
                                item.id
                              }
                              style={{
                                borderTop:
                                  "1px solid #edf1f6",
                              }}
                            >

                              <td style={tableCellStyle}>
                                {
                                  item.id
                                }
                              </td>

                              <td style={tableCellStyle}>
                                {
                                  item.product_id
                                }
                              </td>

                              <td style={tableCellStyle}>
                                {
                                  Number(
                                    item.quantity
                                  ).toFixed(
                                    2
                                  )
                                }
                              </td>

                              <td style={tableCellStyle}>
                                {
                                  formatCurrency(
                                    item.purchase_price
                                  )
                                }
                              </td>

                              <td style={tableCellStyle}>
                                {
                                  Number(
                                    item.gst_percentage
                                  ).toFixed(
                                    2
                                  )
                                }%
                              </td>

                              <td
                                style={{
                                  ...tableCellStyle,

                                  fontWeight:
                                    750,

                                  color:
                                    "#263a59",
                                }}
                              >
                                {
                                  formatCurrency(
                                    item.line_total
                                  )
                                }
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

      </section>


      {/* ==========================================================
          REMARKS
      ========================================================== */}

      <section
        style={{
          padding:
            "20px",

          border:
            "1px solid #dfe7f2",

          borderRadius:
            "14px",

          background:
            "#ffffff",
        }}
      >

        <div
          style={{
            color:
              "#1f3555",

            fontSize:
              "12px",

            fontWeight:
              800,
          }}
        >
          Remarks
        </div>


        <div
          style={{
            marginTop:
              "12px",

            minHeight:
              "48px",

            padding:
              "12px 14px",

            border:
              "1px solid #e2e8f1",

            borderRadius:
              "9px",

            background:
              "#f9fbfd",

            color:
              "#647794",

            fontSize:
              "10px",

            lineHeight:
              1.6,
          }}
        >
          {
            purchaseBill.remarks
            || "—"
          }
        </div>

      </section>

    </div>
  );
}


/* ================================================================
   SECTION HEADING
================================================================ */

interface SectionHeadingProps {
  title: string;
  subtitle: string;
  icon:
    React.ReactNode;
}


function SectionHeading({
  title,
  subtitle,
  icon,
}: SectionHeadingProps) {

  return (
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
        style={{
          width:
            "36px",

          height:
            "36px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          flexShrink:
            0,

          borderRadius:
            "10px",

          background:
            "#edf4ff",

          color:
            "#4778ce",
        }}
      >
        {icon}
      </div>


      <div>

        <div
          style={{
            color:
              "#1f3555",

            fontSize:
              "12px",

            fontWeight:
              800,
          }}
        >
          {title}
        </div>


        <div
          style={{
            marginTop:
              "3px",

            color:
              "#91a0b5",

            fontSize:
              "9px",
          }}
        >
          {subtitle}
        </div>

      </div>

    </div>
  );
}


/* ================================================================
   INFO FIELD
================================================================ */

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
          color:
            "#8594aa",

          fontSize:
            "9px",

          fontWeight:
            650,

          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>


      <div
        style={{
          color:
            "#213553",

          fontSize:
            "10.5px",

          fontWeight:
            750,
        }}
      >
        {value}
      </div>

    </div>
  );
}


/* ================================================================
   SUMMARY CARD
================================================================ */

type SummaryVariant =
  | "default"
  | "primary"
  | "success"
  | "warning";


interface SummaryCardProps {
  label: string;
  value: string;

  variant?:
    SummaryVariant;
}


function SummaryCard({
  label,
  value,
  variant = "default",
}: SummaryCardProps) {

  const styles = {

    default: {
      background:
        "#f8fafc",

      border:
        "#e3e9f1",

      value:
        "#263a58",
    },

    primary: {
      background:
        "#f0f5ff",

      border:
        "#d6e2fb",

      value:
        "#3d68b7",
    },

    success: {
      background:
        "#effaf4",

      border:
        "#cdebd9",

      value:
        "#287651",
    },

    warning: {
      background:
        "#fff8e9",

      border:
        "#f1dfb4",

      value:
        "#9b6b13",
    },

  }[variant];


  return (
    <div
      style={{
        padding:
          "16px",

        border:
          `1px solid ${styles.border}`,

        borderRadius:
          "11px",

        background:
          styles.background,
      }}
    >

      <div
        style={{
          color:
            "#8391a6",

          fontSize:
            "9px",

          fontWeight:
            650,
        }}
      >
        {label}
      </div>


      <div
        style={{
          marginTop:
            "8px",

          color:
            styles.value,

          fontSize:
            "18px",

          fontWeight:
            850,

          letterSpacing:
            "-0.02em",
        }}
      >
        {value}
      </div>

    </div>
  );
}


/* ================================================================
   FORM FIELD
================================================================ */

interface FormFieldProps {
  label: string;
  children:
    React.ReactNode;
}


function FormField({
  label,
  children,
}: FormFieldProps) {

  return (
    <label
      style={{
        display:
          "flex",

        flexDirection:
          "column",

        gap:
          "6px",
      }}
    >

      <span
        style={{
          color:
            "#667b99",

          fontSize:
            "9px",

          fontWeight:
            700,
        }}
      >
        {label}
      </span>

      {children}

    </label>
  );
}


/* ================================================================
   SHARED STYLES
================================================================ */

const inputStyle:
  React.CSSProperties =
  {
    width:
      "100%",

    minHeight:
      "38px",

    padding:
      "9px 10px",

    border:
      "1px solid #dbe4ef",

    borderRadius:
      "8px",

    outline:
      "none",

    background:
      "#ffffff",

    color:
      "#263a58",

    fontSize:
      "10px",

    boxSizing:
      "border-box",
  };


const tableHeaderStyle:
  React.CSSProperties =
  {
    padding:
      "11px 14px",

    fontWeight:
      800,
  };


const tableCellStyle:
  React.CSSProperties =
  {
    padding:
      "12px 14px",

    color:
      "#60738f",

    fontSize:
      "9px",
  };