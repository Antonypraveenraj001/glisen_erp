import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import axios from "axios";

import {
  Building2,
  CircleDollarSign,
  Edit3,
  Factory,
  Filter,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  UserMinus,
  Users,
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
  createStaff,
  deactivateStaff,
  getStaff,
  updateStaff,
} from "../../services/staffService";

import {
  getProductionOrders,
} from "../../services/productionService";

import {
  usePermissions,
} from "../../hooks/usePermissions";

import {
  EXPENSE_CATEGORIES,
} from "../../types/expense";

import type {
  Expense,
  ExpenseCategory,
  ExpenseCreatePayload,
  ExpenseType,
  ExpenseUpdatePayload,
} from "../../types/expense";

import type {
  Staff,
  StaffCreatePayload,
  StaffUpdatePayload,
} from "../../types/staff";

import type {
  ProductionOrder,
} from "../../types/production";


type ExpenseTab =
  | "staff"
  | "overhead"
  | "direct"
  | "register";


interface ExpenseFormState {
  expense_date: string;

  expense_type: ExpenseType;

  category:
    ExpenseCategory | "";

  description: string;

  amount: string;

  production_order_id:
    string;

  payment_mode: string;

  reference_number: string;

  vendor_name: string;

  notes: string;
}


interface StaffFormState {
  staff_name: string;

  designation: string;

  monthly_salary: string;

  joining_date: string;

  relieving_date: string;

  notes: string;
}


/* ================================================================
   CATEGORY GROUPS
================================================================ */

const OVERHEAD_CATEGORIES:
ExpenseCategory[] = [
  "Rent",
  "Electricity",
  "Cleaning",
  "Maintenance",
  "Office",
  "Internet / Telephone",
  "Security",
  "Other Overhead",
  "Miscellaneous",
];


const DIRECT_CATEGORIES:
ExpenseCategory[] = [
  "Transport",
  "Outside Machining",
  "Special Labour",
  "Crane / Loading",
  "Painting",
  "Installation",
  "Job Travel",
  "Testing",
  "Packing",
  "Other Direct",
  "Miscellaneous",
];


const GENERAL_CATEGORIES:
ExpenseCategory[] = [
  "Office",
  "Purchase-related",
  "Miscellaneous",
];


/* ================================================================
   EMPTY FORMS
================================================================ */

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


function createEmptyExpenseForm(
  expenseType:
    ExpenseType = "GENERAL"
): ExpenseFormState {

  return {
    expense_date:
      todayValue(),

    expense_type:
      expenseType,

    category:
      "",

    description:
      "",

    amount:
      "",

    production_order_id:
      "",

    payment_mode:
      "",

    reference_number:
      "",

    vendor_name:
      "",

    notes:
      "",
  };

}


function createEmptyStaffForm():
StaffFormState {

  return {
    staff_name:
      "",

    designation:
      "",

    monthly_salary:
      "",

    joining_date:
      "",

    relieving_date:
      "",

    notes:
      "",
  };

}


/* ================================================================
   HELPERS
================================================================ */

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
      value
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


function getCategoriesForType(
  expenseType:
    ExpenseType
):
ExpenseCategory[] {

  if (
    expenseType
    === "OVERHEAD"
  ) {

    return (
      OVERHEAD_CATEGORIES
    );

  }


  if (
    expenseType
    === "DIRECT_PRODUCTION"
  ) {

    return (
      DIRECT_CATEGORIES
    );

  }


  return (
    GENERAL_CATEGORIES
  );

}


function getExpenseTypeLabel(
  expenseType:
    ExpenseType
) {

  if (
    expenseType
    === "DIRECT_PRODUCTION"
  ) {

    return (
      "Direct Production"
    );

  }


  if (
    expenseType
    === "OVERHEAD"
  ) {

    return (
      "Company Overhead"
    );

  }


  return (
    "General"
  );

}


/* ================================================================
   PAGE
================================================================ */

export default function ExpensePage() {

  /* ==============================================================
     PERMISSIONS
  ============================================================== */

  const {
    hasPermission,
  } =
    usePermissions();


  const canViewStaff =
    hasPermission(
      "staff.view"
    );


  const canManageStaff =
    hasPermission(
      "staff.manage"
    );


  /* ==============================================================
     PAGE STATE
  ============================================================== */

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ExpenseTab>(
      "overhead"
    );


  const [
    expenses,
    setExpenses,
  ] =
    useState<
      Expense[]
    >(
      []
    );


  const [
    staff,
    setStaff,
  ] =
    useState<
      Staff[]
    >(
      []
    );


  const [
    productionOrders,
    setProductionOrders,
  ] =
    useState<
      ProductionOrder[]
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
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     EXPENSE MODAL
  ============================================================== */

  const [
    expenseModalOpen,
    setExpenseModalOpen,
  ] =
    useState(
      false
    );


  const [
    editingExpense,
    setEditingExpense,
  ] =
    useState<
      Expense | null
    >(
      null
    );


  const [
    expenseForm,
    setExpenseForm,
  ] =
    useState<
      ExpenseFormState
    >(
      createEmptyExpenseForm()
    );


  const [
    expenseSaving,
    setExpenseSaving,
  ] =
    useState(
      false
    );


  const [
    expenseFormError,
    setExpenseFormError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    deletingExpenseId,
    setDeletingExpenseId,
  ] =
    useState<
      number | null
    >(
      null
    );


  /* ==============================================================
     STAFF MODAL
  ============================================================== */

  const [
    staffModalOpen,
    setStaffModalOpen,
  ] =
    useState(
      false
    );


  const [
    editingStaff,
    setEditingStaff,
  ] =
    useState<
      Staff | null
    >(
      null
    );


  const [
    staffForm,
    setStaffForm,
  ] =
    useState<
      StaffFormState
    >(
      createEmptyStaffForm()
    );


  const [
    staffSaving,
    setStaffSaving,
  ] =
    useState(
      false
    );


  const [
    staffFormError,
    setStaffFormError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    deactivatingStaffId,
    setDeactivatingStaffId,
  ] =
    useState<
      number | null
    >(
      null
    );


  /* ==============================================================
     REGISTER FILTERS
  ============================================================== */

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      ExpenseType | ""
    >(
      ""
    );


  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState<
      ExpenseCategory | ""
    >(
      ""
    );


  const [
    startDate,
    setStartDate,
  ] =
    useState(
      ""
    );


  const [
    endDate,
    setEndDate,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     LOAD

     Expenses and Production Orders are always loaded.

     Staff data is loaded only when the role owns staff.view.
     This keeps Expenses usable when the Staff module is OFF.
  ============================================================== */

  async function loadData() {

    try {

      setLoading(
        true
      );


      setError(
        null
      );


      const staffRequest =
        canViewStaff
          ? getStaff()
          : Promise.resolve(
              null
            );


      const [
        expenseData,
        staffData,
        productionData,
      ] =
        await Promise.all([
          getExpenses(),

          staffRequest,

          getProductionOrders(),
        ]);


      setExpenses(
        expenseData.items
      );


      setStaff(
        staffData
          ?.items
        ??
        []
      );


      setProductionOrders(
        productionData
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load expense workspace."
        )
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadData();

    },
    [
      canViewStaff,
    ]
  );


  /*
   * If Staff access is removed while this page is open,
   * immediately leave the Staff tab and clear Staff data.
   */

  useEffect(
    () => {

      if (
        !canViewStaff
      ) {

        setStaff(
          []
        );


        if (
          activeTab
          === "staff"
        ) {

          setActiveTab(
            "overhead"
          );

        }

      }

    },
    [
      canViewStaff,
      activeTab,
    ]
  );


  /* ==============================================================
     PRODUCTION LOOKUP
  ============================================================== */

  const productionById =
    useMemo(
      () => {

        const map =
          new Map<
            number,
            ProductionOrder
          >();


        productionOrders
          .forEach(
            order => {

              map.set(
                order.id,
                order
              );

            }
          );


        return map;

      },
      [
        productionOrders,
      ]
    );


  const activeProductionOrders =
    useMemo(
      () =>

        productionOrders
          .filter(
            order =>
              (
                order.status
                || ""
              )
                .trim()
                .toLowerCase()
              === "in progress"
          )
          .sort(
            (
              first,
              second
            ) =>
              second.id
              -
              first.id
          ),

      [
        productionOrders,
      ]
    );


  /* ==============================================================
     KPI
  ============================================================== */

  const activeStaff =
    useMemo(
      () =>

        staff.filter(
          member =>
            member.is_active
        ),

      [
        staff,
      ]
    );


  const monthlySalaryTotal =
    useMemo(
      () =>

        activeStaff.reduce(
          (
            total,
            member
          ) =>
            total
            +
            Number(
              member.monthly_salary
            ),

          0
        ),

      [
        activeStaff,
      ]
    );


  const overheadExpenses =
    useMemo(
      () =>

        expenses.filter(
          expense =>
            expense.expense_type
            === "OVERHEAD"
        ),

      [
        expenses,
      ]
    );


  const directExpenses =
    useMemo(
      () =>

        expenses.filter(
          expense =>
            expense.expense_type
            === "DIRECT_PRODUCTION"
        ),

      [
        expenses,
      ]
    );


  const overheadTotal =
    useMemo(
      () =>

        overheadExpenses.reduce(
          (
            total,
            expense
          ) =>
            total
            +
            Number(
              expense.amount
            ),

          0
        ),

      [
        overheadExpenses,
      ]
    );


  const directExpenseTotal =
    useMemo(
      () =>

        directExpenses.reduce(
          (
            total,
            expense
          ) =>
            total
            +
            Number(
              expense.amount
            ),

          0
        ),

      [
        directExpenses,
      ]
    );


  /* ==============================================================
     REGISTER FILTER
  ============================================================== */

  const filteredRegister =
    useMemo(
      () => {

        const normalizedSearch =
          search
            .trim()
            .toLowerCase();


        return (
          expenses.filter(
            expense => {

              if (
                typeFilter
                &&
                expense.expense_type
                !== typeFilter
              ) {

                return false;

              }


              if (
                categoryFilter
                &&
                expense.category
                !== categoryFilter
              ) {

                return false;

              }


              if (
                startDate
                &&
                expense.expense_date
                < startDate
              ) {

                return false;

              }


              if (
                endDate
                &&
                expense.expense_date
                > endDate
              ) {

                return false;

              }


              if (
                !normalizedSearch
              ) {

                return true;

              }


              const production =
                expense
                  .production_order_id
                  ? productionById.get(
                      expense
                        .production_order_id
                    )
                  : null;


              const values = [
                expense.category,
                expense.description,
                expense.vendor_name,
                expense.payment_mode,
                expense.reference_number,
                expense.notes,
                production
                  ?.production_number,
                production
                  ?.product_name,
              ];


              return (
                values
                  .filter(
                    Boolean
                  )
                  .some(
                    value =>
                      String(
                        value
                      )
                        .toLowerCase()
                        .includes(
                          normalizedSearch
                        )
                  )
              );

            }
          )
        );

      },
      [
        expenses,
        search,
        typeFilter,
        categoryFilter,
        startDate,
        endDate,
        productionById,
      ]
    );


  /* ==============================================================
     EXPENSE LOCK
  ============================================================== */

  function isExpenseLocked(
    expense:
      Expense
  ) {

    if (
      expense.expense_type
      !== "DIRECT_PRODUCTION"
    ) {

      return false;

    }


    if (
      !expense
        .production_order_id
    ) {

      return true;

    }


    const production =
      productionById.get(
        expense
          .production_order_id
      );


    if (
      !production
    ) {

      return true;

    }


    return (
      production.status
        .trim()
        .toLowerCase()
      !== "in progress"
    );

  }


  /* ==============================================================
     OPEN NEW EXPENSE
  ============================================================== */

  function openNewExpense(
    expenseType:
      ExpenseType
  ) {

    setEditingExpense(
      null
    );


    setExpenseForm(
      createEmptyExpenseForm(
        expenseType
      )
    );


    setExpenseFormError(
      null
    );


    setExpenseModalOpen(
      true
    );

  }


  /* ==============================================================
     EDIT EXPENSE
  ============================================================== */

  function openEditExpense(
    expense:
      Expense
  ) {

    if (
      isExpenseLocked(
        expense
      )
    ) {

      setError(
        "Completed-production expenses are locked to preserve historical costing."
      );

      return;

    }


    setEditingExpense(
      expense
    );


    setExpenseForm({
      expense_date:
        expense.expense_date,

      expense_type:
        expense.expense_type,

      category:
        expense.category,

      description:
        expense.description,

      amount:
        expense.amount,

      production_order_id:
        expense
          .production_order_id
          ? String(
              expense
                .production_order_id
            )
          : "",

      payment_mode:
        expense.payment_mode
        || "",

      reference_number:
        expense.reference_number
        || "",

      vendor_name:
        expense.vendor_name
        || "",

      notes:
        expense.notes
        || "",
    });


    setExpenseFormError(
      null
    );


    setExpenseModalOpen(
      true
    );

  }


  function closeExpenseModal() {

    if (
      expenseSaving
    ) {

      return;

    }


    setExpenseModalOpen(
      false
    );


    setEditingExpense(
      null
    );


    setExpenseFormError(
      null
    );

  }


  /* ==============================================================
     EXPENSE CATEGORY OPTIONS
  ============================================================== */

  const expenseCategoryOptions =
    useMemo(
      () => {

        const base =
          getCategoriesForType(
            expenseForm
              .expense_type
          );


        if (
          expenseForm.category
          &&
          !base.includes(
            expenseForm.category
          )
        ) {

          return [
            expenseForm.category,
            ...base,
          ];

        }


        return base;

      },
      [
        expenseForm
          .expense_type,

        expenseForm
          .category,
      ]
    );


  /* ==============================================================
     SAVE EXPENSE
  ============================================================== */

  async function handleExpenseSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setExpenseFormError(
      null
    );


    if (
      !expenseForm
        .expense_date
      ||
      !expenseForm
        .category
      ||
      !expenseForm
        .description
        .trim()
      ||
      !expenseForm
        .amount
    ) {

      setExpenseFormError(
        "Expense date, category, description and amount are required."
      );

      return;

    }


    const amount =
      Number(
        expenseForm
          .amount
      );


    if (
      Number.isNaN(
        amount
      )
      ||
      amount <= 0
    ) {

      setExpenseFormError(
        "Amount must be greater than zero."
      );

      return;

    }


    let productionOrderId:
      number | null =
      null;


    if (
      expenseForm
        .expense_type
      === "DIRECT_PRODUCTION"
    ) {

      productionOrderId =
        Number(
          expenseForm
            .production_order_id
        );


      if (
        !productionOrderId
        ||
        Number.isNaN(
          productionOrderId
        )
      ) {

        setExpenseFormError(
          "Select the production machine / finished product for this direct expense."
        );

        return;

      }

    }


    try {

      setExpenseSaving(
        true
      );


      if (
        editingExpense
      ) {

        const payload:
          ExpenseUpdatePayload = {

          expense_date:
            expenseForm
              .expense_date,

          expense_type:
            expenseForm
              .expense_type,

          category:
            expenseForm
              .category,

          description:
            expenseForm
              .description
              .trim(),

          amount,

          production_order_id:
            productionOrderId,

          payment_mode:
            expenseForm
              .payment_mode
              .trim()
            || null,

          reference_number:
            expenseForm
              .reference_number
              .trim()
            || null,

          vendor_name:
            expenseForm
              .vendor_name
              .trim()
            || null,

          notes:
            expenseForm
              .notes
              .trim()
            || null,
        };


        await updateExpense(
          editingExpense.id,
          payload
        );

      } else {

        const payload:
          ExpenseCreatePayload = {

          expense_date:
            expenseForm
              .expense_date,

          expense_type:
            expenseForm
              .expense_type,

          category:
            expenseForm
              .category,

          description:
            expenseForm
              .description
              .trim(),

          amount,

          production_order_id:
            productionOrderId,

          payment_mode:
            expenseForm
              .payment_mode
              .trim()
            || null,

          reference_number:
            expenseForm
              .reference_number
              .trim()
            || null,

          vendor_name:
            expenseForm
              .vendor_name
              .trim()
            || null,

          notes:
            expenseForm
              .notes
              .trim()
            || null,
        };


        await createExpense(
          payload
        );

      }


      closeExpenseModal();


      await loadData();

    } catch (
      err
    ) {

      console.error(
        err
      );


      setExpenseFormError(
        getApiErrorMessage(
          err,
          editingExpense
            ? "Unable to update expense."
            : "Unable to create expense."
        )
      );

    } finally {

      setExpenseSaving(
        false
      );

    }

  }


  /* ==============================================================
     DELETE EXPENSE
  ============================================================== */

  async function handleDeleteExpense(
    expense:
      Expense
  ) {

    if (
      isExpenseLocked(
        expense
      )
    ) {

      setError(
        "Completed-production expenses cannot be deleted because they belong to historical product costing."
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Delete "${expense.description}"?`
      );


    if (
      !confirmed
    ) {

      return;

    }


    try {

      setDeletingExpenseId(
        expense.id
      );


      setError(
        null
      );


      await deleteExpense(
        expense.id
      );


      await loadData();

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to delete expense."
        )
      );

    } finally {

      setDeletingExpenseId(
        null
      );

    }

  }


  /* ==============================================================
     NEW STAFF
  ============================================================== */

  function openNewStaff() {

    if (
      !canManageStaff
    ) {

      return;

    }


    setEditingStaff(
      null
    );


    setStaffForm(
      createEmptyStaffForm()
    );


    setStaffFormError(
      null
    );


    setStaffModalOpen(
      true
    );

  }


  /* ==============================================================
     EDIT STAFF
  ============================================================== */

  function openEditStaff(
    member:
      Staff
  ) {

    if (
      !canManageStaff
    ) {

      return;

    }


    setEditingStaff(
      member
    );


    setStaffForm({
      staff_name:
        member.staff_name,

      designation:
        member.designation
        || "",

      monthly_salary:
        member.monthly_salary,

      joining_date:
        member.joining_date
        || "",

      relieving_date:
        member.relieving_date
        || "",

      notes:
        member.notes
        || "",
    });


    setStaffFormError(
      null
    );


    setStaffModalOpen(
      true
    );

  }


  function closeStaffModal() {

    if (
      staffSaving
    ) {

      return;

    }


    setStaffModalOpen(
      false
    );


    setEditingStaff(
      null
    );


    setStaffFormError(
      null
    );

  }


  /* ==============================================================
     SAVE STAFF
  ============================================================== */

  async function handleStaffSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    if (
      !canManageStaff
    ) {

      setStaffFormError(
        "You do not have permission to manage Staff."
      );

      return;

    }


    setStaffFormError(
      null
    );


    if (
      !staffForm
        .staff_name
        .trim()
    ) {

      setStaffFormError(
        "Staff name is required."
      );

      return;

    }


    const monthlySalary =
      Number(
        staffForm
          .monthly_salary
      );


    if (
      Number.isNaN(
        monthlySalary
      )
      ||
      monthlySalary < 0
    ) {

      setStaffFormError(
        "Monthly salary must be zero or greater."
      );

      return;

    }


    if (
      staffForm
        .joining_date
      &&
      staffForm
        .relieving_date
      &&
      staffForm
        .relieving_date
      <
      staffForm
        .joining_date
    ) {

      setStaffFormError(
        "Relieving date cannot be before joining date."
      );

      return;

    }


    try {

      setStaffSaving(
        true
      );


      if (
        editingStaff
      ) {

        const payload:
          StaffUpdatePayload = {

          staff_name:
            staffForm
              .staff_name
              .trim(),

          designation:
            staffForm
              .designation
              .trim()
            || null,

          monthly_salary:
            monthlySalary,

          joining_date:
            staffForm
              .joining_date
            || null,

          relieving_date:
            staffForm
              .relieving_date
            || null,

          notes:
            staffForm
              .notes
              .trim()
            || null,
        };


        await updateStaff(
          editingStaff.id,
          payload
        );

      } else {

        const payload:
          StaffCreatePayload = {

          staff_name:
            staffForm
              .staff_name
              .trim(),

          designation:
            staffForm
              .designation
              .trim()
            || null,

          monthly_salary:
            monthlySalary,

          joining_date:
            staffForm
              .joining_date
            || null,

          relieving_date:
            staffForm
              .relieving_date
            || null,

          notes:
            staffForm
              .notes
              .trim()
            || null,
        };


        await createStaff(
          payload
        );

      }


      closeStaffModal();


      await loadData();

    } catch (
      err
    ) {

      console.error(
        err
      );


      setStaffFormError(
        getApiErrorMessage(
          err,
          editingStaff
            ? "Unable to update staff."
            : "Unable to create staff."
        )
      );

    } finally {

      setStaffSaving(
        false
      );

    }

  }


  /* ==============================================================
     DEACTIVATE STAFF
  ============================================================== */

  async function handleDeactivateStaff(
    member:
      Staff
  ) {

    if (
      !canManageStaff
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Mark "${member.staff_name}" as no longer active?`
      );


    if (
      !confirmed
    ) {

      return;

    }


    try {

      setDeactivatingStaffId(
        member.id
      );


      setError(
        null
      );


      await deactivateStaff(
        member.id
      );


      await loadData();

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to deactivate staff."
        )
      );

    } finally {

      setDeactivatingStaffId(
        null
      );

    }

  }


  /* ==============================================================
     CLEAR REGISTER FILTERS
  ============================================================== */

  function clearFilters() {

    setSearch(
      ""
    );


    setTypeFilter(
      ""
    );


    setCategoryFilter(
      ""
    );


    setStartDate(
      ""
    );


    setEndDate(
      ""
    );

  }


  /* ==============================================================
     HEADER ACTION
  ============================================================== */

  function renderHeaderAction() {

    if (
      activeTab
      === "staff"
    ) {

      if (
        !canManageStaff
      ) {

        return null;

      }


      return (
        <button
          type="button"
          className="expense-primary-button"
          onClick={
            openNewStaff
          }
        >
          <Plus
            size={16}
          />

          Add Staff
        </button>
      );

    }


    if (
      activeTab
      === "overhead"
    ) {

      return (
        <button
          type="button"
          className="expense-primary-button"
          onClick={() =>
            openNewExpense(
              "OVERHEAD"
            )
          }
        >
          <Plus
            size={16}
          />

          Add Overhead
        </button>
      );

    }


    if (
      activeTab
      === "direct"
    ) {

      return (
        <button
          type="button"
          className="expense-primary-button"
          onClick={() =>
            openNewExpense(
              "DIRECT_PRODUCTION"
            )
          }
        >
          <Plus
            size={16}
          />

          Add Direct Expense
        </button>
      );

    }


    return (
      <button
        type="button"
        className="expense-primary-button"
        onClick={() =>
          openNewExpense(
            "GENERAL"
          )
        }
      >
        <Plus
          size={16}
        />

        Add General Expense
      </button>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="expense-page">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="expense-page-header">

        <div>

          <div className="expense-eyebrow">
            COST & OVERHEAD CONTROL
          </div>


          <h1 className="expense-title">
            Expenses
          </h1>


          <p className="expense-subtitle">

            {
              canViewStaff
                ? (
                    <>
                      Manage staff salary,
                      company overheads and costs
                      belonging directly to machines
                      being manufactured by Glisen.
                    </>
                  )
                : (
                    <>
                      Manage company overheads and costs
                      belonging directly to machines
                      being manufactured by Glisen.
                    </>
                  )
            }

          </p>

        </div>


        <div className="expense-header-actions">

          <button
            type="button"
            className="expense-secondary-button"
            onClick={() =>
              void loadData()
            }
            disabled={
              loading
            }
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? "expense-spin"
                  : ""
              }
            />

            Refresh
          </button>


          {
            renderHeaderAction()
          }

        </div>

      </div>


      {
        error
        && (
          <div className="expense-error">
            {error}
          </div>
        )
      }


      {/* ========================================================
          KPI
      ======================================================== */}

      <div className="expense-kpi-grid">

        {
          canViewStaff
          && (
            <>
              <div className="expense-kpi-card">

                <div>

                  <div className="expense-kpi-label">
                    Active Staff
                  </div>

                  <div className="expense-kpi-value">
                    {
                      activeStaff.length
                    }
                  </div>

                  <div className="expense-kpi-note">
                    Salary master records
                  </div>

                </div>


                <div className="expense-kpi-icon blue">
                  <Users
                    size={20}
                  />
                </div>

              </div>


              <div className="expense-kpi-card">

                <div>

                  <div className="expense-kpi-label">
                    Monthly Staff Salary
                  </div>

                  <div className="expense-kpi-value expense-kpi-money">
                    {
                      formatCurrency(
                        monthlySalaryTotal
                      )
                    }
                  </div>

                  <div className="expense-kpi-note">
                    Future overhead pool
                  </div>

                </div>


                <div className="expense-kpi-icon lavender">
                  <WalletCards
                    size={20}
                  />
                </div>

              </div>
            </>
          )
        }


        <div className="expense-kpi-card">

          <div>

            <div className="expense-kpi-label">
              Recorded Overheads
            </div>

            <div className="expense-kpi-value expense-kpi-money">
              {
                formatCurrency(
                  overheadTotal
                )
              }
            </div>

            <div className="expense-kpi-note">
              Company-wide indirect costs
            </div>

          </div>


          <div className="expense-kpi-icon amber">
            <Building2
              size={20}
            />
          </div>

        </div>


        <div className="expense-kpi-card">

          <div>

            <div className="expense-kpi-label">
              Direct Production Costs
            </div>

            <div className="expense-kpi-value expense-kpi-money">
              {
                formatCurrency(
                  directExpenseTotal
                )
              }
            </div>

            <div className="expense-kpi-note">
              Linked directly to production
            </div>

          </div>


          <div className="expense-kpi-icon rose">
            <Factory
              size={20}
            />
          </div>

        </div>

      </div>


      {/* ========================================================
          TAB NAVIGATION
      ======================================================== */}

      <div className="expense-tabs">

        {
          canViewStaff
          && (
            <button
              type="button"
              className={
                activeTab
                === "staff"
                  ? "expense-tab active"
                  : "expense-tab"
              }
              onClick={() =>
                setActiveTab(
                  "staff"
                )
              }
            >
              <Users
                size={15}
              />

              Staff & Salary

              <span>
                {staff.length}
              </span>
            </button>
          )
        }


        <button
          type="button"
          className={
            activeTab
            === "overhead"
              ? "expense-tab active"
              : "expense-tab"
          }
          onClick={() =>
            setActiveTab(
              "overhead"
            )
          }
        >
          <Building2
            size={15}
          />

          Company Overheads

          <span>
            {
              overheadExpenses
                .length
            }
          </span>
        </button>


        <button
          type="button"
          className={
            activeTab
            === "direct"
              ? "expense-tab active"
              : "expense-tab"
          }
          onClick={() =>
            setActiveTab(
              "direct"
            )
          }
        >
          <Factory
            size={15}
          />

          Direct Production Expenses

          <span>
            {
              directExpenses
                .length
            }
          </span>
        </button>


        <button
          type="button"
          className={
            activeTab
            === "register"
              ? "expense-tab active"
              : "expense-tab"
          }
          onClick={() =>
            setActiveTab(
              "register"
            )
          }
        >
          <ReceiptText
            size={15}
          />

          Expense Register

          <span>
            {
              expenses.length
            }
          </span>
        </button>

      </div>


      {/* ========================================================
          LOADING
      ======================================================== */}

      {
        loading
          ? (
              <div className="expense-panel">

                <div className="expense-loading-state">

                  <Loader2
                    size={22}
                    className="expense-spin"
                  />

                  Loading expense workspace...

                </div>

              </div>
            )
          : (
              <>

                {/* ==================================================
                    STAFF
                ================================================== */}

                {
                  canViewStaff
                  &&
                  activeTab
                  === "staff"
                  && (
                    <div className="expense-panel">

                      <div className="expense-panel-header">

                        <div>

                          <div className="expense-panel-title">
                            Staff & Salary Master
                          </div>

                          <div className="expense-panel-subtitle">
                            Staff salary will become part
                            of the monthly indirect
                            production overhead pool.
                          </div>

                        </div>


                        <div className="expense-record-count">
                          {
                            activeStaff.length
                          }
                          {" "}
                          active
                        </div>

                      </div>


                      <div className="expense-info-strip">

                        <CircleDollarSign
                          size={17}
                        />

                        <div>

                          <strong>
                            Salary is maintained here.
                          </strong>

                          <span>
                            Do not create duplicate monthly
                            salary Expense entries. The
                            costing engine will use this
                            salary master directly.
                          </span>

                        </div>

                      </div>


                      {
                        staff.length
                        === 0
                          ? (
                              <div className="expense-empty-state">

                                <Users
                                  size={26}
                                />

                                No staff added yet.

                              </div>
                            )
                          : (
                              <div className="expense-table-wrap">

                                <table className="expense-table">

                                  <thead>
                                    <tr>

                                      <th>
                                        Staff Name
                                      </th>

                                      <th>
                                        Designation
                                      </th>

                                      <th>
                                        Monthly Salary
                                      </th>

                                      <th>
                                        Joining Date
                                      </th>

                                      <th>
                                        Relieving Date
                                      </th>

                                      <th>
                                        Status
                                      </th>

                                      <th>
                                        Notes
                                      </th>

                                      {
                                        canManageStaff
                                        && (
                                          <th className="align-right">
                                            Actions
                                          </th>
                                        )
                                      }

                                    </tr>
                                  </thead>


                                  <tbody>

                                    {
                                      staff.map(
                                        member => (

                                          <tr
                                            key={
                                              member.id
                                            }
                                          >

                                            <td>

                                              <div className="expense-description">
                                                {
                                                  member.staff_name
                                                }
                                              </div>

                                            </td>


                                            <td>
                                              {
                                                member.designation
                                                || "—"
                                              }
                                            </td>


                                            <td>

                                              <strong className="expense-money">
                                                {
                                                  formatCurrency(
                                                    member
                                                      .monthly_salary
                                                  )
                                                }
                                              </strong>

                                            </td>


                                            <td>
                                              {
                                                formatDate(
                                                  member
                                                    .joining_date
                                                )
                                              }
                                            </td>


                                            <td>
                                              {
                                                formatDate(
                                                  member
                                                    .relieving_date
                                                )
                                              }
                                            </td>


                                            <td>

                                              <span
                                                className={
                                                  member.is_active
                                                    ? "expense-status active"
                                                    : "expense-status inactive"
                                                }
                                              >
                                                {
                                                  member.is_active
                                                    ? "Active"
                                                    : "Inactive"
                                                }
                                              </span>

                                            </td>


                                            <td>

                                              <span className="expense-notes">
                                                {
                                                  member.notes
                                                  || "—"
                                                }
                                              </span>

                                            </td>


                                            {
                                              canManageStaff
                                              && (
                                                <td className="align-right">

                                                  <div className="expense-action-group">

                                                    <button
                                                      type="button"
                                                      className="expense-icon-button edit"
                                                      onClick={() =>
                                                        openEditStaff(
                                                          member
                                                        )
                                                      }
                                                      title="Edit staff"
                                                    >
                                                      <Edit3
                                                        size={14}
                                                      />
                                                    </button>


                                                    {
                                                      member.is_active
                                                      && (
                                                        <button
                                                          type="button"
                                                          className="expense-icon-button delete"
                                                          disabled={
                                                            deactivatingStaffId
                                                            === member.id
                                                          }
                                                          onClick={() =>
                                                            void handleDeactivateStaff(
                                                              member
                                                            )
                                                          }
                                                          title="Deactivate staff"
                                                        >
                                                          {
                                                            deactivatingStaffId
                                                            === member.id
                                                              ? (
                                                                  <Loader2
                                                                    size={14}
                                                                    className="expense-spin"
                                                                  />
                                                                )
                                                              : (
                                                                  <UserMinus
                                                                    size={14}
                                                                  />
                                                                )
                                                          }
                                                        </button>
                                                      )
                                                    }

                                                  </div>

                                                </td>
                                              )
                                            }

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
                  )
                }


                {/* ==================================================
                    OVERHEAD
                ================================================== */}

                {
                  activeTab
                  === "overhead"
                  && (
                    <div className="expense-panel">

                      <div className="expense-panel-header">

                        <div>

                          <div className="expense-panel-title">
                            Company Overheads
                          </div>

                          <div className="expense-panel-subtitle">
                            Rent, electricity, cleaning,
                            general maintenance and other
                            indirect company costs.
                          </div>

                        </div>


                        <div className="expense-record-count">
                          {
                            overheadExpenses.length
                          }
                          {" "}
                          records
                        </div>

                      </div>


                      <div className="expense-info-strip overhead">

                        <Building2
                          size={17}
                        />

                        <div>

                          <strong>
                            Indirect production cost
                          </strong>

                          <span>
                            These expenses belong to the
                            company as a whole. Later they
                            will be distributed across
                            active production jobs according
                            to production days.
                          </span>

                        </div>

                      </div>


                      {
                        overheadExpenses.length
                        === 0
                          ? (
                              <div className="expense-empty-state">

                                <Building2
                                  size={26}
                                />

                                No company overheads recorded.

                              </div>
                            )
                          : (
                              <ExpenseTable
                                expenses={
                                  overheadExpenses
                                }
                                productionById={
                                  productionById
                                }
                                deletingExpenseId={
                                  deletingExpenseId
                                }
                                isExpenseLocked={
                                  isExpenseLocked
                                }
                                onEdit={
                                  openEditExpense
                                }
                                onDelete={
                                  handleDeleteExpense
                                }
                              />
                            )
                      }

                    </div>
                  )
                }


                {/* ==================================================
                    DIRECT PRODUCTION EXPENSES
                ================================================== */}

                {
                  activeTab
                  === "direct"
                  && (
                    <div className="expense-panel">

                      <div className="expense-panel-header">

                        <div>

                          <div className="expense-panel-title">
                            Direct Production Expenses
                          </div>

                          <div className="expense-panel-subtitle">
                            Costs belonging specifically to
                            one machine / finished product
                            currently being manufactured.
                          </div>

                        </div>


                        <div className="expense-record-count">
                          {
                            activeProductionOrders
                              .length
                          }
                          {" "}
                          live production
                        </div>

                      </div>


                      <div className="expense-info-strip direct">

                        <Factory
                          size={17}
                        />

                        <div>

                          <strong>
                            Production-linked cost
                          </strong>

                          <span>
                            Transport, outside machining,
                            special labour, painting,
                            loading, testing and similar
                            costs can be assigned directly
                            to one active Production Order.
                          </span>

                        </div>

                      </div>


                      {
                        activeProductionOrders
                          .length
                        === 0
                        && (
                          <div className="expense-warning-strip">
                            No Production Order is currently
                            In Progress. New Direct Production
                            expenses cannot be entered until
                            production is active.
                          </div>
                        )
                      }


                      {
                        directExpenses.length
                        === 0
                          ? (
                              <div className="expense-empty-state">

                                <Factory
                                  size={26}
                                />

                                No direct production expenses recorded.

                              </div>
                            )
                          : (
                              <ExpenseTable
                                expenses={
                                  directExpenses
                                }
                                productionById={
                                  productionById
                                }
                                deletingExpenseId={
                                  deletingExpenseId
                                }
                                isExpenseLocked={
                                  isExpenseLocked
                                }
                                onEdit={
                                  openEditExpense
                                }
                                onDelete={
                                  handleDeleteExpense
                                }
                              />
                            )
                      }

                    </div>
                  )
                }


                {/* ==================================================
                    REGISTER
                ================================================== */}

                {
                  activeTab
                  === "register"
                  && (
                    <div className="expense-panel">

                      <div className="expense-panel-header">

                        <div>

                          <div className="expense-panel-title">
                            Expense Register
                          </div>

                          <div className="expense-panel-subtitle">
                            Complete expense history across
                            general, overhead and direct
                            production costs.
                          </div>

                        </div>


                        <div className="expense-record-count">
                          {
                            filteredRegister.length
                          }
                          {" "}
                          visible
                        </div>

                      </div>


                      <div className="expense-filter-bar">

                        <div className="expense-search-field">

                          <Search
                            size={15}
                          />

                          <input
                            type="text"
                            value={
                              search
                            }
                            onChange={
                              event =>
                                setSearch(
                                  event
                                    .target
                                    .value
                                )
                            }
                            placeholder="Search description, vendor, production, reference..."
                          />

                        </div>


                        <select
                          className="expense-filter-select"
                          value={
                            typeFilter
                          }
                          onChange={
                            event =>
                              setTypeFilter(
                                event
                                  .target
                                  .value as
                                  ExpenseType | ""
                              )
                          }
                        >

                          <option value="">
                            All Types
                          </option>

                          <option value="GENERAL">
                            General
                          </option>

                          <option value="OVERHEAD">
                            Company Overhead
                          </option>

                          <option value="DIRECT_PRODUCTION">
                            Direct Production
                          </option>

                        </select>


                        <select
                          className="expense-filter-select"
                          value={
                            categoryFilter
                          }
                          onChange={
                            event =>
                              setCategoryFilter(
                                event
                                  .target
                                  .value as
                                  ExpenseCategory | ""
                              )
                          }
                        >

                          <option value="">
                            All Categories
                          </option>


                          {
                            EXPENSE_CATEGORIES
                              .map(
                                item => (

                                  <option
                                    key={
                                      item
                                    }
                                    value={
                                      item
                                    }
                                  >
                                    {item}
                                  </option>

                                )
                              )
                          }

                        </select>


                        <label className="expense-date-field">

                          <span>
                            From
                          </span>

                          <input
                            type="date"
                            value={
                              startDate
                            }
                            onChange={
                              event =>
                                setStartDate(
                                  event
                                    .target
                                    .value
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
                            value={
                              endDate
                            }
                            onChange={
                              event =>
                                setEndDate(
                                  event
                                    .target
                                    .value
                                )
                            }
                          />

                        </label>


                        <button
                          type="button"
                          className="expense-clear-button"
                          onClick={
                            clearFilters
                          }
                        >
                          <Filter
                            size={14}
                          />

                          Clear
                        </button>

                      </div>


                      {
                        filteredRegister.length
                        === 0
                          ? (
                              <div className="expense-empty-state">

                                <ReceiptText
                                  size={26}
                                />

                                No expenses match the selected filters.

                              </div>
                            )
                          : (
                              <ExpenseTable
                                expenses={
                                  filteredRegister
                                }
                                productionById={
                                  productionById
                                }
                                deletingExpenseId={
                                  deletingExpenseId
                                }
                                isExpenseLocked={
                                  isExpenseLocked
                                }
                                onEdit={
                                  openEditExpense
                                }
                                onDelete={
                                  handleDeleteExpense
                                }
                                showType
                              />
                            )
                      }

                    </div>
                  )
                }

              </>
            )
      }


      {/* ========================================================
          EXPENSE MODAL
      ======================================================== */}

      {
        expenseModalOpen
        && (
          <div className="expense-modal-backdrop">

            <div className="expense-modal">

              <div className="expense-modal-header">

                <div>

                  <div className="expense-modal-eyebrow">
                    {
                      editingExpense
                        ? "UPDATE COST"
                        : "NEW COST"
                    }
                  </div>


                  <div className="expense-modal-title">
                    {
                      editingExpense
                        ? "Edit Expense"
                        : getExpenseTypeLabel(
                            expenseForm
                              .expense_type
                          )
                    }
                  </div>


                  <div className="expense-modal-subtitle">
                    {
                      expenseForm
                        .expense_type
                      === "DIRECT_PRODUCTION"
                        ? "This cost will belong directly to the selected machine being manufactured."
                        : expenseForm
                            .expense_type
                          === "OVERHEAD"
                            ? "This cost belongs to the company-wide overhead pool."
                            : "General company expense."
                    }
                  </div>

                </div>


                <button
                  type="button"
                  className="expense-modal-close"
                  onClick={
                    closeExpenseModal
                  }
                >
                  <X
                    size={18}
                  />
                </button>

              </div>


              <form
                className="expense-form"
                onSubmit={
                  handleExpenseSubmit
                }
              >

                {
                  expenseFormError
                  && (
                    <div className="expense-form-error">
                      {
                        expenseFormError
                      }
                    </div>
                  )
                }


                <div className="expense-type-banner">

                  <span>
                    Cost Type
                  </span>

                  <strong>
                    {
                      getExpenseTypeLabel(
                        expenseForm
                          .expense_type
                      )
                    }
                  </strong>

                </div>


                <div className="expense-form-grid">

                  {
                    expenseForm
                      .expense_type
                    === "DIRECT_PRODUCTION"
                    && (
                      <label className="expense-form-field expense-form-wide">

                        <span>
                          Production / Finished Product *
                        </span>


                        <select
                          required
                          value={
                            expenseForm
                              .production_order_id
                          }
                          onChange={
                            event =>
                              setExpenseForm(
                                previous => ({
                                  ...previous,

                                  production_order_id:
                                    event
                                      .target
                                      .value,
                                })
                              )
                          }
                        >

                          <option value="">
                            Select active production
                          </option>


                          {
                            activeProductionOrders
                              .map(
                                order => (

                                  <option
                                    key={
                                      order.id
                                    }
                                    value={
                                      order.id
                                    }
                                  >
                                    {
                                      order.production_number
                                    }
                                    {" — "}
                                    {
                                      order.product_name
                                    }
                                    {" — Qty "}
                                    {
                                      order.quantity
                                    }
                                  </option>

                                )
                              )
                          }

                        </select>


                        {
                          activeProductionOrders
                            .length
                          === 0
                          && (
                            <small className="expense-field-help danger">
                              There is currently no In Progress production available.
                            </small>
                          )
                        }

                      </label>
                    )
                  }


                  <label className="expense-form-field">

                    <span>
                      Expense Date *
                    </span>

                    <input
                      type="date"
                      required
                      value={
                        expenseForm
                          .expense_date
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
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
                        expenseForm
                          .category
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
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


                      {
                        expenseCategoryOptions
                          .map(
                            item => (

                              <option
                                key={
                                  item
                                }
                                value={
                                  item
                                }
                              >
                                {item}
                              </option>

                            )
                          )
                      }

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
                        expenseForm
                          .description
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
                              ...previous,

                              description:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                      placeholder={
                        expenseForm
                          .expense_type
                        === "DIRECT_PRODUCTION"
                          ? "Example: Transport for conveyor frame"
                          : "Describe this expense"
                      }
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
                        expenseForm
                          .amount
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
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
                      Vendor / Payee
                    </span>

                    <input
                      type="text"
                      value={
                        expenseForm
                          .vendor_name
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
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
                      Payment Mode
                    </span>

                    <input
                      type="text"
                      value={
                        expenseForm
                          .payment_mode
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
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
                      Reference Number
                    </span>

                    <input
                      type="text"
                      value={
                        expenseForm
                          .reference_number
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
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
                      rows={4}
                      value={
                        expenseForm
                          .notes
                      }
                      onChange={
                        event =>
                          setExpenseForm(
                            previous => ({
                              ...previous,

                              notes:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                      placeholder="Optional notes"
                    />

                  </label>

                </div>


                <div className="expense-form-actions">

                  <button
                    type="button"
                    className="expense-cancel-button"
                    onClick={
                      closeExpenseModal
                    }
                    disabled={
                      expenseSaving
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="expense-save-button"
                    disabled={
                      expenseSaving
                      ||
                      (
                        expenseForm
                          .expense_type
                        === "DIRECT_PRODUCTION"
                        &&
                        activeProductionOrders
                          .length
                        === 0
                      )
                    }
                  >

                    {
                      expenseSaving
                      && (
                        <Loader2
                          size={15}
                          className="expense-spin"
                        />
                      )
                    }

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
        )
      }


      {/* ========================================================
          STAFF MODAL
      ======================================================== */}

      {
        canManageStaff
        &&
        staffModalOpen
        && (
          <div className="expense-modal-backdrop">

            <div className="expense-modal expense-staff-modal">

              <div className="expense-modal-header">

                <div>

                  <div className="expense-modal-eyebrow">
                    STAFF MASTER
                  </div>


                  <div className="expense-modal-title">
                    {
                      editingStaff
                        ? "Edit Staff"
                        : "Add Staff"
                    }
                  </div>


                  <div className="expense-modal-subtitle">
                    Monthly salary will later feed
                    the production overhead allocation.
                  </div>

                </div>


                <button
                  type="button"
                  className="expense-modal-close"
                  onClick={
                    closeStaffModal
                  }
                >
                  <X
                    size={18}
                  />
                </button>

              </div>


              <form
                className="expense-form"
                onSubmit={
                  handleStaffSubmit
                }
              >

                {
                  staffFormError
                  && (
                    <div className="expense-form-error">
                      {
                        staffFormError
                      }
                    </div>
                  )
                }


                <div className="expense-form-grid">

                  <label className="expense-form-field">

                    <span>
                      Staff Name *
                    </span>

                    <input
                      type="text"
                      required
                      value={
                        staffForm
                          .staff_name
                      }
                      onChange={
                        event =>
                          setStaffForm(
                            previous => ({
                              ...previous,

                              staff_name:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                      placeholder="Employee name"
                    />

                  </label>


                  <label className="expense-form-field">

                    <span>
                      Designation
                    </span>

                    <input
                      type="text"
                      value={
                        staffForm
                          .designation
                      }
                      onChange={
                        event =>
                          setStaffForm(
                            previous => ({
                              ...previous,

                              designation:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                      placeholder="Welder / Fitter / Supervisor"
                    />

                  </label>


                  <label className="expense-form-field">

                    <span>
                      Monthly Salary *
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={
                        staffForm
                          .monthly_salary
                      }
                      onChange={
                        event =>
                          setStaffForm(
                            previous => ({
                              ...previous,

                              monthly_salary:
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
                      Joining Date
                    </span>

                    <input
                      type="date"
                      value={
                        staffForm
                          .joining_date
                      }
                      onChange={
                        event =>
                          setStaffForm(
                            previous => ({
                              ...previous,

                              joining_date:
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
                      Relieving Date
                    </span>

                    <input
                      type="date"
                      value={
                        staffForm
                          .relieving_date
                      }
                      onChange={
                        event =>
                          setStaffForm(
                            previous => ({
                              ...previous,

                              relieving_date:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                    />

                  </label>


                  <label className="expense-form-field expense-form-wide">

                    <span>
                      Notes
                    </span>

                    <textarea
                      rows={4}
                      value={
                        staffForm
                          .notes
                      }
                      onChange={
                        event =>
                          setStaffForm(
                            previous => ({
                              ...previous,

                              notes:
                                event
                                  .target
                                  .value,
                            })
                          )
                      }
                      placeholder="Optional staff notes"
                    />

                  </label>

                </div>


                <div className="expense-form-actions">

                  <button
                    type="button"
                    className="expense-cancel-button"
                    onClick={
                      closeStaffModal
                    }
                    disabled={
                      staffSaving
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="expense-save-button"
                    disabled={
                      staffSaving
                    }
                  >

                    {
                      staffSaving
                      && (
                        <Loader2
                          size={15}
                          className="expense-spin"
                        />
                      )
                    }

                    {
                      editingStaff
                        ? "Update Staff"
                        : "Save Staff"
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


/* ================================================================
   EXPENSE TABLE
================================================================ */

function ExpenseTable({
  expenses,
  productionById,
  deletingExpenseId,
  isExpenseLocked,
  onEdit,
  onDelete,
  showType = false,
}: {
  expenses:
    Expense[];

  productionById:
    Map<
      number,
      ProductionOrder
    >;

  deletingExpenseId:
    number | null;

  isExpenseLocked:
    (
      expense:
        Expense
    ) => boolean;

  onEdit:
    (
      expense:
        Expense
    ) => void;

  onDelete:
    (
      expense:
        Expense
    ) => Promise<void>;

  showType?:
    boolean;
}) {

  return (
    <div className="expense-table-wrap">

      <table className="expense-table">

        <thead>
          <tr>

            <th>
              Date
            </th>


            {
              showType
              && (
                <th>
                  Type
                </th>
              )
            }


            <th>
              Category
            </th>

            <th>
              Description
            </th>

            <th>
              Production
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

          {
            expenses.map(
              expense => {

                const production =
                  expense
                    .production_order_id
                    ? productionById.get(
                        expense
                          .production_order_id
                      )
                    : null;


                const locked =
                  isExpenseLocked(
                    expense
                  );


                return (
                  <tr
                    key={
                      expense.id
                    }
                  >

                    <td>
                      {
                        formatDate(
                          expense
                            .expense_date
                        )
                      }
                    </td>


                    {
                      showType
                      && (
                        <td>

                          <span
                            className={
                              `expense-type-badge ${
                                expense
                                  .expense_type
                                  .toLowerCase()
                                  .replace(
                                    "_",
                                    "-"
                                  )
                              }`
                            }
                          >
                            {
                              getExpenseTypeLabel(
                                expense
                                  .expense_type
                              )
                            }
                          </span>

                        </td>
                      )
                    }


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

                    </td>


                    <td>

                      {
                        production
                          ? (
                              <div className="expense-production-cell">

                                <strong>
                                  {
                                    production
                                      .production_number
                                  }
                                </strong>

                                <span>
                                  {
                                    production
                                      .product_name
                                  }
                                </span>

                              </div>
                            )
                          : "—"
                      }

                    </td>


                    <td>
                      {
                        expense
                          .vendor_name
                        || "—"
                      }
                    </td>


                    <td>
                      {
                        expense
                          .payment_mode
                        || "—"
                      }
                    </td>


                    <td>
                      {
                        expense
                          .reference_number
                        || "—"
                      }
                    </td>


                    <td>

                      <strong className="expense-money">
                        {
                          formatCurrency(
                            expense.amount
                          )
                        }
                      </strong>

                    </td>


                    <td>

                      <span className="expense-notes">
                        {
                          expense.notes
                          || "—"
                        }
                      </span>

                    </td>


                    <td className="align-right">

                      {
                        locked
                          ? (
                              <span className="expense-locked-badge">
                                Locked
                              </span>
                            )
                          : (
                              <div className="expense-action-group">

                                <button
                                  type="button"
                                  className="expense-icon-button edit"
                                  onClick={() =>
                                    onEdit(
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
                                    deletingExpenseId
                                    === expense.id
                                  }
                                  onClick={() =>
                                    void onDelete(
                                      expense
                                    )
                                  }
                                  title="Delete expense"
                                >
                                  {
                                    deletingExpenseId
                                    === expense.id
                                      ? (
                                          <Loader2
                                            size={14}
                                            className="expense-spin"
                                          />
                                        )
                                      : (
                                          <Trash2
                                            size={14}
                                          />
                                        )
                                  }
                                </button>

                              </div>
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
  );

}