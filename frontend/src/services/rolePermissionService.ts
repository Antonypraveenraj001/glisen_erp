import axios from "axios";

import type {
  RolePermissionMatrixResponse,
  UpdateRolePermissionsPayload,
  UpdateRolePermissionsResponse,
} from "../types/rolePermissions";


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


export async function getRolePermissionMatrix():
Promise<RolePermissionMatrixResponse> {

  const response =
    await axios.get<
      RolePermissionMatrixResponse
    >(
      `${API_BASE_URL}/role-permissions/matrix`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function updateRolePermissions(
  roleId: number,
  payload:
    UpdateRolePermissionsPayload
):
Promise<UpdateRolePermissionsResponse> {

  const response =
    await axios.put<
      UpdateRolePermissionsResponse
    >(
      `${API_BASE_URL}/role-permissions/roles/${roleId}`,
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