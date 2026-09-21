import axios from "axios";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


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


/* =========================================================
   TYPES
========================================================= */

export interface FinishedGoodsReceipt {
  id: number;

  receipt_number: string;

  production_order_id: number;
  product_id: number;

  quantity_received: string;

  stock_before: string;
  stock_after: string;

  received_by: number;
  received_at: string;

  remarks: string | null;
}


export interface FinishedGoodsReceiptCreatePayload {
  remarks?: string | null;
}


/* =========================================================
   MOVE COMPLETED PRODUCTION TO FINISHED PRODUCTS
========================================================= */

export async function moveProductionToFinishedProducts(
  productionOrderId: number,
  payload:
    FinishedGoodsReceiptCreatePayload = {}
): Promise<FinishedGoodsReceipt> {

  const response =
    await axios.post<
      FinishedGoodsReceipt
    >(
      `${API_BASE_URL}/finished-goods-receipts/production-orders/${productionOrderId}/receive-stock`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}