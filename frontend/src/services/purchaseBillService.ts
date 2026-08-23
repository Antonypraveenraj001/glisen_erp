import axios from "axios";

const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";

/*
========================================
AUTHENTICATION HEADERS
========================================
*/

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

/*
========================================
1. AI EXTRACT PURCHASE BILL
========================================
*/

export async function extractPurchaseBill(
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await axios.post(
    `${API_BASE_URL}/purchase-bills/extract`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type":
          "multipart/form-data",
      },
    }
  );

  return response.data;
}

/*
========================================
2. GET PURCHASE BILLS
========================================
*/

export async function getPurchaseBills(
  search?: string
) {
  const response = await axios.get(
    `${API_BASE_URL}/purchase-bills`,
    {
      headers: getAuthHeaders(),

      params: search
        ? {
            search,
          }
        : undefined,
    }
  );

  return response.data;
}

/*
========================================
3. GET SINGLE PURCHASE BILL
========================================
*/

export async function getPurchaseBill(
  purchaseBillId: number
) {
  const response = await axios.get(
    `${API_BASE_URL}/purchase-bills/${purchaseBillId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

/*
========================================
3A. GET SINGLE PURCHASE BILL BY ID
========================================

This is an alias used by the
PurchaseBillDetails page.

It calls the same backend endpoint
as getPurchaseBill().
========================================
*/

export async function getPurchaseBillById(
  purchaseBillId: number
) {
  const response = await axios.get(
    `${API_BASE_URL}/purchase-bills/${purchaseBillId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

/*
========================================
4. GET PURCHASE BILL STATISTICS
========================================
*/

export async function getPurchaseBillStatistics() {
  const response = await axios.get(
    `${API_BASE_URL}/purchase-bills/statistics`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

/*
========================================
5. CONFIRM AI PURCHASE BILL
========================================
*/

export async function confirmPurchaseBill(
  data: unknown
) {
  const response = await axios.post(
    `${API_BASE_URL}/purchase-bills/confirm`,
    data,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type":
          "application/json",
      },
    }
  );

  return response.data;
}

/*
========================================
6. UPDATE PURCHASE BILL
========================================
*/

export async function updatePurchaseBill(
  purchaseBillId: number,
  data: unknown
) {
  const response = await axios.put(
    `${API_BASE_URL}/purchase-bills/${purchaseBillId}`,
    data,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type":
          "application/json",
      },
    }
  );

  return response.data;
}

/*
========================================
7. DELETE / DEACTIVATE PURCHASE BILL
========================================
*/

export async function deactivatePurchaseBill(
  purchaseBillId: number
) {
  const response = await axios.delete(
    `${API_BASE_URL}/purchase-bills/${purchaseBillId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}