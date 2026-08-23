import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import type {
  PurchaseBillAIResponse,
  AISupplier,
  AIPurchaseBill,
  AIProduct,
} from "../../types/purchaseBill";

import {
  confirmPurchaseBill,
} from "../../services/purchaseBillService";

export default function PurchaseBillReview() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const isManualMode =
    searchParams.get("mode") === "manual";

  const [draft, setDraft] =
    useState<PurchaseBillAIResponse | null>(null);

  const [error, setError] =
    useState("");

  const [confirming, setConfirming] =
    useState(false);

  /*
  ========================================
  INITIALIZE PAGE
  ========================================
  */

  useEffect(() => {
    /*
    ----------------------------------------
    MANUAL MODE
    ----------------------------------------
    */

    if (isManualMode) {
      const manualDraft: PurchaseBillAIResponse = {
        status: "manual",
        filename: "",
        data: {
          supplier: {
            company_name: "",
            contact_person: "",
            email: "",
            phone: "",
            gst_number: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            existing_supplier: false,
            supplier_id: null,
            match_type: null,
          },

          purchase_bill: {
            bill_number: "",
            bill_date: "",
            subtotal: 0,
            total_gst: 0,
            grand_total: 0,
            remarks: "",
          },

          products: [],
        },
      };

      setDraft(manualDraft);

      return;
    }

    /*
    ----------------------------------------
    AI MODE
    ----------------------------------------
    */

    const storedDraft =
      sessionStorage.getItem(
        "purchase_bill_draft"
      );

    if (!storedDraft) {
      setError(
        "No purchase bill draft found."
      );

      return;
    }

    try {
      const parsedDraft:
        PurchaseBillAIResponse =
        JSON.parse(storedDraft);

      setDraft(parsedDraft);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to read the purchase bill draft."
      );
    }
  }, [isManualMode]);

  /*
  ========================================
  SUPPLIER UPDATE
  ========================================
  */

  const updateSupplier = (
    field: keyof AISupplier,
    value: string
  ) => {
    if (!draft) return;

    setDraft({
      ...draft,

      data: {
        ...draft.data,

        supplier: {
          ...draft.data.supplier,
          [field]: value,
        },
      },
    });
  };

  /*
  ========================================
  PURCHASE BILL UPDATE
  ========================================
  */

  const updatePurchaseBill = (
    field: keyof AIPurchaseBill,
    value: string
  ) => {
    if (!draft) return;

    setDraft({
      ...draft,

      data: {
        ...draft.data,

        purchase_bill: {
          ...draft.data.purchase_bill,
          [field]: value,
        },
      },
    });
  };

  /*
  ========================================
  PRODUCT UPDATE
  ========================================
  */

  const updateProduct = (
    index: number,
    field: keyof AIProduct,
    value: string
  ) => {
    if (!draft) return;

    const updatedProducts = [
      ...draft.data.products,
    ];

    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
    };

    setDraft({
      ...draft,

      data: {
        ...draft.data,

        products:
          updatedProducts,
      },
    });
  };

  /*
  ========================================
  ADD PRODUCT
  ========================================
  */

  const addProduct = () => {
    if (!draft) return;

    const newProduct: AIProduct = {
      product_name: "",
      description: "",
      hsn_code: "",
      unit: "",
      quantity: 0,
      purchase_price: 0,
      gst_percentage: 0,
      line_total: 0,
      existing_product: false,
      product_id: null,
      match_type: null,
    };

    setDraft({
      ...draft,

      data: {
        ...draft.data,

        products: [
          ...draft.data.products,
          newProduct,
        ],
      },
    });
  };

  /*
  ========================================
  REMOVE PRODUCT
  ========================================
  */

  const removeProduct = (
    index: number
  ) => {
    if (!draft) return;

    const updatedProducts =
      draft.data.products.filter(
        (_, productIndex) =>
          productIndex !== index
      );

    setDraft({
      ...draft,

      data: {
        ...draft.data,

        products:
          updatedProducts,
      },
    });
  };

  /*
  ========================================
  CONFIRM PURCHASE BILL
  ========================================
  */

  const handleConfirm = async () => {
    if (!draft) return;

    try {
      setConfirming(true);
      setError("");

      /*
      ----------------------------------------
      Convert date for backend
      ----------------------------------------

      The backend currently expects:

      DD-MM-YYYY

      Example:

      31-Jul-2026
      ->
      31-07-2026
      */

      const convertDateForBackend = (
        dateValue: string
      ) => {
        if (!dateValue) {
          return "";
        }

        /*
        Already DD-MM-YYYY
        */

        if (
          /^\d{2}-\d{2}-\d{4}$/.test(
            dateValue
          )
        ) {
          return dateValue;
        }

        /*
        DD-MMM-YYYY

        Example:

        31-Jul-2026
        */

        const monthMap: Record<
          string,
          string
        > = {
          Jan: "01",
          Feb: "02",
          Mar: "03",
          Apr: "04",
          May: "05",
          Jun: "06",
          Jul: "07",
          Aug: "08",
          Sep: "09",
          Oct: "10",
          Nov: "11",
          Dec: "12",
        };

        const namedMonthMatch =
          dateValue.match(
            /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/
          );

        if (namedMonthMatch) {
          const day =
            namedMonthMatch[1].padStart(
              2,
              "0"
            );

          const month =
            monthMap[
              namedMonthMatch[2]
            ];

          const year =
            namedMonthMatch[3];

          if (month) {
            return `${day}-${month}-${year}`;
          }
        }

        /*
        YYYY-MM-DD

        Example:

        2026-07-31
        ->
        31-07-2026
        */

        const isoMatch =
          dateValue.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
          );

        if (isoMatch) {
          return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
        }

        /*
        Leave unknown format unchanged.
        */

        return dateValue;
      };

      const confirmationPayload = {
        supplier: {
          supplier_id:
            draft.data.supplier
              .supplier_id,

          company_name:
            draft.data.supplier
              .company_name,

          contact_person:
            draft.data.supplier
              .contact_person,

          email:
            draft.data.supplier.email,

          phone:
            draft.data.supplier.phone,

          gst_number:
            draft.data.supplier
              .gst_number,

          address:
            draft.data.supplier.address,

          city:
            draft.data.supplier.city,

          state:
            draft.data.supplier.state,

          pincode:
            draft.data.supplier.pincode,
        },

        purchase_bill: {
          bill_number:
            draft.data.purchase_bill
              .bill_number,

          bill_date:
            convertDateForBackend(
              draft.data.purchase_bill
                .bill_date
            ),

          subtotal:
            Number(
              draft.data.purchase_bill
                .subtotal
            ),

          total_gst:
            Number(
              draft.data.purchase_bill
                .total_gst
            ),

          grand_total:
            Number(
              draft.data.purchase_bill
                .grand_total
            ),

          remarks:
            draft.data.purchase_bill
              .remarks,
        },

        products:
          draft.data.products.map(
            (product) => ({
              product_id:
                product.product_id,

              product_name:
                product.product_name,

              description:
                product.description,

              hsn_code:
                product.hsn_code,

              unit:
                product.unit,

              quantity:
                Number(
                  product.quantity
                ),

              purchase_price:
                Number(
                  product.purchase_price
                ),

              gst_percentage:
                Number(
                  product.gst_percentage
                ),

              line_total:
                Number(
                  product.line_total
                ),
            })
          ),
      };

      console.log(
        "Confirming purchase bill:",
        confirmationPayload
      );

      const response =
        await confirmPurchaseBill(
          confirmationPayload
        );

      console.log(
        "Purchase bill confirmed:",
        response
      );

      /*
      ----------------------------------------
      Clear temporary AI draft
      ----------------------------------------
      */

      sessionStorage.removeItem(
        "purchase_bill_draft"
      );

      /*
      ----------------------------------------
      Go to Purchase Bills
      ----------------------------------------
      */

      navigate(
        "/purchase-bills"
      );
    } catch (err) {
      console.error(
        "Purchase bill confirmation error:",
        err
      );

      setError(
        "Unable to confirm the purchase bill. Please check the details and try again."
      );
    } finally {
      setConfirming(false);
    }
  };

  /*
  ========================================
  ERROR
  ========================================
  */

  if (error && !draft) {
    return (
      <div>
        <h1>
          Purchase Bill Review
        </h1>

        <p>{error}</p>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/purchase-bills/scan"
            )
          }
        >
          Back to Scanner
        </button>
      </div>
    );
  }

  /*
  ========================================
  LOADING
  ========================================
  */

  if (!draft) {
    return (
      <div>
        <h1>
          Purchase Bill Review
        </h1>

        <p>
          Loading purchase bill...
        </p>
      </div>
    );
  }

  const {
    supplier,
    purchase_bill,
    products,
  } = draft.data;

  /*
  ========================================
  PAGE
  ========================================
  */

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        paddingBottom: "40px",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h1>
            {isManualMode
              ? "Enter Purchase Bill Details"
              : "Purchase Bill Review"}
          </h1>

          <p>
            {isManualMode
              ? "Enter the purchase bill information manually before confirmation."
              : "Review and edit the AI-extracted purchase bill before confirmation."}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/purchase-bills/scan"
            )
          }
          disabled={confirming}
        >
          Back to Scanner
        </button>
      </div>

      {/* MODE INDICATOR */}

      <div
        style={{
          marginBottom: "20px",
          padding: "12px 15px",
          borderRadius: "8px",
          background: isManualMode
            ? "#fef3c7"
            : "#eff6ff",
          color: isManualMode
            ? "#92400e"
            : "#1e40af",
        }}
      >
        <strong>
          {isManualMode
            ? "Manual Entry Mode"
            : "AI Assisted Mode"}
        </strong>

        <span>
          {" "}
          — All information can be reviewed and edited before
          confirmation.
        </span>
      </div>

      {/* SUPPLIER */}

      <section
        style={{
          background: "#ffffff",
          padding: "25px",
          borderRadius: "10px",
          marginBottom: "20px",
          border:
            "1px solid #e5e7eb",
        }}
      >
        <h2>
          Supplier Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "15px",
          }}
        >
          <InputField
            label="Company Name"
            value={
              supplier.company_name
            }
            onChange={(value) =>
              updateSupplier(
                "company_name",
                value
              )
            }
          />

          <InputField
            label="Contact Person"
            value={
              supplier.contact_person
            }
            onChange={(value) =>
              updateSupplier(
                "contact_person",
                value
              )
            }
          />

          <InputField
            label="Email"
            value={
              supplier.email
            }
            onChange={(value) =>
              updateSupplier(
                "email",
                value
              )
            }
          />

          <InputField
            label="Phone"
            value={
              supplier.phone
            }
            onChange={(value) =>
              updateSupplier(
                "phone",
                value
              )
            }
          />

          <InputField
            label="GST Number"
            value={
              supplier.gst_number
            }
            onChange={(value) =>
              updateSupplier(
                "gst_number",
                value
              )
            }
          />

          <InputField
            label="Address"
            value={
              supplier.address
            }
            onChange={(value) =>
              updateSupplier(
                "address",
                value
              )
            }
          />

          <InputField
            label="City"
            value={
              supplier.city
            }
            onChange={(value) =>
              updateSupplier(
                "city",
                value
              )
            }
          />

          <InputField
            label="State"
            value={
              supplier.state
            }
            onChange={(value) =>
              updateSupplier(
                "state",
                value
              )
            }
          />

          <InputField
            label="Pincode"
            value={
              supplier.pincode
            }
            onChange={(value) =>
              updateSupplier(
                "pincode",
                value
              )
            }
          />
        </div>

        {!isManualMode && (
          <p
            style={{
              marginTop: "15px",
            }}
          >
            Supplier status:{" "}
            <strong>
              {supplier.existing_supplier
                ? "Existing Supplier"
                : "New Supplier"}
            </strong>
          </p>
        )}
      </section>

      {/* PURCHASE BILL */}

      <section
        style={{
          background: "#ffffff",
          padding: "25px",
          borderRadius: "10px",
          marginBottom: "20px",
          border:
            "1px solid #e5e7eb",
        }}
      >
        <h2>
          Purchase Bill Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "15px",
          }}
        >
          <InputField
            label="Bill Number"
            value={
              purchase_bill.bill_number
            }
            onChange={(value) =>
              updatePurchaseBill(
                "bill_number",
                value
              )
            }
          />

          <InputField
            label="Bill Date"
            value={
              purchase_bill.bill_date
            }
            onChange={(value) =>
              updatePurchaseBill(
                "bill_date",
                value
              )
            }
            placeholder="DD-MM-YYYY"
          />

          <InputField
            label="Subtotal"
            value={String(
              purchase_bill.subtotal
            )}
            onChange={(value) =>
              updatePurchaseBill(
                "subtotal",
                value
              )
            }
          />

          <InputField
            label="Total GST"
            value={String(
              purchase_bill.total_gst
            )}
            onChange={(value) =>
              updatePurchaseBill(
                "total_gst",
                value
              )
            }
          />

          <InputField
            label="Grand Total"
            value={String(
              purchase_bill.grand_total
            )}
            onChange={(value) =>
              updatePurchaseBill(
                "grand_total",
                value
              )
            }
          />

          <InputField
            label="Remarks"
            value={
              purchase_bill.remarks
            }
            onChange={(value) =>
              updatePurchaseBill(
                "remarks",
                value
              )
            }
          />
        </div>
      </section>

      {/* PRODUCTS */}

      <section
        style={{
          background: "#ffffff",
          padding: "25px",
          borderRadius: "10px",
          marginBottom: "20px",
          border:
            "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h2>
            Products / Items
          </h2>

          <button
            type="button"
            onClick={addProduct}
            disabled={confirming}
            style={{
              background:
                "#2563eb",
              color:
                "#ffffff",
              border:
                "none",
              borderRadius:
                "6px",
              padding:
                "9px 15px",
              cursor:
                "pointer",
              fontWeight:
                600,
            }}
          >
            + Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div
            style={{
              padding: "30px",
              textAlign:
                "center",
              background:
                "#f9fafb",
              borderRadius:
                "8px",
              color:
                "#6b7280",
            }}
          >
            <p>
              No products have been added yet.
            </p>

            <button
              type="button"
              onClick={addProduct}
              disabled={confirming}
            >
              + Add First Product
            </button>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth:
                "1100px",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f3f4f6",
                  textAlign:
                    "left",
                }}
              >
                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Product
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Description
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  HSN
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Unit
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Quantity
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Purchase Price
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  GST %
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Line Total
                </th>

                <th
                  style={{
                    padding:
                      "10px",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map(
                (
                  product,
                  index
                ) => (
                  <tr
                    key={
                      index
                    }
                    style={{
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        value={
                          product.product_name
                        }
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "product_name",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        value={
                          product.description
                        }
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "description",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        value={
                          product.hsn_code
                        }
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "hsn_code",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        value={
                          product.unit
                        }
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "unit",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        type="number"
                        value={String(
                          product.quantity
                        )}
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "quantity",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        type="number"
                        value={String(
                          product.purchase_price
                        )}
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "purchase_price",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        type="number"
                        value={String(
                          product.gst_percentage
                        )}
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "gst_percentage",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <TableInput
                        type="number"
                        value={String(
                          product.line_total
                        )}
                        onChange={(
                          value
                        ) =>
                          updateProduct(
                            index,
                            "line_total",
                            value
                          )
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding:
                          "8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          removeProduct(
                            index
                          )
                        }
                        disabled={
                          confirming
                        }
                        style={{
                          background:
                            "#fee2e2",
                          color:
                            "#991b1b",
                          border:
                            "none",
                          borderRadius:
                            "5px",
                          padding:
                            "7px 10px",
                          cursor:
                            "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* ERROR */}

      {error && (
        <div
          style={{
            background:
              "#fee2e2",
            color:
              "#991b1b",
            padding:
              "15px",
            borderRadius:
              "8px",
            marginBottom:
              "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* ACTIONS */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "flex-end",
          gap: "15px",
          marginBottom:
            "40px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate(
              "/purchase-bills"
            )
          }
          disabled={
            confirming
          }
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={
            handleConfirm
          }
          disabled={
            confirming
          }
          style={{
            background:
              "#16a34a",
            color:
              "#ffffff",
            border:
              "none",
            borderRadius:
              "6px",
            padding:
              "11px 20px",
            cursor:
              confirming
                ? "not-allowed"
                : "pointer",
            fontWeight:
              600,
          }}
        >
          {confirming
            ? "Confirming..."
            : "Confirm Purchase Bill"}
        </button>
      </div>
    </div>
  );
}

/*
========================================
NORMAL INPUT FIELD
========================================
*/

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: InputFieldProps) {
  return (
    <div>
      <label
        style={{
          display:
            "block",
          marginBottom:
            "6px",
          fontWeight:
            600,
        }}
      >
        {label}
      </label>

      <input
        type="text"
        value={
          value ?? ""
        }
        placeholder={
          placeholder
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        style={{
          width:
            "100%",
          boxSizing:
            "border-box",
          padding:
            "10px",
          border:
            "1px solid #d1d5db",
          borderRadius:
            "6px",
        }}
      />
    </div>
  );
}

/*
========================================
TABLE INPUT
========================================
*/

interface TableInputProps {
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
}

function TableInput({
  value,
  onChange,
  type = "text",
}: TableInputProps) {
  return (
    <input
      type={type}
      value={
        value ?? ""
      }
      onChange={(e) =>
        onChange(
          e.target.value
        )
      }
      style={{
        width:
          "100%",
        minWidth:
          "100px",
        boxSizing:
          "border-box",
        padding:
          "8px",
        border:
          "1px solid #d1d5db",
        borderRadius:
          "5px",
      }}
    />
  );
}