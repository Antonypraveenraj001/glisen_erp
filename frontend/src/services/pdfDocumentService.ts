import axios from "axios";


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
   RENDER PDF
================================================================ */

export async function renderPdfFromHtml(
  html: string
): Promise<Blob> {

  const response =
    await axios.post(
      `${API_BASE_URL}/documents/pdf`,
      {
        html,
      },
      {
        headers: {
          ...getAuthHeaders(),

          "Content-Type":
            "application/json",
        },

        responseType:
          "blob",
      }
    );


  return response.data;
}


/* ================================================================
   DOWNLOAD PDF

   The caller chooses the actual ERP document filename:

       PRO-2026-0014.pdf
       INV-2026-0010.pdf
================================================================ */

export async function downloadPdfFromHtml(
  html: string,
  filename: string
): Promise<void> {

  const pdfBlob =
    await renderPdfFromHtml(
      html
    );


  const url =
    URL.createObjectURL(
      pdfBlob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    filename
      .toLowerCase()
      .endsWith(
        ".pdf"
      )
        ? filename
        : `${filename}.pdf`;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  window.setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );

}