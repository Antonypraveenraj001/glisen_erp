import axios from "axios";

import type {
  ChangePasswordPayload,
  CreateManagedUserPayload,
  ManagedRole,
  ManagedUser,
  PasswordActionResponse,
  ResetPasswordPayload,
  UpdateManagedUserPayload,
} from "../types/userManagement";


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


/* ================================================================
   USERS
================================================================ */

export async function getManagedUsers():
Promise<ManagedUser[]> {

  const response =
    await axios.get<
      ManagedUser[]
    >(
      `${API_BASE_URL}/users`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function getManagedRoles():
Promise<ManagedRole[]> {

  const response =
    await axios.get<
      ManagedRole[]
    >(
      `${API_BASE_URL}/users/roles`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function createManagedUser(
  payload:
    CreateManagedUserPayload
):
Promise<ManagedUser> {

  const response =
    await axios.post<
      ManagedUser
    >(
      `${API_BASE_URL}/users`,
      payload,
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


export async function updateManagedUser(
  userId: number,
  payload:
    UpdateManagedUserPayload
):
Promise<ManagedUser> {

  const response =
    await axios.put<
      ManagedUser
    >(
      `${API_BASE_URL}/users/${userId}`,
      payload,
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


export async function setManagedUserStatus(
  userId: number,
  isActive: boolean
):
Promise<ManagedUser> {

  const response =
    await axios.patch<
      ManagedUser
    >(
      `${API_BASE_URL}/users/${userId}/status`,
      {
        is_active:
          isActive,
      },
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
   SECURITY
================================================================ */

export async function changeMyPassword(
  payload:
    ChangePasswordPayload
):
Promise<PasswordActionResponse> {

  const response =
    await axios.post<
      PasswordActionResponse
    >(
      `${API_BASE_URL}/security/change-password`,
      payload,
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


export async function resetManagedUserPassword(
  userId: number,
  payload:
    ResetPasswordPayload
):
Promise<PasswordActionResponse> {

  const response =
    await axios.post<
      PasswordActionResponse
    >(
      `${API_BASE_URL}/security/users/${userId}/reset-password`,
      payload,
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