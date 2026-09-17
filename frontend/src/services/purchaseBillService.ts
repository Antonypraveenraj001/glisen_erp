import axios from "axios";

import type {
  PurchaseBill,
  PurchaseBillAIResponse,
  PurchaseBillConfirmRequest,
  PurchaseBillConfirmResponse,
  PurchaseBillPayment,
  PurchaseBillPaymentCreate,
  PurchaseBillPaymentSummary,
  PurchaseBillStatistics,
  PurchaseBillUnpaidAging,
  PurchaseBillUpdateRequest,
} from "../types/purchaseBill";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


/* ================================================================
   AUTHENTICATION HEADERS
================================================================ */

function getAuthHeaders() {

  const token =
    localStorage.getItem(
      "access_token"
    );


  if (!token) {
    throw new Error(
      "Authentication required."
    );
  }


  return {
    Authorization:
      `Bearer ${token}`,
  };
}


/* ================================================================
   1. AI EXTRACT PURCHASE BILL
================================================================ */

export async function extractPurchaseBill(
  file: File
): Promise<PurchaseBillAIResponse> {

  const formData =
    new FormData();


  formData.append(
    "file",
    file
  );


  const response =
    await axios.post<
      PurchaseBillAIResponse
    >(
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


/* ================================================================
   2. GET PURCHASE BILLS
================================================================ */

export async function getPurchaseBills(
  search?: string
): Promise<PurchaseBill[]> {

  const response =
    await axios.get<
      PurchaseBill[]
    >(
      `${API_BASE_URL}/purchase-bills`,
      {
        headers:
          getAuthHeaders(),

        params:
          search
            ? {
                search,
              }
            : undefined,
      }
    );


  return response.data;
}


/* ================================================================
   3. GET SINGLE PURCHASE BILL
================================================================ */

export async function getPurchaseBill(
  purchaseBillId: number
): Promise<PurchaseBill> {

  const response =
    await axios.get<
      PurchaseBill
    >(
      `${API_BASE_URL}/purchase-bills/${purchaseBillId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* ================================================================
   3A. GET SINGLE PURCHASE BILL BY ID

   Alias used by existing Purchase Bill pages.
================================================================ */

export async function getPurchaseBillById(
  purchaseBillId: number
): Promise<PurchaseBill> {

  return getPurchaseBill(
    purchaseBillId
  );
}


/* ================================================================
   4. GET PURCHASE BILL STATISTICS
================================================================ */

export async function getPurchaseBillStatistics():
  Promise<PurchaseBillStatistics> {

  const response =
    await axios.get<
      PurchaseBillStatistics
    >(
      `${API_BASE_URL}/purchase-bills/statistics`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* ================================================================
   5. CONFIRM AI PURCHASE BILL
================================================================ */

export async function confirmPurchaseBill(
  data:
    PurchaseBillConfirmRequest
): Promise<PurchaseBillConfirmResponse> {

  const response =
    await axios.post<
      PurchaseBillConfirmResponse
    >(
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


/* ================================================================
   6. UPDATE PURCHASE BILL
================================================================ */

export async function updatePurchaseBill(
  purchaseBillId: number,
  data:
    PurchaseBillUpdateRequest
): Promise<PurchaseBill> {

  const response =
    await axios.put<
      PurchaseBill
    >(
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


/* ================================================================
   7. DELETE / DEACTIVATE PURCHASE BILL
================================================================ */

export async function deactivatePurchaseBill(
  purchaseBillId: number
): Promise<{
  message: string;
}> {

  const response =
    await axios.delete<{
      message: string;
    }>(
      `${API_BASE_URL}/purchase-bills/${purchaseBillId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* ================================================================
   8. GET PAYMENT SUMMARY
================================================================ */

export async function getPurchaseBillPaymentSummary(
  purchaseBillId: number
): Promise<PurchaseBillPaymentSummary> {

  const response =
    await axios.get<
      PurchaseBillPaymentSummary
    >(
      `${API_BASE_URL}/purchase-bills/${purchaseBillId}/payment-summary`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* ================================================================
   9. RECORD SUPPLIER PAYMENT
================================================================ */

export async function recordPurchaseBillPayment(
  purchaseBillId: number,
  data:
    PurchaseBillPaymentCreate
): Promise<PurchaseBillPayment> {

  const response =
    await axios.post<
      PurchaseBillPayment
    >(
      `${API_BASE_URL}/purchase-bills/${purchaseBillId}/payments`,
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


/* ================================================================
   10. GET UNPAID PURCHASE BILL AGING
================================================================ */

export async function getUnpaidPurchaseBillAging():
  Promise<PurchaseBillUnpaidAging[]> {

  const response =
    await axios.get<
      PurchaseBillUnpaidAging[]
    >(
      `${API_BASE_URL}/purchase-bills/unpaid-aging`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}