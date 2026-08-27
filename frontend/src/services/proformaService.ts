import axios from "axios";

import type {
  Proforma,
  ProformaCreate,
  ProformaFilters,
  ProformaUpdate,
} from "../types/proforma";

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
   GET ALL PROFORMAS
========================================================= */

export async function getProformas(
  filters?: ProformaFilters
): Promise<Proforma[]> {
  const params: Record<
    string,
    string | number
  > = {};

  if (filters?.search?.trim()) {
    params.search =
      filters.search.trim();
  }

  if (filters?.status) {
    params.status = filters.status;
  }

  if (
    filters?.customer_id !== undefined
  ) {
    params.customer_id =
      filters.customer_id;
  }

  if (
    filters?.enquiry_id !== undefined
  ) {
    params.enquiry_id =
      filters.enquiry_id;
  }

  const response =
    await axios.get<Proforma[]>(
      `${API_BASE_URL}/proformas`,
      {
        headers: getAuthHeaders(),
        params,
      }
    );

  return response.data;
}

/* =========================================================
   GET PROFORMA BY ID
========================================================= */

export async function getProformaById(
  proformaId: number
): Promise<Proforma> {
  const response =
    await axios.get<Proforma>(
      `${API_BASE_URL}/proformas/${proformaId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}

/* =========================================================
   GET PROFORMA BY NUMBER
========================================================= */

export async function getProformaByNumber(
  proformaNumber: string
): Promise<Proforma> {
  const response =
    await axios.get<Proforma>(
      `${API_BASE_URL}/proformas/number/${encodeURIComponent(
        proformaNumber
      )}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}

/* =========================================================
   GET PROFORMAS BY ENQUIRY
========================================================= */

export async function getProformasByEnquiry(
  enquiryId: number
): Promise<Proforma[]> {
  const response =
    await axios.get<Proforma[]>(
      `${API_BASE_URL}/proformas/enquiry/${enquiryId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}

/* =========================================================
   CREATE
========================================================= */

export async function createProforma(
  data: ProformaCreate
): Promise<Proforma> {
  const response =
    await axios.post<Proforma>(
      `${API_BASE_URL}/proformas`,
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

/* =========================================================
   UPDATE
========================================================= */

export async function updateProforma(
  proformaId: number,
  data: ProformaUpdate
): Promise<Proforma> {
  const response =
    await axios.put<Proforma>(
      `${API_BASE_URL}/proformas/${proformaId}`,
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

/* =========================================================
   UPDATE STATUS
========================================================= */

export async function updateProformaStatus(
  proformaId: number,
  status: string
): Promise<Proforma> {
  const response =
    await axios.patch<Proforma>(
      `${API_BASE_URL}/proformas/${proformaId}/status`,
      null,
      {
        headers: getAuthHeaders(),
        params: {
          status,
        },
      }
    );

  return response.data;
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteProforma(
  proformaId: number
) {
  const response =
    await axios.delete(
      `${API_BASE_URL}/proformas/${proformaId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}