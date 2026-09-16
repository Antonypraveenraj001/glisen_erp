import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import axios from "axios";
  
  import {
    CalendarDays,
    CircleDollarSign,
    Edit3,
    Filter,
    Loader2,
    Plus,
    ReceiptText,
    Search,
    Trash2,
    WalletCards,
    X,
  } from "lucide-react";
  
  import "./ExpensePage.css";
  
  import {
    createExpense,
    deleteExpense,
    getExpenses,
    updateExpense,
  } from "../../services/expenseService";
  
  import {
    EXPENSE_CATEGORIES,
  } from "../../types/expense";
  
  import type {
    Expense,
    ExpenseCategory,
    ExpenseCreatePayload,
    ExpenseUpdatePayload,
  } from "../../types/expense";
  
  
  const EMPTY_FORM = {
    expense_date: "",
    category: "" as ExpenseCategory | "",
    description: "",
    amount: "",
    payment_mode: "",
    reference_number: "",
    vendor_name: "",
    notes: "",
  };
  
  
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
  
  
  function formatDate(
    value: string
  ) {
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
  
  
  function getApiErrorMessage(
    error: unknown,
    fallback: string
  ) {
    if (
      axios.isAxiosError(error)
    ) {
      const detail =
        error.response?.data?.detail;
  
      if (
        typeof detail === "string"
      ) {
        return detail;
      }
    }
  
    return fallback;
  }
  
  
  export default function ExpensePage() {
    const [
      expenses,
      setExpenses,
    ] =
      useState<Expense[]>([]);
  
    const [
      total,
      setTotal,
    ] =
      useState(0);
  
    const [
      search,
      setSearch,
    ] =
      useState("");
  
    const [
      category,
      setCategory,
    ] =
      useState<
        ExpenseCategory | ""
      >("");
  
    const [
      startDate,
      setStartDate,
    ] =
      useState("");
  
    const [
      endDate,
      setEndDate,
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
      useState<string | null>(
        null
      );
  
    const [
      modalOpen,
      setModalOpen,
    ] =
      useState(false);
  
    const [
      editingExpense,
      setEditingExpense,
    ] =
      useState<Expense | null>(
        null
      );
  
    const [
      form,
      setForm,
    ] =
      useState(
        EMPTY_FORM
      );
  
    const [
      saving,
      setSaving,
    ] =
      useState(false);
  
    const [
      deletingId,
      setDeletingId,
    ] =
      useState<number | null>(
        null
      );
  
  
    async function loadExpenses(
      override?: {
        search?: string;
        category?: ExpenseCategory | "";
        startDate?: string;
        endDate?: string;
      }
    ) {
      try {
        setLoading(true);
        setError(null);
  
        const data =
          await getExpenses({
            search:
              override?.search ??
              search,
  
            category:
              override?.category ??
              category,
  
            start_date:
              override?.startDate ??
              startDate,
  
            end_date:
              override?.endDate ??
              endDate,
          });
  
        setExpenses(
          data.items
        );
  
        setTotal(
          data.total
        );
      } catch (err) {
        console.error(err);
  
        setError(
          getApiErrorMessage(
            err,
            "Unable to load expenses."
          )
        );
      } finally {
        setLoading(false);
      }
    }
  
  
    useEffect(() => {
      void loadExpenses({
        search: "",
        category: "",
        startDate: "",
        endDate: "",
      });
      // Initial load only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
  
    const totalExpenseValue =
      useMemo(
        () =>
          expenses.reduce(
            (
              sum,
              expense
            ) =>
              sum +
              Number(
                expense.amount
              ),
            0
          ),
        [expenses]
      );
  
  
    const categoryCount =
      useMemo(
        () =>
          new Set(
            expenses.map(
              (expense) =>
                expense.category
            )
          ).size,
        [expenses]
      );
  
  
    const latestExpense =
      useMemo(
        () => {
          if (
            expenses.length === 0
          ) {
            return null;
          }
  
          return [...expenses]
            .sort(
              (
                first,
                second
              ) =>
                new Date(
                  second.expense_date
                ).getTime() -
                new Date(
                  first.expense_date
                ).getTime()
            )[0];
        },
        [expenses]
      );
  
  
    function openCreateModal() {
      setEditingExpense(
        null
      );
  
      setForm({
        ...EMPTY_FORM,
        expense_date:
          new Date()
            .toISOString()
            .slice(0, 10),
      });
  
      setError(null);
  
      setModalOpen(true);
    }
  
  
    function openEditModal(
      expense: Expense
    ) {
      setEditingExpense(
        expense
      );
  
      setForm({
        expense_date:
          expense.expense_date,
  
        category:
          expense.category,
  
        description:
          expense.description,
  
        amount:
          expense.amount,
  
        payment_mode:
          expense.payment_mode ??
          "",
  
        reference_number:
          expense.reference_number ??
          "",
  
        vendor_name:
          expense.vendor_name ??
          "",
  
        notes:
          expense.notes ??
          "",
      });
  
      setError(null);
  
      setModalOpen(true);
    }
  
  
    function closeModal() {
      if (saving) {
        return;
      }
  
      setModalOpen(false);
  
      setEditingExpense(
        null
      );
  
      setForm(
        EMPTY_FORM
      );
    }
  
  
    async function handleSubmit(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      if (
        !form.expense_date ||
        !form.category ||
        !form.description.trim() ||
        !form.amount
      ) {
        setError(
          "Expense date, category, description, and amount are required."
        );
  
        return;
      }
  
      const numericAmount =
        Number(
          form.amount
        );
  
      if (
        Number.isNaN(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Amount must be greater than zero."
        );
  
        return;
      }
  
      try {
        setSaving(true);
        setError(null);
  
        if (
          editingExpense
        ) {
          const payload:
          ExpenseUpdatePayload = {
            expense_date:
              form.expense_date,
  
            category:
              form.category,
  
            description:
              form.description.trim(),
  
            amount:
              numericAmount,
  
            payment_mode:
              form.payment_mode.trim() ||
              null,
  
            reference_number:
              form.reference_number.trim() ||
              null,
  
            vendor_name:
              form.vendor_name.trim() ||
              null,
  
            notes:
              form.notes.trim() ||
              null,
          };
  
          await updateExpense(
            editingExpense.id,
            payload
          );
        } else {
          const payload:
          ExpenseCreatePayload = {
            expense_date:
              form.expense_date,
  
            category:
              form.category,
  
            description:
              form.description.trim(),
  
            amount:
              numericAmount,
  
            payment_mode:
              form.payment_mode.trim() ||
              null,
  
            reference_number:
              form.reference_number.trim() ||
              null,
  
            vendor_name:
              form.vendor_name.trim() ||
              null,
  
            notes:
              form.notes.trim() ||
              null,
          };
  
          await createExpense(
            payload
          );
        }
  
        closeModal();
  
        await loadExpenses();
      } catch (err) {
        console.error(err);
  
        setError(
          getApiErrorMessage(
            err,
            editingExpense
              ? "Unable to update expense."
              : "Unable to create expense."
          )
        );
      } finally {
        setSaving(false);
      }
    }
  
  
    async function handleDelete(
      expense: Expense
    ) {
      const confirmed =
        window.confirm(
          `Delete expense "${expense.description}"?`
        );
  
      if (!confirmed) {
        return;
      }
  
      try {
        setDeletingId(
          expense.id
        );
  
        setError(null);
  
        await deleteExpense(
          expense.id
        );
  
        await loadExpenses();
      } catch (err) {
        console.error(err);
  
        setError(
          getApiErrorMessage(
            err,
            "Unable to delete expense."
          )
        );
      } finally {
        setDeletingId(
          null
        );
      }
    }
  
  
    async function handleFilterSubmit(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      await loadExpenses();
    }
  
  
    async function clearFilters() {
      setSearch("");
      setCategory("");
      setStartDate("");
      setEndDate("");
  
      await loadExpenses({
        search: "",
        category: "",
        startDate: "",
        endDate: "",
      });
    }
  
  
    return (
      <div className="expense-page">
  
        <div className="expense-page-header">
  
          <div>
            <div className="expense-eyebrow">
              OPERATING COST CONTROL
            </div>
  
            <h1 className="expense-title">
              Expenses
            </h1>
  
            <p className="expense-subtitle">
              Record and manage company
              operating expenses including
              salary, rent, electricity,
              transport, maintenance, and
              miscellaneous costs.
            </p>
          </div>
  
  
          <button
            type="button"
            className="expense-add-button"
            onClick={
              openCreateModal
            }
          >
            <Plus size={16} />
  
            Add Expense
          </button>
  
        </div>
  
  
        {error && (
          <div className="expense-error">
            {error}
          </div>
        )}
  
  
        <div className="expense-kpi-grid">
  
          <div className="expense-kpi-card">
            <div>
              <div className="expense-kpi-label">
                Records
              </div>
  
              <div className="expense-kpi-value">
                {total}
              </div>
            </div>
  
            <div className="expense-kpi-icon blue">
              <ReceiptText
                size={20}
              />
            </div>
          </div>
  
  
          <div className="expense-kpi-card">
            <div>
              <div className="expense-kpi-label">
                Expense Value
              </div>
  
              <div className="expense-kpi-value expense-kpi-money">
                {formatCurrency(
                  totalExpenseValue
                )}
              </div>
            </div>
  
            <div className="expense-kpi-icon rose">
              <CircleDollarSign
                size={20}
              />
            </div>
          </div>
  
  
          <div className="expense-kpi-card">
            <div>
              <div className="expense-kpi-label">
                Categories
              </div>
  
              <div className="expense-kpi-value">
                {categoryCount}
              </div>
            </div>
  
            <div className="expense-kpi-icon lavender">
              <WalletCards
                size={20}
              />
            </div>
          </div>
  
  
          <div className="expense-kpi-card">
            <div>
              <div className="expense-kpi-label">
                Latest Expense
              </div>
  
              <div className="expense-kpi-value expense-kpi-small">
                {latestExpense
                  ? formatCurrency(
                      latestExpense.amount
                    )
                  : "₹0"}
              </div>
  
              <div className="expense-kpi-note">
                {latestExpense
                  ? formatDate(
                      latestExpense.expense_date
                    )
                  : "No expenses"}
              </div>
            </div>
  
            <div className="expense-kpi-icon amber">
              <CalendarDays
                size={20}
              />
            </div>
          </div>
  
        </div>
  
  
        <div className="expense-panel">
  
          <div className="expense-panel-header">
  
            <div>
              <div className="expense-panel-title">
                Expense Register
              </div>
  
              <div className="expense-panel-subtitle">
                Search, filter, edit,
                and manage operating
                expenses.
              </div>
            </div>
  
  
            <div className="expense-record-count">
              {expenses.length}
              {" "}
              visible
            </div>
  
          </div>
  
  
          <form
            className="expense-filter-bar"
            onSubmit={
              handleFilterSubmit
            }
          >
  
            <div className="expense-search-field">
              <Search size={16} />
  
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search description, vendor, reference or notes..."
              />
            </div>
  
  
            <select
              className="expense-filter-select"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value as
                    ExpenseCategory | ""
                )
              }
            >
              <option value="">
                All Categories
              </option>
  
              {EXPENSE_CATEGORIES.map(
                (
                  item
                ) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
  
  
            <label className="expense-date-field">
              <span>
                From
              </span>
  
              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
              />
            </label>
  
  
            <label className="expense-date-field">
              <span>
                To
              </span>
  
              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
              />
            </label>
  
  
            <button
              type="submit"
              className="expense-filter-button"
            >
              <Filter size={15} />
  
              Apply
            </button>
  
  
            <button
              type="button"
              className="expense-clear-button"
              onClick={
                clearFilters
              }
            >
              Clear
            </button>
  
          </form>
  
  
          {loading ? (
            <div className="expense-loading-state">
              <Loader2
                size={22}
                className="expense-spin"
              />
  
              Loading expenses...
            </div>
          ) : expenses.length ===
            0 ? (
            <div className="expense-empty-state">
              <ReceiptText
                size={25}
              />
  
              No expenses found.
            </div>
          ) : (
            <div className="expense-table-wrap">
  
              <table className="expense-table">
  
                <thead>
                  <tr>
                    <th>
                      Date
                    </th>
  
                    <th>
                      Category
                    </th>
  
                    <th>
                      Description
                    </th>
  
                    <th>
                      Vendor
                    </th>
  
                    <th>
                      Payment
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
  
                    <th className="align-right">
                      Actions
                    </th>
                  </tr>
                </thead>
  
  
                <tbody>
                  {expenses.map(
                    (
                      expense
                    ) => (
                      <tr
                        key={
                          expense.id
                        }
                      >
  
                        <td>
                          {formatDate(
                            expense.expense_date
                          )}
                        </td>
  
  
                        <td>
                          <span className="expense-category-badge">
                            {
                              expense.category
                            }
                          </span>
                        </td>
  
  
                        <td>
                          <div className="expense-description">
                            {
                              expense.description
                            }
                          </div>
  
                          <div className="expense-row-note">
                            ID {expense.id}
                          </div>
                        </td>
  
  
                        <td>
                          {
                            expense.vendor_name ||
                            "-"
                          }
                        </td>
  
  
                        <td>
                          {
                            expense.payment_mode ||
                            "-"
                          }
                        </td>
  
  
                        <td>
                          {
                            expense.reference_number ||
                            "-"
                          }
                        </td>
  
  
                        <td>
                          <strong className="expense-amount">
                            {formatCurrency(
                              expense.amount
                            )}
                          </strong>
                        </td>
  
  
                        <td>
                          <span className="expense-notes">
                            {
                              expense.notes ||
                              "-"
                            }
                          </span>
                        </td>
  
  
                        <td className="align-right">
  
                          <div className="expense-action-group">
  
                            <button
                              type="button"
                              className="expense-icon-button edit"
                              onClick={() =>
                                openEditModal(
                                  expense
                                )
                              }
                              title="Edit expense"
                            >
                              <Edit3
                                size={14}
                              />
                            </button>
  
  
                            <button
                              type="button"
                              className="expense-icon-button delete"
                              disabled={
                                deletingId ===
                                expense.id
                              }
                              onClick={() =>
                                void handleDelete(
                                  expense
                                )
                              }
                              title="Delete expense"
                            >
                              {deletingId ===
                              expense.id ? (
                                <Loader2
                                  size={14}
                                  className="expense-spin"
                                />
                              ) : (
                                <Trash2
                                  size={14}
                                />
                              )}
                            </button>
  
                          </div>
  
                        </td>
  
                      </tr>
                    )
                  )}
                </tbody>
  
              </table>
  
            </div>
          )}
  
        </div>
  
  
        {modalOpen && (
          <div className="expense-modal-backdrop">
  
            <div className="expense-modal">
  
              <div className="expense-modal-header">
  
                <div>
                  <div className="expense-modal-eyebrow">
                    {
                      editingExpense
                        ? "UPDATE EXPENSE"
                        : "NEW EXPENSE"
                    }
                  </div>
  
                  <div className="expense-modal-title">
                    {
                      editingExpense
                        ? "Edit Expense"
                        : "Add Expense"
                    }
                  </div>
  
                  <div className="expense-modal-subtitle">
                    {
                      editingExpense
                        ? `Expense ID ${editingExpense.id}`
                        : "Create a new operating expense entry."
                    }
                  </div>
                </div>
  
  
                <button
                  type="button"
                  className="expense-modal-close"
                  onClick={
                    closeModal
                  }
                >
                  <X size={18} />
                </button>
  
              </div>
  
  
              <form
                className="expense-form"
                onSubmit={
                  handleSubmit
                }
              >
  
                <div className="expense-form-grid">
  
                  <label className="expense-form-field">
                    <span>
                      Expense Date *
                    </span>
  
                    <input
                      type="date"
                      required
                      value={
                        form.expense_date
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            expense_date:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </label>
  
  
                  <label className="expense-form-field">
                    <span>
                      Category *
                    </span>
  
                    <select
                      required
                      value={
                        form.category
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            category:
                              event
                                .target
                                .value as
                                ExpenseCategory,
                          })
                        )
                      }
                    >
                      <option value="">
                        Select category
                      </option>
  
                      {EXPENSE_CATEGORIES.map(
                        (
                          item
                        ) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        )
                      )}
                    </select>
                  </label>
  
  
                  <label className="expense-form-field expense-form-wide">
                    <span>
                      Description *
                    </span>
  
                    <input
                      type="text"
                      required
                      value={
                        form.description
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            description:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Describe this expense"
                    />
                  </label>
  
  
                  <label className="expense-form-field">
                    <span>
                      Amount *
                    </span>
  
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={
                        form.amount
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            amount:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="0.00"
                    />
                  </label>
  
  
                  <label className="expense-form-field">
                    <span>
                      Payment Mode
                    </span>
  
                    <input
                      type="text"
                      value={
                        form.payment_mode
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            payment_mode:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Cash / UPI / Bank"
                    />
                  </label>
  
  
                  <label className="expense-form-field">
                    <span>
                      Vendor Name
                    </span>
  
                    <input
                      type="text"
                      value={
                        form.vendor_name
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            vendor_name:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Vendor or payee"
                    />
                  </label>
  
  
                  <label className="expense-form-field">
                    <span>
                      Reference Number
                    </span>
  
                    <input
                      type="text"
                      value={
                        form.reference_number
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            reference_number:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Receipt / transaction reference"
                    />
                  </label>
  
  
                  <label className="expense-form-field expense-form-wide">
                    <span>
                      Notes
                    </span>
  
                    <textarea
                      value={
                        form.notes
                      }
                      onChange={(event) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            notes:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Optional notes"
                      rows={4}
                    />
                  </label>
  
                </div>
  
  
                <div className="expense-form-actions">
  
                  <button
                    type="button"
                    className="expense-cancel-button"
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
                    className="expense-save-button"
                    disabled={
                      saving
                    }
                  >
                    {saving && (
                      <Loader2
                        size={15}
                        className="expense-spin"
                      />
                    )}
  
                    {
                      editingExpense
                        ? "Update Expense"
                        : "Save Expense"
                    }
                  </button>
  
                </div>
  
              </form>
  
            </div>
  
          </div>
        )}
  
      </div>
    );
  }