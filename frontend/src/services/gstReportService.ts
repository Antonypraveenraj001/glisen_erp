import axios from "axios";

import type {
  GSTReportResponse,
} from "../types/gstReport";


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


export interface GSTReportFilters {
  start_date?: string;
  end_date?: string;
}


export async function getGSTReport(
  filters: GSTReportFilters = {}
): Promise<GSTReportResponse> {

  const response =
    await axios.get<GSTReportResponse>(
      `${API_BASE_URL}/gst-report`,
      {
        headers: getAuthHeaders(),

        params: {
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


export async function downloadGSTReportExcel(
  filters: GSTReportFilters = {}
): Promise<void> {

  const response =
    await axios.get(
      `${API_BASE_URL}/gst-report/export-excel`,
      {
        headers: getAuthHeaders(),

        params: {
          start_date:
            filters.start_date ||
            undefined,

          end_date:
            filters.end_date ||
            undefined,
        },

        responseType: "blob",
      }
    );


  const blobUrl =
    window.URL.createObjectURL(
      new Blob([response.data])
    );


  const link =
    document.createElement("a");

  link.href = blobUrl;


  const disposition =
    response.headers[
      "content-disposition"
    ];


  let filename =
    "gst_report.xlsx";


  if (disposition) {
    const match =
      disposition.match(
        /filename="?([^"]+)"?/
      );

    if (match?.[1]) {
      filename = match[1];
    }
  }


  link.setAttribute(
    "download",
    filename
  );


  document.body.appendChild(link);

  link.click();

  link.remove();


  window.URL.revokeObjectURL(
    blobUrl
  );
}