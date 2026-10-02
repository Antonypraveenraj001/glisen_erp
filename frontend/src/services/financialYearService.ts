import axios from "axios";

import type {
  FinancialYearOverview,
  FinancialYearTransitionResponse,
} from "../types/financialYear";


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


export async function getFinancialYearOverview():
Promise<FinancialYearOverview> {
  const response =
    await axios.get<FinancialYearOverview>(
      `${API_BASE_URL}/financial-years/overview`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function transitionFinancialYear(
  confirmation: string
):
Promise<FinancialYearTransitionResponse> {
  const response =
    await axios.post<FinancialYearTransitionResponse>(
      `${API_BASE_URL}/financial-years/transition`,
      {
        confirmation,
      },
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}
