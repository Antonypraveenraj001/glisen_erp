import axios from "axios";

import type {
  StockMovementFilters,
  StockMovementResponse,
  StockSummaryFilters,
  StockSummaryResponse,
} from "../types/stock";


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


export async function getStockSummary(
  filters: StockSummaryFilters = {}
): Promise<StockSummaryResponse> {

  const response =
    await axios.get<StockSummaryResponse>(
      `${API_BASE_URL}/stock-report/summary`,
      {
        headers: getAuthHeaders(),

        params: {
          search:
            filters.search?.trim() ||
            undefined,

          stock_status:
            filters.stock_status ||
            undefined,
        },
      }
    );

  return response.data;
}


export async function getStockMovements(
  filters: StockMovementFilters = {}
): Promise<StockMovementResponse> {

  const response =
    await axios.get<StockMovementResponse>(
      `${API_BASE_URL}/stock-report/movements`,
      {
        headers: getAuthHeaders(),

        params: {
          product_id:
            filters.product_id ||
            undefined,

          movement_type:
            filters.movement_type ||
            undefined,

          start_date:
            filters.start_date ||
            undefined,

          end_date:
            filters.end_date ||
            undefined,
        },
      }
    );

  return response.data;
}