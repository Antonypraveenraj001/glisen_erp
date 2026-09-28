import axios from "axios";

import type {
  BusinessSettings,
  BusinessSettingsPayload,
  CompanySettings,
  CompanySettingsPayload,
  DocumentSettings,
  DocumentSettingsPayload,
} from "../types/settings";


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
   COMPANY SETTINGS
================================================================ */

export async function getCompanySettings():
Promise<CompanySettings> {

  const response =
    await axios.get<
      CompanySettings
    >(
      `${API_BASE_URL}/company-settings`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function createCompanySettings(
  payload:
    CompanySettingsPayload
):
Promise<CompanySettings> {

  const response =
    await axios.post<
      CompanySettings
    >(
      `${API_BASE_URL}/company-settings`,
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


export async function updateCompanySettings(
  payload:
    CompanySettingsPayload
):
Promise<CompanySettings> {

  const response =
    await axios.put<
      CompanySettings
    >(
      `${API_BASE_URL}/company-settings`,
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


/* ================================================================
   COMPANY LOGO
================================================================ */

export async function uploadCompanyLogo(
  file: File
):
Promise<CompanySettings> {

  const formData =
    new FormData();


  formData.append(
    "file",
    file
  );


  const response =
    await axios.post<
      CompanySettings
    >(
      `${API_BASE_URL}/company-settings/logo`,
      formData,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function deleteCompanyLogo():
Promise<CompanySettings> {

  const response =
    await axios.delete<
      CompanySettings
    >(
      `${API_BASE_URL}/company-settings/logo`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function getCompanyLogoBlob():
Promise<Blob> {

  const response =
    await axios.get(
      `${API_BASE_URL}/company-settings/logo`,
      {
        headers:
          getAuthHeaders(),

        responseType:
          "blob",
      }
    );


  return response.data;
}


/* ================================================================
   DOCUMENT SETTINGS
================================================================ */

export async function getDocumentSettings():
Promise<DocumentSettings> {

  const response =
    await axios.get<
      DocumentSettings
    >(
      `${API_BASE_URL}/document-settings`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function updateDocumentSettings(
  payload:
    DocumentSettingsPayload
):
Promise<DocumentSettings> {

  const response =
    await axios.put<
      DocumentSettings
    >(
      `${API_BASE_URL}/document-settings`,
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


/* ================================================================
   BUSINESS SETTINGS
================================================================ */

export async function getBusinessSettings():
Promise<BusinessSettings> {

  const response =
    await axios.get<
      BusinessSettings
    >(
      `${API_BASE_URL}/business-settings`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


export async function updateBusinessSettings(
  payload:
    BusinessSettingsPayload
):
Promise<BusinessSettings> {

  const response =
    await axios.put<
      BusinessSettings
    >(
      `${API_BASE_URL}/business-settings`,
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