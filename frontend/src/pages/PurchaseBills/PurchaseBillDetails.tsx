import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
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
  Package,
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
   FORMATTERS
================================================================ */

function formatCurrency(
  value:
    MoneyValue
    | null
    | undefined
) {
  const amount =
    Number(
      value ?? 0
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
    Number.isNaN(amount)
      ? 0
      : amount
  );
}


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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}


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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


function getCurrentDateTimeInputValue() {
  const now =
    new Date();

  const offset =
    now.getTimezoneOffset();

  const local =
    new Date(
      now.getTime()
      - offset
      * 60
      * 1000
    );

  return local
    .toISOString()
    .slice(
      0,
      16
    );
}


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
      error.response
        ?.data
        ?.detail;

    if (
      typeof detail
      === "string"
    ) {
      return detail;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return fallback;
}


/* ================================================================
   STYLES
================================================================ */

const cardStyle:
  CSSProperties =
  {
    padding:
      "20px",

    border:
      "1px solid #dfe7f2",

    borderRadius:
      "14px",

    background:
      "#ffffff",
  };


const tableHeaderStyle:
  CSSProperties =
  {
    padding:
      "11px 14px",

    fontWeight:
      700,

    whiteSpace:
      "nowrap",
  };


const tableCellStyle:
  CSSProperties =
  {
    padding:
      "12px 14px",

    color:
      "#526783",

    fontSize:
      "10px",

    verticalAlign:
      "top",
  };


const inputStyle:
  CSSProperties =
  {
    width:
      "100%",

    boxSizing:
      "border-box",

    padding:
      "10px 12px",

    border:
      "1px solid #dce4ef",

    borderRadius:
      "9px",

    background:
      "#ffffff",

    color:
      "#243956",

    outline:
      "none",

    fontSize:
      "11px",
  };


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
     LOAD DATA
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
          Number(id);


        if (
          !Number.isInteger(
            purchaseBillId
          )
          || purchaseBillId
          <= 0
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
            bill,
            payment,
          ] =
            await Promise.all([
              getPurchaseBill(
                purchaseBillId
              ),

              getPurchaseBillPaymentSummary(
                purchaseBillId
              ),
            ]);


          if (active) {

            setPurchaseBill(
              bill
            );

            setPaymentSummary(
              payment
            );

          }

        } catch (
          err
        ) {

          console.error(
            "Purchase Bill details loading error:",
            err
          );


          if (active) {

            setError(
              getErrorMessage(
                err,
                "Unable to load Purchase Bill details."
              )
            );

          }

        } finally {

          if (active) {
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
     PAYMENT DERIVED VALUES
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


    const payload:
      PurchaseBillPaymentCreate =
      {
        payment_date:
          paymentDate,

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
        payload
      );


      const refreshed =
        await getPurchaseBillPaymentSummary(
          purchaseBill.id
        );


      setPaymentSummary(
        refreshed
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
            "350px",

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
            marginBottom:
              "18px",

            padding:
              "9px 13px",

            border:
              "1px solid #dbe4ef",

            borderRadius:
              "9px",

            background:
              "#ffffff",

            cursor:
              "pointer",
          }}
        >
          <ArrowLeft
            size={15}
          />

          {" "}Back
        </button>


        <div
          style={{
            padding:
              "15px",

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


  const supplierName =
    purchaseBill.supplier_name
    || `Supplier #${purchaseBill.supplier_id}`;


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
            "flex-start",

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
            }}
          >
            Purchase Bill Details
          </h1>


          <div
            style={{
              marginTop:
                "7px",

              color:
                "#526783",

              fontSize:
                "13px",

              fontWeight:
                700,
            }}
          >
            {
              purchaseBill.bill_number
            }
          </div>


          <div
            style={{
              marginTop:
                "4px",

              color:
                "#7d8ea8",

              fontSize:
                "12px",

              fontWeight:
                600,
            }}
          >
            {supplierName}
          </div>

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


      {/* ========================================================
          BILL INFORMATION
      ========================================================= */}

      <section
        style={
          cardStyle
        }
      >

        <SectionHeading
          title="Bill Information"
          subtitle="Purchase Bill identity, supplier and credit terms"
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
            label="Bill Number"
            value={
              purchaseBill.bill_number
            }
          />


          <InfoField
            label="Supplier"
            value={
              supplierName
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
              This is a legacy Purchase Bill
              with no recorded supplier credit
              terms. Its payment state remains{" "}

              <strong>
                Untracked
              </strong>

              {" "}until payment activity or
              credit terms are recorded.
            </div>
          )
        }

      </section>


      {/* ========================================================
          PAYMENT SUMMARY
      ========================================================= */}

      <section
        style={{
          ...cardStyle,

          background:
            "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",
          }}
        >

          <SectionHeading
            title="Supplier Payment Summary"
            subtitle="Derived from the Purchase Bill payment ledger"
            icon={
              <WalletCards
                size={18}
              />
            }
          />


          <PaymentBadge
            status={
              paymentSummary.payment_status
            }
          />

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
              outstandingBalance
              > 0
                ? "warning"
                : "success"
            }
          />


          <SummaryCard
            label="Payment Status"
            value={
              paymentSummary.payment_status
            }
            variant="primary"
          />

        </div>

      </section>


      {/* ========================================================
          RECORD PAYMENT
      ========================================================= */}

      {
        canRecordPayment
        && !isFullyPaid
        && (
          <section
            style={
              cardStyle
            }
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
                <MessageBox
                  type="error"
                >
                  {
                    paymentError
                  }
                </MessageBox>
              )
            }


            {
              paymentSuccess
              && (
                <MessageBox
                  type="success"
                >
                  {
                    paymentSuccess
                  }
                </MessageBox>
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
                      event =>
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
                      event =>
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
                      event =>
                        setPaymentMode(
                          event.target.value
                        )
                    }
                    style={
                      inputStyle
                    }
                  >

                    {
                      [
                        "Bank Transfer",
                        "NEFT",
                        "RTGS",
                        "IMPS",
                        "UPI",
                        "Cheque",
                        "Cash",
                        "Other",
                      ].map(
                        mode => (
                          <option
                            key={
                              mode
                            }
                            value={
                              mode
                            }
                          >
                            {mode}
                          </option>
                        )
                      )
                    }

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
                      event =>
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
                      rows={3}
                      value={
                        paymentNotes
                      }
                      onChange={
                        event =>
                          setPaymentNotes(
                            event.target.value
                          )
                      }
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
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  marginTop:
                    "18px",
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

                    display:
                      "inline-flex",

                    justifyContent:
                      "center",

                    alignItems:
                      "center",

                    gap:
                      "8px",

                    padding:
                      "11px 16px",

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


      {/* ========================================================
          FULLY PAID
      ========================================================= */}

      {
        canRecordPayment
        && isFullyPaid
        && (
          <MessageBox
            type="success"
          >
            This Purchase Bill has been fully
            paid. No outstanding supplier
            balance remains.
          </MessageBox>
        )
      }


      {/* ========================================================
          PAYMENT HISTORY
      ========================================================= */}

      <section
        style={{
          ...cardStyle,

          padding:
            0,

          overflow:
            "hidden",
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
              paymentHistory.length
              === 1
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
              <EmptyText>
                No supplier payments have been
                recorded for this bill.
              </EmptyText>
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
                      "800px",

                    borderCollapse:
                      "collapse",
                  }}
                >

                  <thead>

                    <tr
                      style={{
                        background:
                          "#f8fbff",

                        textAlign:
                          "left",

                        color:
                          "#7587a3",

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
                        payment => (
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
                                  "#267650",

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


      {/* ========================================================
          PURCHASE VALUE
      ========================================================= */}

      <section
        style={
          cardStyle
        }
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


      {/* ========================================================
          PURCHASE BILL ITEMS
      ========================================================= */}

      <section
        style={{
          ...cardStyle,

          padding:
            0,

          overflow:
            "hidden",
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
              purchaseBill.items.length
              === 1
                ? ""
                : "s"
            }`}
            icon={
              <Package
                size={18}
              />
            }
          />

        </div>


        {
          purchaseBill.items.length
          === 0
            ? (
              <EmptyText>
                No Purchase Bill items found.
              </EmptyText>
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
                      "1050px",

                    borderCollapse:
                      "collapse",
                  }}
                >

                  <thead>

                    <tr
                      style={{
                        background:
                          "#f8fbff",

                        textAlign:
                          "left",

                        color:
                          "#7587a3",

                        fontSize:
                          "9px",
                      }}
                    >

                      <th style={tableHeaderStyle}>
                        Product / Item
                      </th>

                      <th style={tableHeaderStyle}>
                        Description
                      </th>

                      <th style={tableHeaderStyle}>
                        HSN
                      </th>

                      <th style={tableHeaderStyle}>
                        Unit
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
                      purchaseBill.items.map(
                        item => (
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

                              <div
                                style={{
                                  color:
                                    "#203654",

                                  fontWeight:
                                    800,

                                  fontSize:
                                    "11px",
                                }}
                              >
                                {
                                  item.product_name
                                  || `Product #${item.product_id}`
                                }
                              </div>

                            </td>


                            <td
                              style={{
                                ...tableCellStyle,

                                maxWidth:
                                  "260px",

                                lineHeight:
                                  1.5,
                              }}
                            >
                              {
                                item.description
                                || "—"
                              }
                            </td>


                            <td style={tableCellStyle}>
                              {
                                item.hsn_code
                                || "—"
                              }
                            </td>


                            <td style={tableCellStyle}>
                              {
                                item.unit
                                || "—"
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

                                color:
                                  "#263a59",

                                fontWeight:
                                  800,
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


      {/* ========================================================
          REMARKS
      ========================================================= */}

      <section
        style={
          cardStyle
        }
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
   COMPONENTS
================================================================ */

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {

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


function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

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
            "11px",

          fontWeight:
            750,
        }}
      >
        {value}
      </div>

    </div>
  );
}


function SummaryCard({
  label,
  value,
  variant =
    "default",
}: {
  label: string;
  value: string;
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning";
}) {

  const variants = {
    default: {
      background:
        "#f8fafc",

      border:
        "#e3e9f1",

      color:
        "#243955",
    },

    primary: {
      background:
        "#eef4ff",

      border:
        "#d4e1fa",

      color:
        "#3f67b8",
    },

    success: {
      background:
        "#eff9f3",

      border:
        "#ccebd9",

      color:
        "#267650",
    },

    warning: {
      background:
        "#fff8e9",

      border:
        "#f1dfb6",

      color:
        "#99670d",
    },
  };


  const style =
    variants[
      variant
    ];


  return (
    <div
      style={{
        padding:
          "18px 16px",

        border:
          `1px solid ${style.border}`,

        borderRadius:
          "11px",

        background:
          style.background,
      }}
    >

      <div
        style={{
          color:
            "#8594aa",

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
            style.color,

          fontSize:
            "19px",

          fontWeight:
            850,
        }}
      >
        {value}
      </div>

    </div>
  );
}


function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {

  return (
    <label>

      <div
        style={{
          marginBottom:
            "6px",

          color:
            "#60728f",

          fontSize:
            "9px",

          fontWeight:
            700,
        }}
      >
        {label}
      </div>

      {children}

    </label>
  );
}


function EmptyText({
  children,
}: {
  children: ReactNode;
}) {

  return (
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
      {children}
    </div>
  );
}


function MessageBox({
  type,
  children,
}: {
  type:
    | "success"
    | "error";

  children:
    ReactNode;
}) {

  const success =
    type === "success";


  return (
    <div
      style={{
        marginTop:
          "14px",

        display:
          "flex",

        alignItems:
          "center",

        gap:
          "8px",

        padding:
          "12px 14px",

        border:
          success
            ? "1px solid #c8ead8"
            : "1px solid #fecaca",

        borderRadius:
          "10px",

        background:
          success
            ? "#effaf4"
            : "#fff4f4",

        color:
          success
            ? "#277650"
            : "#b91c1c",

        fontSize:
          "10px",
      }}
    >

      {
        success
        && (
          <CheckCircle2
            size={16}
          />
        )
      }

      {children}

    </div>
  );
}


function PaymentBadge({
  status,
}: {
  status: string;
}) {

  let background =
    "#eef3f8";

  let color =
    "#60728e";

  let border =
    "#dbe4ef";


  if (
    status === "Paid"
  ) {
    background =
      "#eaf8f0";

    color =
      "#267650";

    border =
      "#c8ecd8";
  }


  if (
    status === "Partially Paid"
  ) {
    background =
      "#fff6df";

    color =
      "#9b6d13";

    border =
      "#f3dfac";
  }


  if (
    status === "Unpaid"
  ) {
    background =
      "#fff0f3";

    color =
      "#b8415a";

    border =
      "#f5ccd5";
  }


  return (
    <span
      style={{
        display:
          "inline-flex",

        padding:
          "6px 11px",

        border:
          `1px solid ${border}`,

        borderRadius:
          "999px",

        background,

        color,

        fontSize:
          "10px",

        fontWeight:
          800,
      }}
    >
      {status}
    </span>
  );
}