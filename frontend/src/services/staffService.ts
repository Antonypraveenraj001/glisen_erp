import axios from "axios";

import type {
  Staff,
  StaffCreatePayload,
  StaffFilters,
  StaffListResponse,
  StaffUpdatePayload,
} from "../types/staff";


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
   GET STAFF
========================================================= */

export async function getStaff(
  filters: StaffFilters = {}
): Promise<StaffListResponse> {

  const response =
    await axios.get<StaffListResponse>(
      `${API_BASE_URL}/staff`,
      {
        headers:
          getAuthHeaders(),

        params: {
          active_only:
            filters.active_only
            ?? false,

          search:
            filters.search
              ?.trim()
            || undefined,
        },
      }
    );

  return response.data;
}


/* =========================================================
   GET STAFF MEMBER
========================================================= */

export async function getStaffById(
  staffId: number
): Promise<Staff> {

  const response =
    await axios.get<Staff>(
      `${API_BASE_URL}/staff/${staffId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   CREATE STAFF
========================================================= */

export async function createStaff(
  payload:
    StaffCreatePayload
): Promise<Staff> {

  const response =
    await axios.post<Staff>(
      `${API_BASE_URL}/staff`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   UPDATE STAFF
========================================================= */

export async function updateStaff(
  staffId: number,
  payload:
    StaffUpdatePayload
): Promise<Staff> {

  const response =
    await axios.put<Staff>(
      `${API_BASE_URL}/staff/${staffId}`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   DEACTIVATE STAFF
========================================================= */

export async function deactivateStaff(
  staffId: number
): Promise<Staff> {

  const response =
    await axios.delete<Staff>(
      `${API_BASE_URL}/staff/${staffId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}