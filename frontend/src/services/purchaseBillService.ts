import axios from "axios";

import type {
  PurchaseBill,
  PurchaseBillAIBatchResponse,
  PurchaseBillAIBatchStartResponse,
  PurchaseBillAIDraftDetail,
  PurchaseBillAIDraftSummary,
  PurchaseBillAIDataResponse,
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
   AUTH HEADERS
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
   SINGLE FILE AI EXTRACTION
================================================================ */

export async function extractPurchaseBill(
  file: File
):
Promise<PurchaseBillAIResponse> {

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
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;

}


/* ================================================================
   MULTI FILE AI EXTRACTION
================================================================ */

export async function extractPurchaseBillBatch(
  files: File[]
):
Promise<PurchaseBillAIBatchStartResponse> {

  if (
    files.length
    ===
    0
  ) {

    throw new Error(
      "At least one Purchase Bill image is required."
    );

  }


  const formData =
    new FormData();


  files.forEach(
    file => {

      formData.append(
        "files",
        file
      );

    }
  );


  const response =
    await axios.post<
      PurchaseBillAIBatchStartResponse
    >(
      `${API_BASE_URL}/purchase-bills/extract-batch`,
      formData,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;

}


/* ================================================================
   GET AI DRAFTS
================================================================ */

export async function getPurchaseBillAIDrafts(
  status?: string
):
Promise<PurchaseBillAIDraftSummary[]> {

  const response =
    await axios.get<
      PurchaseBillAIDraftSummary[]
    >(
      `${API_BASE_URL}/purchase-bills/ai-drafts`,
      {
        headers:
          getAuthHeaders(),

        params:
          status
            ? {
                status,
              }
            : undefined,
      }
    );


  return response.data;

}


/* ================================================================
   GET ONE AI DRAFT
================================================================ */

export async function getPurchaseBillAIDraft(
  draftId: number
):
Promise<PurchaseBillAIDraftDetail> {

  const response =
    await axios.get<
      PurchaseBillAIDraftDetail
    >(
      `${API_BASE_URL}/purchase-bills/ai-drafts/${draftId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;

}


/* ================================================================
   UPDATE READY AI DRAFT
================================================================ */

export async function updatePurchaseBillAIDraft(
  draftId: number,

  data:
    PurchaseBillAIDataResponse
):
Promise<PurchaseBillAIDraftDetail> {

  const response =
    await axios.put<
      PurchaseBillAIDraftDetail
    >(
      `${API_BASE_URL}/purchase-bills/ai-drafts/${draftId}`,
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
   CANCEL AI DRAFT
================================================================ */

export async function cancelPurchaseBillAIDraft(
  draftId: number
):
Promise<PurchaseBillAIDraftDetail> {

  const response =
    await axios.post<
      PurchaseBillAIDraftDetail
    >(
      `${API_BASE_URL}/purchase-bills/ai-drafts/${draftId}/cancel`,
      {},
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;

}


/* ================================================================
   CONFIRM AI DRAFT
================================================================ */

export async function confirmPurchaseBillAIDraft(
  draftId: number
):
Promise<{
  success: boolean;

  draft_id: number;

  status: string;

  purchase_bill_id: number;

  bill_number: string;

  supplier_id: number;

  grand_total: number;
}> {

  const response =
    await axios.post<{
      success: boolean;

      draft_id: number;

      status: string;

      purchase_bill_id: number;

      bill_number: string;

      supplier_id: number;

      grand_total: number;
    }>(
      `${API_BASE_URL}/purchase-bills/ai-drafts/${draftId}/confirm`,
      {},
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;

}


/* ================================================================
   GET AI BATCH
================================================================ */

export async function getPurchaseBillAIBatch(
  batchId: number
):
Promise<PurchaseBillAIBatchResponse> {

  const response =
    await axios.get<
      PurchaseBillAIBatchResponse
    >(
      `${API_BASE_URL}/purchase-bills/ai-batches/${batchId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;

}


/* ================================================================
   GET PURCHASE BILLS
================================================================ */

export async function getPurchaseBills(
  search?: string
):
Promise<PurchaseBill[]> {

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
   GET PURCHASE BILL
================================================================ */

export async function getPurchaseBill(
  purchaseBillId: number
):
Promise<PurchaseBill> {

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
   GET PURCHASE BILL BY ID ALIAS
================================================================ */

export async function getPurchaseBillById(
  purchaseBillId: number
):
Promise<PurchaseBill> {

  return getPurchaseBill(
    purchaseBillId
  );

}


/* ================================================================
   STATISTICS
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
   EXISTING MANUAL / SINGLE EXTRACTION CONFIRM
================================================================ */

export async function confirmPurchaseBill(
  data:
    PurchaseBillConfirmRequest
):
Promise<PurchaseBillConfirmResponse> {

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
   UPDATE PURCHASE BILL
================================================================ */

export async function updatePurchaseBill(
  purchaseBillId: number,

  data:
    PurchaseBillUpdateRequest
):
Promise<PurchaseBill> {

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
   CANCEL PURCHASE BILL
================================================================ */

export async function deactivatePurchaseBill(
  purchaseBillId: number
):
Promise<{
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
   PAYMENT SUMMARY
================================================================ */

export async function getPurchaseBillPaymentSummary(
  purchaseBillId: number
):
Promise<PurchaseBillPaymentSummary> {

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
   RECORD PAYMENT
================================================================ */

export async function recordPurchaseBillPayment(
  purchaseBillId: number,

  data:
    PurchaseBillPaymentCreate
):
Promise<PurchaseBillPayment> {

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
   UNPAID AGING
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