import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import axios from "axios";

import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import "./RepeatPaymentsCard.css";

import {
  getOverheadRepeatPaymentPreview,
  getRecurringPaymentHistory,
  getStaffRepeatPaymentPreview,
  recordOverheadRepeatPayments,
  recordStaffRepeatPayments,
} from "../../services/recurringPaymentService";

import type {
  RecurringPayment,
  RecurringPaymentKind,
  RepeatPaymentPreview,
} from "../../types/recurringPayment";


interface RepeatPaymentsCardProps {
  kind:
    RecurringPaymentKind;

  canManage: boolean;

  pageSize: number;
}


function todayValue() {
  return (
    new Date()
      .toISOString()
      .slice(
        0,
        10
      )
  );
}


function currentMonthValue() {
  return (
    todayValue()
      .slice(
        0,
        7
      )
  );
}


function formatCurrency(
  value:
    string | number
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

    return (
      `₹${value}`
    );

  }


  return (
    new Intl.NumberFormat(
      "en-IN",
      {
        style:
          "currency",

        currency:
          "INR",

        maximumFractionDigits:
          2,
      }
    )
      .format(
        numericValue
      )
  );
}


function formatDate(
  value:
    string | null | undefined
) {

  if (
    !value
  ) {

    return "—";

  }


  const parsed =
    new Date(
      `${value}T00:00:00`
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return value;

  }


  return (
    parsed.toLocaleDateString(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      }
    )
  );
}


function formatPeriod(
  value:
    string | null | undefined
) {

  if (
    !value
  ) {

    return "—";

  }


  const parsed =
    new Date(
      `${value}T00:00:00`
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return value;

  }


  return (
    parsed.toLocaleDateString(
      "en-IN",
      {
        month:
          "short",

        year:
          "numeric",
      }
    )
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
      === "string"
    ) {

      return detail;

    }


    if (
      Array.isArray(
        detail
      )
    ) {

      const messages =
        detail
          .map(
            item => {

              if (
                item
                &&
                typeof item
                === "object"
                &&
                "msg" in item
                &&
                typeof item.msg
                === "string"
              ) {

                return item.msg;

              }

              return null;

            }
          )
          .filter(
            (
              item
            ):
            item is string =>
              Boolean(
                item
              )
          );


      if (
        messages.length
      ) {

        return (
          messages.join(
            " "
          )
        );

      }

    }

  }


  if (
    error instanceof Error
    &&
    error.message
  ) {

    return (
      error.message
    );

  }


  return fallback;
}


export default function RepeatPaymentsCard({
  kind,
  canManage,
  pageSize,
}: RepeatPaymentsCardProps) {

  const isStaff =
    kind
    === "STAFF_SALARY";


  const actionLabel =
    isStaff
      ? "Repeat Salary Payments"
      : "Repeat Overhead Payments";


  const historyTitle =
    isStaff
      ? "Salary Payment History"
      : "Overhead Payment History";


  const sourceHeading =
    isStaff
      ? "Staff"
      : "Overhead";


  const selectedNoun =
    isStaff
      ? "salary payments"
      : "overhead payments";


  const [
    history,
    setHistory,
  ] =
    useState<
      RecurringPayment[]
    >(
      []
    );


  const [
    historyPage,
    setHistoryPage,
  ] =
    useState(
      1
    );


  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(
      true
    );


  const [
    historyError,
    setHistoryError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(
      false
    );


  const [
    salaryMonth,
    setSalaryMonth,
  ] =
    useState(
      currentMonthValue()
    );


  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      todayValue()
    );


  const [
    preview,
    setPreview,
  ] =
    useState<
      RepeatPaymentPreview | null
    >(
      null
    );


  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      number[]
    >(
      []
    );


  const [
    previewLoading,
    setPreviewLoading,
  ] =
    useState(
      false
    );


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );


  const [
    modalError,
    setModalError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    paymentMode,
    setPaymentMode,
  ] =
    useState(
      ""
    );


  const [
    referenceNumber,
    setReferenceNumber,
  ] =
    useState(
      ""
    );


  const [
    notes,
    setNotes,
  ] =
    useState(
      ""
    );


  const safePageSize = Math.max(1, pageSize);
  const historyTotalPages = Math.max(1, Math.ceil(history.length / safePageSize));
  const safeHistoryPage = Math.min(Math.max(1, historyPage), historyTotalPages);

  const paginatedHistory =
    useMemo(
      () => {
        const startIndex = (safeHistoryPage - 1) * safePageSize;
        return history.slice(startIndex, startIndex + safePageSize);
      },
      [history, safeHistoryPage, safePageSize]
    );


  useEffect(
    () => {
      if (historyPage !== safeHistoryPage) {
        setHistoryPage(safeHistoryPage);
      }
    },
    [historyPage, safeHistoryPage]
  );


  useEffect(
    () => {
      setHistoryPage(1);
    },
    [kind, pageSize]
  );


  async function loadHistory() {

    try {

      setHistoryLoading(
        true
      );


      setHistoryError(
        null
      );


      const result =
        await getRecurringPaymentHistory({
          payment_kind:
            kind,
        });


      setHistory(
        result.items
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setHistoryError(
        getApiErrorMessage(
          error,
          "Unable to load payment history."
        )
      );

    } finally {

      setHistoryLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadHistory();

    },
    [
      kind,
    ]
  );


  async function loadPreview(
    dateValue:
      string = paymentDate,
    monthValue:
      string = salaryMonth
  ) {

    if (
      !dateValue
    ) {

      setModalError(
        "Payment date is required."
      );

      return;

    }


    if (
      isStaff
      &&
      !monthValue
    ) {

      setModalError(
        "Salary month is required."
      );

      return;

    }


    try {

      setPreviewLoading(
        true
      );


      setModalError(
        null
      );


      const result =
        isStaff
          ? await getStaffRepeatPaymentPreview(
              `${monthValue}-01`,
              dateValue
            )
          : await getOverheadRepeatPaymentPreview(
              dateValue
            );


      setPreview(
        result
      );


      setSelectedIds(
        result
          .items
          .filter(
            item =>
              !item.already_paid
          )
          .map(
            item =>
              item.source_id
          )
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setPreview(
        null
      );


      setSelectedIds(
        []
      );


      setModalError(
        getApiErrorMessage(
          error,
          isStaff
            ? "Unable to preview salary payments."
            : "Unable to preview overhead payments."
        )
      );

    } finally {

      setPreviewLoading(
        false
      );

    }

  }

  function openModal() {

    if (
      !canManage
    ) {

      return;

    }


    const dateValue =
      todayValue();

    const monthValue =
      currentMonthValue();


    setSalaryMonth(
      monthValue
    );


    setPaymentDate(
      dateValue
    );


    setPreview(
      null
    );


    setSelectedIds(
      []
    );


    setPaymentMode(
      ""
    );


    setReferenceNumber(
      ""
    );


    setNotes(
      ""
    );


    setModalError(
      null
    );


    setSuccessMessage(
      null
    );


    setModalOpen(
      true
    );


    void loadPreview(
      dateValue,
      monthValue
    );

  }


  function closeModal() {

    if (
      saving
    ) {

      return;

    }


    setModalOpen(
      false
    );


    setModalError(
      null
    );

  }


  function handleSalaryMonthChange(
    value: string
  ) {

    setSalaryMonth(
      value
    );


    setPreview(
      null
    );


    setSelectedIds(
      []
    );


    setModalError(
      null
    );

  }


  function handlePaymentDateChange(
    value: string
  ) {

    setPaymentDate(
      value
    );


    setPreview(
      null
    );


    setSelectedIds(
      []
    );


    setModalError(
      null
    );

  }


  const unpaidItems =
    useMemo(
      () =>
        preview
          ?.items
          .filter(
            item =>
              !item.already_paid
          )
        ??
        [],
      [
        preview,
      ]
    );


  const selectedTotal =
    useMemo(
      () => {

        if (
          !preview
        ) {

          return 0;

        }


        const selectedSet =
          new Set(
            selectedIds
          );


        return (
          preview
            .items
            .reduce(
              (
                total,
                item
              ) => {

                if (
                  item.already_paid
                  ||
                  !selectedSet.has(
                    item.source_id
                  )
                ) {

                  return total;

                }


                return (
                  total
                  +
                  Number(
                    item.amount
                  )
                );

              },
              0
            )
        );

      },
      [
        preview,
        selectedIds,
      ]
    );


  const allUnpaidSelected =
    unpaidItems.length
    > 0
    &&
    selectedIds.length
    === unpaidItems.length;


  function toggleSelectAll() {

    if (
      allUnpaidSelected
    ) {

      setSelectedIds(
        []
      );

      return;

    }


    setSelectedIds(
      unpaidItems.map(
        item =>
          item.source_id
      )
    );

  }


  function toggleItem(
    sourceId: number
  ) {

    setSelectedIds(
      previous => {

        if (
          previous.includes(
            sourceId
          )
        ) {

          return (
            previous.filter(
              id =>
                id
                !== sourceId
            )
          );

        }


        return [
          ...previous,
          sourceId,
        ];

      }
    );

  }


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    if (
      selectedIds.length
      === 0
    ) {

      setModalError(
        `Select at least one ${selectedNoun.slice(0, -1)}.`
      );

      return;

    }


    try {

      setSaving(
        true
      );


      setModalError(
        null
      );


      const commonPayload = {
        payment_date:
          paymentDate,

        payment_mode:
          paymentMode
            .trim()
          || null,

        reference_number:
          referenceNumber
            .trim()
          || null,

        notes:
          notes
            .trim()
          || null,
      };


      const result =
        isStaff
          ? await recordStaffRepeatPayments({
              ...commonPayload,

              period_start:
                `${salaryMonth}-01`,

              staff_ids:
                selectedIds,
            })
          : await recordOverheadRepeatPayments({
              ...commonPayload,

              expense_ids:
                selectedIds,
            });


      setSuccessMessage(
        `${result.created_count} ${
          isStaff
            ? "salary payment"
            : "overhead payment"
        }${
          result.created_count
          === 1
            ? ""
            : "s"
        } recorded for ${formatPeriod(
          result.period_start
        )}. Total ${formatCurrency(
          result.total_amount
        )}.`
      );


      setHistoryPage(
        1
      );


      await loadHistory();


      setModalOpen(
        false
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setModalError(
        getApiErrorMessage(
          error,
          isStaff
            ? "Unable to record salary payments."
            : "Unable to record overhead payments."
        )
      );


      /*
       * Refresh the preview after a failed submit.
       * This is useful when the backend rejects a stale preview
       * because one of the selected sources was already paid.
       */
      try {

        const refreshedPreview =
          isStaff
            ? await getStaffRepeatPaymentPreview(
                `${salaryMonth}-01`,
                paymentDate
              )
            : await getOverheadRepeatPaymentPreview(
                paymentDate
              );


        setPreview(
          refreshedPreview
        );


        setSelectedIds(
          refreshedPreview
            .items
            .filter(
              item =>
                !item.already_paid
            )
            .map(
              item =>
                item.source_id
            )
        );

      } catch (
        previewError
      ) {

        console.error(
          previewError
        );

      }

    } finally {

      setSaving(
        false
      );

    }

  }


  return (
    <div className="expense-repeat-card">

      <div className="expense-repeat-card-header">

        <div>

          <div className="expense-repeat-card-title">
            {historyTitle}
          </div>


          <div className="expense-repeat-card-subtitle">

            Actual payment/debit history only.
            These records do not create another
            Expense cost row.

          </div>

        </div>


        <div className="expense-repeat-card-actions">

          <button
            type="button"
            className="expense-repeat-refresh-button"
            onClick={() =>
              void loadHistory()
            }
            disabled={
              historyLoading
            }
          >

            <RefreshCw
              size={14}
              className={
                historyLoading
                  ? "expense-repeat-spin"
                  : ""
              }
            />

            Refresh History

          </button>


          {
            canManage
            && (
              <button
                type="button"
                className="expense-repeat-primary-button"
                onClick={
                  openModal
                }
              >

                <CalendarDays
                  size={15}
                />

                {actionLabel}

              </button>
            )
          }

        </div>

      </div>


      {
        successMessage
        && (
          <div className="expense-repeat-success">

            <CheckCircle2
              size={16}
            />

            <span>
              {successMessage}
            </span>

          </div>
        )
      }


      {
        historyError
        && (
          <div className="expense-repeat-error">
            {historyError}
          </div>
        )
      }


      {
        historyLoading
          ? (
              <div className="expense-repeat-loading">

                <Loader2
                  size={18}
                  className="expense-repeat-spin"
                />

                Loading payment history...

              </div>
            )
          : history.length
            === 0
            ? (
                <div className="expense-repeat-empty">
                  No repeat payments recorded yet.
                </div>
              )
            : (
                <>
                  <div className="expense-repeat-history-wrap">

                  <table className="expense-repeat-table">

                    <thead>
                      <tr>

                        <th>
                          {sourceHeading}
                        </th>

                        <th>
                          Period
                        </th>

                        <th>
                          Payment Date
                        </th>

                        <th>
                          Mode
                        </th>

                        <th>
                          Reference
                        </th>

                        <th>
                          Amount
                        </th>

                        <th>
                          Notes
                        </th>

                      </tr>
                    </thead>


                    <tbody>

                      {
                        paginatedHistory.map(
                          payment => (

                            <tr
                              key={
                                payment.id
                              }
                            >

                              <td>

                                <div className="expense-repeat-source-name">
                                  {
                                    payment
                                      .source_name
                                  }
                                </div>

                                {
                                  payment.category
                                  && (
                                    <div className="expense-repeat-secondary">
                                      {
                                        payment
                                          .category
                                      }
                                    </div>
                                  )
                                }

                              </td>


                              <td>
                                {
                                  formatPeriod(
                                    payment
                                      .period_start
                                  )
                                }
                              </td>


                              <td>
                                {
                                  formatDate(
                                    payment
                                      .payment_date
                                  )
                                }
                              </td>


                              <td>
                                {
                                  payment
                                    .payment_mode
                                  || "—"
                                }
                              </td>


                              <td>
                                {
                                  payment
                                    .reference_number
                                  || "—"
                                }
                              </td>


                              <td>

                                <strong className="expense-repeat-money">
                                  {
                                    formatCurrency(
                                      payment.amount
                                    )
                                  }
                                </strong>

                              </td>


                              <td>

                                <span className="expense-repeat-notes">
                                  {
                                    payment.notes
                                    || "—"
                                  }
                                </span>

                              </td>

                            </tr>

                          )
                        )
                      }

                    </tbody>

                  </table>

                </div>


                <div className="expense-repeat-pagination">

                  <div className="expense-repeat-pagination-summary">
                    Showing <strong>{((safeHistoryPage - 1) * safePageSize) + 1}</strong>–<strong>{Math.min(safeHistoryPage * safePageSize, history.length)}</strong> of <strong>{history.length}</strong>
                  </div>

                  <div className="expense-repeat-pagination-actions">
                    <button
                      type="button"
                      disabled={safeHistoryPage <= 1}
                      onClick={() => setHistoryPage(safeHistoryPage - 1)}
                    >
                      Previous
                    </button>

                    <span>
                      Page <strong>{safeHistoryPage}</strong> of <strong>{historyTotalPages}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={safeHistoryPage >= historyTotalPages}
                      onClick={() => setHistoryPage(safeHistoryPage + 1)}
                    >
                      Next
                    </button>
                  </div>

                </div>
                </>
              )
      }


      {
        modalOpen
        && (
          <div className="expense-repeat-modal-backdrop">

            <div className="expense-repeat-modal">

              <div className="expense-repeat-modal-header">

                <div>

                  <div className="expense-repeat-modal-eyebrow">
                    MONTHLY PAYMENT BATCH
                  </div>


                  <div className="expense-repeat-modal-title">
                    {actionLabel}
                  </div>


                  <div className="expense-repeat-modal-subtitle">

                    {
                      isStaff
                        ? "Choose the salary month separately from the actual payment date. This lets an older unpaid salary be paid later while preserving the correct month."
                        : "Choose the actual payment date, preview the historical amount applicable to that period, deselect anything you do not want to pay, then record the selected batch."
                    }

                  </div>

                </div>


                <button
                  type="button"
                  className="expense-repeat-modal-close"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                  aria-label="Close repeat payment modal"
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <form
                onSubmit={
                  handleSubmit
                }
              >

                <div className="expense-repeat-date-row">

                  {
                    isStaff
                    && (
                      <label className="expense-repeat-field">

                        <span>
                          Salary Month *
                        </span>

                        <input
                          type="month"
                          required
                          value={
                            salaryMonth
                          }
                          onChange={
                            event =>
                              handleSalaryMonthChange(
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </label>
                    )
                  }


                  <label className="expense-repeat-field">

                    <span>
                      Payment Date *
                    </span>

                    <input
                      type="date"
                      required
                      value={
                        paymentDate
                      }
                      onChange={
                        event =>
                          handlePaymentDateChange(
                            event
                              .target
                              .value
                          )
                      }
                    />

                  </label>


                  <button
                    type="button"
                    className="expense-repeat-preview-button"
                    onClick={() =>
                      void loadPreview()
                    }
                    disabled={
                      previewLoading
                      ||
                      !paymentDate
                      ||
                      (
                        isStaff
                        &&
                        !salaryMonth
                      )
                    }
                  >

                    {
                      previewLoading
                        ? (
                            <Loader2
                              size={15}
                              className="expense-repeat-spin"
                            />
                          )
                        : (
                            <RefreshCw
                              size={15}
                            />
                          )
                    }

                    Preview Payments

                  </button>

                </div>


                {
                  modalError
                  && (
                    <div className="expense-repeat-error expense-repeat-modal-message">
                      {modalError}
                    </div>
                  )
                }


                {
                  previewLoading
                  && !preview
                    ? (
                        <div className="expense-repeat-loading expense-repeat-preview-loading">

                          <Loader2
                            size={18}
                            className="expense-repeat-spin"
                          />

                          Loading eligible payments...

                        </div>
                      )
                    : preview
                      ? (
                          <>

                            <div className="expense-repeat-preview-summary">

                              <div>

                                <span>
                                  Period
                                </span>

                                <strong>
                                  {
                                    formatPeriod(
                                      preview
                                        .period_start
                                    )
                                  }
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Eligible
                                </span>

                                <strong>
                                  {
                                    preview
                                      .total_items
                                  }
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Unpaid
                                </span>

                                <strong>
                                  {
                                    preview
                                      .unpaid_items
                                  }
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Already Paid
                                </span>

                                <strong>
                                  {
                                    preview
                                      .already_paid_items
                                  }
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Unpaid Total
                                </span>

                                <strong>
                                  {
                                    formatCurrency(
                                      preview
                                        .total_unpaid_amount
                                    )
                                  }
                                </strong>

                              </div>

                            </div>


                            <div className="expense-repeat-selection-toolbar">

                              <label className="expense-repeat-select-all">

                                <input
                                  type="checkbox"
                                  checked={
                                    allUnpaidSelected
                                  }
                                  onChange={
                                    toggleSelectAll
                                  }
                                  disabled={
                                    unpaidItems.length
                                    === 0
                                  }
                                />

                                <span>
                                  Select all unpaid
                                </span>

                              </label>


                              <div className="expense-repeat-selected-total">

                                <span>
                                  Selected
                                </span>

                                <strong>
                                  {
                                    formatCurrency(
                                      selectedTotal
                                    )
                                  }
                                </strong>

                              </div>

                            </div>


                            {
                              preview.items.length
                              === 0
                                ? (
                                    <div className="expense-repeat-empty expense-repeat-preview-empty">

                                      No eligible {
                                        isStaff
                                          ? "staff salary"
                                          : "recurring overhead"
                                      } payments exist for this date.

                                    </div>
                                  )
                                : (
                                    <div className="expense-repeat-preview-wrap">

                                      <table className="expense-repeat-table expense-repeat-preview-table">

                                        <thead>
                                          <tr>

                                            <th className="expense-repeat-check-column">
                                              Pay
                                            </th>

                                            <th>
                                              {sourceHeading}
                                            </th>

                                            <th>
                                              Detail
                                            </th>

                                            <th>
                                              Amount
                                            </th>

                                            <th>
                                              Status
                                            </th>

                                          </tr>
                                        </thead>


                                        <tbody>

                                          {
                                            preview
                                              .items
                                              .map(
                                                item => {

                                                  const checked =
                                                    selectedIds
                                                      .includes(
                                                        item.source_id
                                                      );


                                                  return (

                                                    <tr
                                                      key={
                                                        item.source_id
                                                      }
                                                      className={
                                                        item.already_paid
                                                          ? "expense-repeat-row-paid"
                                                          : ""
                                                      }
                                                    >

                                                      <td className="expense-repeat-check-column">

                                                        <input
                                                          type="checkbox"
                                                          checked={
                                                            item.already_paid
                                                              ? false
                                                              : checked
                                                          }
                                                          disabled={
                                                            item.already_paid
                                                          }
                                                          onChange={() =>
                                                            toggleItem(
                                                              item.source_id
                                                            )
                                                          }
                                                          aria-label={`Select ${item.source_name}`}
                                                        />

                                                      </td>


                                                      <td>

                                                        <div className="expense-repeat-source-name">
                                                          {
                                                            item
                                                              .source_name
                                                          }
                                                        </div>

                                                        {
                                                          item.category
                                                          && (
                                                            <div className="expense-repeat-secondary">
                                                              {
                                                                item
                                                                  .category
                                                              }
                                                            </div>
                                                          )
                                                        }

                                                      </td>


                                                      <td>
                                                        {
                                                          item
                                                            .secondary_text
                                                          || "—"
                                                        }
                                                      </td>


                                                      <td>

                                                        <strong className="expense-repeat-money">
                                                          {
                                                            formatCurrency(
                                                              item.amount
                                                            )
                                                          }
                                                        </strong>

                                                      </td>


                                                      <td>

                                                        {
                                                          item.already_paid
                                                            ? (
                                                                <span className="expense-repeat-paid-badge">
                                                                  Already paid
                                                                  {
                                                                    item
                                                                      .existing_payment_date
                                                                    ? ` • ${formatDate(
                                                                        item
                                                                          .existing_payment_date
                                                                      )}`
                                                                    : ""
                                                                  }
                                                                </span>
                                                              )
                                                            : (
                                                                <span className="expense-repeat-unpaid-badge">
                                                                  Ready
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


                            <div className="expense-repeat-form-grid">

                              <label className="expense-repeat-field">

                                <span>
                                  Payment Mode
                                </span>

                                <input
                                  type="text"
                                  value={
                                    paymentMode
                                  }
                                  onChange={
                                    event =>
                                      setPaymentMode(
                                        event
                                          .target
                                          .value
                                      )
                                  }
                                  placeholder="Cash / UPI / Bank Transfer / Cheque"
                                  maxLength={50}
                                />

                              </label>


                              <label className="expense-repeat-field">

                                <span>
                                  Reference Number
                                </span>

                                <input
                                  type="text"
                                  value={
                                    referenceNumber
                                  }
                                  onChange={
                                    event =>
                                      setReferenceNumber(
                                        event
                                          .target
                                          .value
                                      )
                                  }
                                  placeholder="Transaction / cheque / voucher reference"
                                  maxLength={100}
                                />

                              </label>


                              <label className="expense-repeat-field expense-repeat-field-wide">

                                <span>
                                  Notes
                                </span>

                                <textarea
                                  rows={3}
                                  value={
                                    notes
                                  }
                                  onChange={
                                    event =>
                                      setNotes(
                                        event
                                          .target
                                          .value
                                      )
                                  }
                                  placeholder="Optional notes for this payment batch"
                                />

                              </label>

                            </div>

                          </>
                        )
                      : (
                          <div className="expense-repeat-empty expense-repeat-preview-empty">

                            Choose a payment date and click
                            Preview Payments.

                          </div>
                        )
                }


                <div className="expense-repeat-modal-actions">

                  <button
                    type="button"
                    className="expense-repeat-cancel-button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="expense-repeat-submit-button"
                    disabled={
                      saving
                      ||
                      !preview
                      ||
                      selectedIds.length
                      === 0
                    }
                  >

                    {
                      saving
                      && (
                        <Loader2
                          size={15}
                          className="expense-repeat-spin"
                        />
                      )
                    }

                    {
                      isStaff
                        ? "Record Selected Salaries"
                        : "Record Selected Overheads"
                    }

                  </button>

                </div>

              </form>

            </div>

          </div>
        )
      }

    </div>
  );
}
