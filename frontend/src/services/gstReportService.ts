import axios from "axios";

import type {
  GSTReportResponse,
  PurchaseGSTReportResponse,
} from "../types/gstReport";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


export interface GSTReportFilters {
  start_date?: string;
  end_date?: string;
}


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


function downloadBlob(
  data: BlobPart,
  disposition:
    string | undefined,
  fallbackFilename: string
) {

  const blobUrl =
    window.URL.createObjectURL(
      new Blob([
        data,
      ])
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    blobUrl;


  let filename =
    fallbackFilename;


  if (disposition) {

    const match =
      disposition.match(
        /filename="?([^"]+)"?/
      );


    if (
      match?.[1]
    ) {
      filename =
        match[1];
    }

  }


  link.setAttribute(
    "download",
    filename
  );


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  window.URL.revokeObjectURL(
    blobUrl
  );
}


/* ================================================================
   SALES GST
================================================================ */

export async function getGSTReport(
  filters:
    GSTReportFilters = {}
): Promise<GSTReportResponse> {

  const response =
    await axios.get<
      GSTReportResponse
    >(
      `${API_BASE_URL}/gst-report`,
      {
        headers:
          getAuthHeaders(),

        params: {
          start_date:
            filters.start_date
            || undefined,

          end_date:
            filters.end_date
            || undefined,
        },
      }
    );


  return response.data;
}


export async function downloadGSTReportExcel(
  filters:
    GSTReportFilters = {}
): Promise<void> {

  const response =
    await axios.get(
      `${API_BASE_URL}/gst-report/export-excel`,
      {
        headers:
          getAuthHeaders(),

        params: {
          start_date:
            filters.start_date
            || undefined,

          end_date:
            filters.end_date
            || undefined,
        },

        responseType:
          "blob",
      }
    );


  downloadBlob(
    response.data,

    response.headers[
      "content-disposition"
    ],

    "sales_gst_report.xlsx"
  );
}


/* ================================================================
   PURCHASE GST
================================================================ */

export async function getPurchaseGSTReport(
  filters:
    GSTReportFilters = {}
): Promise<PurchaseGSTReportResponse> {

  const response =
    await axios.get<
      PurchaseGSTReportResponse
    >(
      `${API_BASE_URL}/gst-report/purchase`,
      {
        headers:
          getAuthHeaders(),

        params: {
          start_date:
            filters.start_date
            || undefined,

          end_date:
            filters.end_date
            || undefined,
        },
      }
    );


  return response.data;
}


export async function downloadPurchaseGSTReportExcel(
  filters:
    GSTReportFilters = {}
): Promise<void> {

  const response =
    await axios.get(
      `${API_BASE_URL}/gst-report/purchase/export-excel`,
      {
        headers:
          getAuthHeaders(),

        params: {
          start_date:
            filters.start_date
            || undefined,

          end_date:
            filters.end_date
            || undefined,
        },

        responseType:
          "blob",
      }
    );


  downloadBlob(
    response.data,

    response.headers[
      "content-disposition"
    ],

    "purchase_gst_report.xlsx"
  );
}