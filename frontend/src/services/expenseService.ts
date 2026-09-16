import axios from "axios";

import type {
  Expense,
  ExpenseCreatePayload,
  ExpenseFilters,
  ExpenseListResponse,
  ExpenseUpdatePayload,
} from "../types/expense";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


function getAuthHeaders() {
  const token =
    localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Authentication required."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}


/* =========================================================
   GET EXPENSES
========================================================= */

export async function getExpenses(
  filters: ExpenseFilters = {}
): Promise<ExpenseListResponse> {

  const response =
    await axios.get<ExpenseListResponse>(
      `${API_BASE_URL}/expenses`,
      {
        headers: getAuthHeaders(),

        params: {
          start_date:
            filters.start_date ||
            undefined,

          end_date:
            filters.end_date ||
            undefined,

          category:
            filters.category ||
            undefined,

          search:
            filters.search?.trim() ||
            undefined,
        },
      }
    );

  return response.data;
}


/* =========================================================
   GET EXPENSE BY ID
========================================================= */

export async function getExpenseById(
  expenseId: number
): Promise<Expense> {

  const response =
    await axios.get<Expense>(
      `${API_BASE_URL}/expenses/${expenseId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   CREATE EXPENSE
========================================================= */

export async function createExpense(
  payload: ExpenseCreatePayload
): Promise<Expense> {

  const response =
    await axios.post<Expense>(
      `${API_BASE_URL}/expenses`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   UPDATE EXPENSE
========================================================= */

export async function updateExpense(
  expenseId: number,
  payload: ExpenseUpdatePayload
): Promise<Expense> {

  const response =
    await axios.put<Expense>(
      `${API_BASE_URL}/expenses/${expenseId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   DELETE EXPENSE
========================================================= */

export async function deleteExpense(
  expenseId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/expenses/${expenseId}`,
    {
      headers: getAuthHeaders(),
    }
  );
}