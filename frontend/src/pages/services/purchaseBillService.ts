import axios from "axios";

import type {
  PurchaseBillAIResponse,
  PurchaseBillConfirmRequest,
  PurchaseBillConfirmResponse,
  PurchaseBill,
} from "../../types/purchaseBill";

/*
==================================================
API CONFIGURATION
==================================================
*/

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
});

/*
==================================================
AI PURCHASE BILL EXTRACTION
==================================================
*/

export const extractPurchaseBill = async (
  file: File
): Promise<PurchaseBillAIResponse> => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await API.post<PurchaseBillAIResponse>(
    "/purchase-bill-ai/extract",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

/*
==================================================
CONFIRM PURCHASE BILL
==================================================
*/

export const confirmPurchaseBill = async (
  data: PurchaseBillConfirmRequest
): Promise<PurchaseBillConfirmResponse> => {
  const response =
    await API.post<PurchaseBillConfirmResponse>(
      "/purchase-bill-confirm",
      data
    );

  return response.data;
};

/*
==================================================
GET ALL PURCHASE BILLS
==================================================
*/

export const getPurchaseBills = async (): Promise<
  PurchaseBill[]
> => {
  const response =
    await API.get<PurchaseBill[]>(
      "/purchase-bills"
    );

  return response.data;
};

/*
==================================================
GET SINGLE PURCHASE BILL
==================================================
*/

export const getPurchaseBillById = async (
  id: number
): Promise<PurchaseBill> => {
  const response =
    await API.get<PurchaseBill>(
      `/purchase-bills/${id}`
    );

  return response.data;
};

/*
==================================================
DELETE PURCHASE BILL
==================================================
*/

export const deletePurchaseBill = async (
  id: number
): Promise<void> => {
  await API.delete(
    `/purchase-bills/${id}`
  );
};