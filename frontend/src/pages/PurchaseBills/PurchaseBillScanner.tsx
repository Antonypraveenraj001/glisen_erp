import {
  useState,
} from "react";

import type {
  ChangeEvent,
  DragEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FileImage,
  Files,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import {
  extractPurchaseBillBatch,
} from "../../services/purchaseBillService";


/* ================================================================
   HELPERS
================================================================ */

function formatFileSize(
  bytes: number
) {

  const megabytes =
    bytes
    /
    1024
    /
    1024;


  return (
    `${megabytes.toFixed(2)} MB`
  );

}


function makeFileKey(
  file: File
) {

  return (
    `${file.name}-${file.size}-${file.lastModified}`
  );

}


/* ================================================================
   PAGE
================================================================ */

export default function PurchaseBillScanner() {

  const navigate =
    useNavigate();


  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<
      File[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     ADD FILES
  ============================================================== */

  function addFiles(
    incomingFiles:
      File[]
  ) {

    const imageFiles =
      incomingFiles.filter(
        file =>
          (
            file.type
            ===
            "image/jpeg"
          )
          ||
          (
            file.type
            ===
            "image/png"
          )
          ||
          /\.(jpg|jpeg|png)$/i.test(
            file.name
          )
      );


    if (
      imageFiles.length
      ===
      0
    ) {

      setError(
        "Please select PNG, JPG, or JPEG purchase bill images."
      );

      return;

    }


    setError(
      ""
    );


    setSelectedFiles(
      current => {

        const existingKeys =
          new Set(
            current.map(
              makeFileKey
            )
          );


        const newFiles =
          imageFiles.filter(
            file =>
              !existingKeys.has(
                makeFileKey(
                  file
                )
              )
          );


        return [
          ...current,
          ...newFiles,
        ];

      }
    );

  }


  /* ==============================================================
     FILE INPUT
  ============================================================== */

  function handleBrowse(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    if (
      !event.target.files
    ) {
      return;
    }


    addFiles(
      Array.from(
        event.target.files
      )
    );


    /*
     * Reset so the same file can be
     * selected again after removal.
     */

    event.target.value =
      "";

  }


  /* ==============================================================
     DRAG / DROP
  ============================================================== */

  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {

    event.preventDefault();


    if (
      loading
    ) {
      return;
    }


    addFiles(
      Array.from(
        event.dataTransfer.files
      )
    );

  }


  /* ==============================================================
     REMOVE FILE
  ============================================================== */

  function removeFile(
    fileToRemove:
      File
  ) {

    const targetKey =
      makeFileKey(
        fileToRemove
      );


    setSelectedFiles(
      current =>
        current.filter(
          file =>
            makeFileKey(
              file
            )
            !==
            targetKey
        )
    );

  }


  /* ==============================================================
     EXTRACT BATCH
  ============================================================== */

  async function handleExtract() {

    if (
      selectedFiles.length
      ===
      0
    ) {

      setError(
        "Please select at least one purchase bill image."
      );

      return;

    }


    try {

      setLoading(
        true
      );


      setError(
        ""
      );


      const response =
        await extractPurchaseBillBatch(
          selectedFiles
        );


      /*
       * Images are no longer needed by the
       * frontend once upload is accepted.
       */

      setSelectedFiles(
        []
      );


      /*
       * Go straight to this batch.
       *
       * AI extraction continues on the backend.
       */

      navigate(
        `/purchase-bills/drafts?batch=${response.batch_id}`
      );

    } catch (
      err
    ) {

      console.error(
        "Purchase Bill batch extraction error:",
        err
      );


      setError(
        "Unable to queue the purchase bills for extraction."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  /* ==============================================================
     MANUAL ENTRY
  ============================================================== */

  function handleManualEntry() {

    navigate(
      "/purchase-bills/review?mode=manual"
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div>

      {/* ========================================================
          HEADER
      ========================================================= */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "20px",

          marginBottom:
            "25px",
        }}
      >

        <div>

          <div
            style={{
              color:
                "#55739e",

              fontSize:
                "11px",

              fontWeight:
                800,

              letterSpacing:
                "0.08em",

              marginBottom:
                "6px",
            }}
          >
            PURCHASE BILL AI
          </div>


          <h1
            style={{
              margin:
                "0 0 6px",

              color:
                "#1f3555",
            }}
          >
            Upload Purchase Bills
          </h1>


          <p
            style={{
              margin:
                0,

              color:
                "#6b7d98",

              lineHeight:
                1.6,
            }}
          >
            Upload several supplier bill images together.
            AI extraction will continue in the background.
          </p>

        </div>


        <div
          style={{
            display:
              "flex",

            gap:
              "10px",

            flexWrap:
              "wrap",
          }}
        >

          <button
            type="button"
            onClick={
              () =>
                navigate(
                  "/purchase-bills/drafts"
                )
            }
            disabled={
              loading
            }
            style={{
              padding:
                "10px 15px",

              border:
                "1px solid #b8c7db",

              background:
                "#ffffff",

              color:
                "#31547f",

              borderRadius:
                "7px",

              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",

              fontWeight:
                700,
            }}
          >
            Extracted Bills
          </button>


          <button
            type="button"
            onClick={
              () =>
                navigate(
                  "/purchase-bills"
                )
            }
            disabled={
              loading
            }
            style={{
              padding:
                "10px 15px",

              border:
                "1px solid #d1d9e6",

              background:
                "#ffffff",

              borderRadius:
                "7px",

              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Back to Purchase Bills
          </button>

        </div>

      </div>


      {/* ========================================================
          IMPORTANT RULE
      ========================================================= */}

      <div
        style={{
          marginBottom:
            "20px",

          padding:
            "14px 16px",

          background:
            "#eff6ff",

          border:
            "1px solid #bfdbfe",

          borderRadius:
            "8px",

          color:
            "#1e40af",

          fontSize:
            "13px",

          lineHeight:
            1.6,
        }}
      >
        <strong>
          Draft extraction only:
        </strong>

        {" "}

        Uploading these images does not create a Supplier,
        Purchase Bill, Product, GST transaction, or Stock movement.
        Those changes happen only after you later review and confirm
        an extracted draft.
      </div>


      {/* ========================================================
          AI UPLOAD CARD
      ========================================================= */}

      <div
        style={{
          background:
            "#ffffff",

          border:
            "1px solid #e1e8f2",

          borderRadius:
            "12px",

          overflow:
            "hidden",

          marginBottom:
            "24px",
        }}
      >

        <div
          style={{
            padding:
              "20px 22px",

            borderBottom:
              "1px solid #e7edf5",

            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "15px",
          }}
        >

          <div>

            <h2
              style={{
                margin:
                  "0 0 5px",

                color:
                  "#233d61",

                fontSize:
                  "17px",
              }}
            >
              AI Batch Extraction
            </h2>


            <p
              style={{
                margin:
                  0,

                color:
                  "#7b8ca5",

                fontSize:
                  "12px",
              }}
            >
              Select one or many purchase bill images.
            </p>

          </div>


          <div
            style={{
              padding:
                "6px 10px",

              borderRadius:
                "999px",

              background:
                "#eaf4ff",

              color:
                "#3567b7",

              fontWeight:
                800,

              fontSize:
                "11px",
            }}
          >
            AI ASSISTED
          </div>

        </div>


        <div
          style={{
            padding:
              "22px",
          }}
        >

          {/* ====================================================
              DROP AREA
          ==================================================== */}

          <div
            onDrop={
              handleDrop
            }
            onDragOver={
              event =>
                event.preventDefault()
            }
            style={{
              border:
                "2px dashed #b9c9dd",

              borderRadius:
                "12px",

              padding:
                "36px 20px",

              background:
                "#f8fbff",

              textAlign:
                "center",
            }}
          >

            <Upload
              size={34}
              style={{
                marginBottom:
                  "12px",

                color:
                  "#4e76ad",
              }}
            />


            <h3
              style={{
                margin:
                  "0 0 8px",

                color:
                  "#294567",
              }}
            >
              Drag & Drop Purchase Bill Images
            </h3>


            <p
              style={{
                margin:
                  "0 0 18px",

                color:
                  "#7b8ca5",

                fontSize:
                  "13px",
              }}
            >
              Select as many PNG, JPG, or JPEG bills as required.
            </p>


            <label
              style={{
                display:
                  "inline-block",

                padding:
                  "11px 18px",

                background:
                  loading
                    ? "#94a3b8"
                    : "#2563eb",

                color:
                  "#ffffff",

                borderRadius:
                  "7px",

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",

                fontWeight:
                  700,
              }}
            >
              Choose Bill Images

              <input
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={
                  handleBrowse
                }
                disabled={
                  loading
                }
                style={{
                  display:
                    "none",
                }}
              />
            </label>

          </div>


          {/* ====================================================
              SELECTED FILES
          ==================================================== */}

          {
            selectedFiles.length
            >
            0
            &&
            (
              <div
                style={{
                  marginTop:
                    "22px",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "center",

                    marginBottom:
                      "12px",

                    gap:
                      "12px",
                  }}
                >

                  <div>

                    <div
                      style={{
                        color:
                          "#294567",

                        fontWeight:
                          800,
                      }}
                    >
                      {
                        selectedFiles.length
                      }
                      {" "}
                      {
                        selectedFiles.length
                        ===
                        1
                          ? "bill selected"
                          : "bills selected"
                      }
                    </div>


                    <div
                      style={{
                        marginTop:
                          "4px",

                        color:
                          "#8191a8",

                        fontSize:
                          "11px",
                      }}
                    >
                      Each image will become an independent
                      extraction draft.
                    </div>

                  </div>


                  <button
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={
                      () =>
                        setSelectedFiles(
                          []
                        )
                    }
                    style={{
                      border:
                        "1px solid #d8e0ea",

                      background:
                        "#ffffff",

                      borderRadius:
                        "6px",

                      padding:
                        "7px 11px",

                      cursor:
                        loading
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Clear All
                  </button>

                </div>


                <div
                  style={{
                    border:
                      "1px solid #e4eaf2",

                    borderRadius:
                      "8px",

                    overflow:
                      "hidden",
                  }}
                >

                  {
                    selectedFiles.map(
                      (
                        file,
                        index
                      ) => (

                        <div
                          key={
                            makeFileKey(
                              file
                            )
                          }
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "space-between",

                            gap:
                              "14px",

                            padding:
                              "12px 14px",

                            borderTop:
                              index
                              ===
                              0
                                ? "none"
                                : "1px solid #edf1f6",
                          }}
                        >

                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              minWidth:
                                0,

                              gap:
                                "10px",
                            }}
                          >

                            <FileImage
                              size={18}
                              color="#4e76ad"
                            />


                            <div
                              style={{
                                minWidth:
                                  0,
                              }}
                            >

                              <div
                                style={{
                                  color:
                                    "#294567",

                                  fontWeight:
                                    650,

                                  fontSize:
                                    "12px",

                                  overflow:
                                    "hidden",

                                  textOverflow:
                                    "ellipsis",

                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {file.name}
                              </div>


                              <div
                                style={{
                                  color:
                                    "#8a98ab",

                                  fontSize:
                                    "10px",

                                  marginTop:
                                    "3px",
                                }}
                              >
                                {
                                  formatFileSize(
                                    file.size
                                  )
                                }
                              </div>

                            </div>

                          </div>


                          <button
                            type="button"
                            disabled={
                              loading
                            }
                            title="Remove"
                            onClick={
                              () =>
                                removeFile(
                                  file
                                )
                            }
                            style={{
                              border:
                                "none",

                              background:
                                "transparent",

                              color:
                                "#c24141",

                              cursor:
                                loading
                                  ? "not-allowed"
                                  : "pointer",

                              display:
                                "flex",

                              alignItems:
                                "center",
                            }}
                          >
                            <Trash2
                              size={16}
                            />
                          </button>

                        </div>

                      )
                    )
                  }

                </div>

              </div>
            )
          }


          {/* ====================================================
              ERROR
          ==================================================== */}

          {
            error
            &&
            (
              <div
                style={{
                  marginTop:
                    "18px",

                  padding:
                    "12px 14px",

                  border:
                    "1px solid #fecaca",

                  background:
                    "#fef2f2",

                  color:
                    "#991b1b",

                  borderRadius:
                    "7px",
                }}
              >
                {error}
              </div>
            )
          }


          {/* ====================================================
              ACTIONS
          ==================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "flex-end",

              alignItems:
                "center",

              gap:
                "12px",

              marginTop:
                "22px",
            }}
          >

            <button
              type="button"
              onClick={
                handleManualEntry
              }
              disabled={
                loading
              }
              style={{
                padding:
                  "11px 16px",

                border:
                  "1px solid #cbd5e1",

                background:
                  "#ffffff",

                color:
                  "#475569",

                borderRadius:
                  "7px",

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",

                fontWeight:
                  650,
              }}
            >
              Manual Entry
            </button>


            <button
              type="button"
              onClick={
                () =>
                  void handleExtract()
              }
              disabled={
                loading
                ||
                selectedFiles.length
                ===
                0
              }
              style={{
                minWidth:
                  "170px",

                display:
                  "inline-flex",

                justifyContent:
                  "center",

                alignItems:
                  "center",

                gap:
                  "8px",

                padding:
                  "11px 18px",

                border:
                  "none",

                background:
                  loading
                  ||
                  selectedFiles.length
                  ===
                  0
                    ? "#93a4ba"
                    : "#2563eb",

                color:
                  "#ffffff",

                borderRadius:
                  "7px",

                cursor:
                  loading
                  ||
                  selectedFiles.length
                  ===
                  0
                    ? "not-allowed"
                    : "pointer",

                fontWeight:
                  800,
              }}
            >

              {
                loading
                  ? (
                      <Loader2
                        size={17}
                        style={{
                          animation:
                            "spin 1s linear infinite",
                        }}
                      />
                    )
                  : (
                      <Files
                        size={17}
                      />
                    )
              }


              {
                loading
                  ? "Queuing Bills..."
                  : (
                      `Extract ${
                        selectedFiles.length
                        || ""
                      } ${
                        selectedFiles.length
                        ===
                        1
                          ? "Bill"
                          : "Bills"
                      }`
                    )
              }

            </button>

          </div>

        </div>

      </div>


      {/* ========================================================
          IMAGE STORAGE NOTE
      ========================================================= */}

      <div
        style={{
          padding:
            "14px 16px",

          background:
            "#f8fafc",

          border:
            "1px solid #e2e8f0",

          borderRadius:
            "8px",

          color:
            "#64748b",

          fontSize:
            "12px",

          lineHeight:
            1.6,
        }}
      >
        Uploaded images are used only for extraction.
        Glisen ERP stores the extracted draft information,
        not the original purchase bill image.
      </div>

    </div>
  );
}