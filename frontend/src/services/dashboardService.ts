import axios from "axios";

import type {
  DashboardSummary,
} from "../types/dashboard";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


function getAuthHeaders() {
  const token =
    localStorage.getItem(
      "access_token"
    );

  if (!token) {
    throw new Error(
      "Authentication token not found."
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}


export async function getDashboardSummary():
  Promise<DashboardSummary> {

  const response =
    await axios.get<DashboardSummary>(
      `${API_BASE_URL}/dashboard/summary`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}