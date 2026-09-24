import {
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  deleteProforma,
  getProformaById,
  getProformas,
  updateProforma,
  updateProformaStatus,
} from "../../services/proformaService";

import type {
  Proforma,
  ProformaCreate,
  ProformaItemCreate,
} from "../../types/proforma";

import "./ProformaPage.css";


/* ================================================================
   TYPES
================================================================ */

interface EnquiryLite {
  id: number;

  enquiry_number: string;

  company_name: string;

  contact_person?: string | null;

  phone?: string | null;

  email?: string | null;

  gst_number?: string | null;

  address?: string | null;

  city?: string | null;

  state?: string | null;

  pincode?: string | null;

  machine_name?: string | null;

  machine_model?: string | null;

  status: string;
}


/* ================================================================
   CONSTANTS
================================================================ */

const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


const USER_STATUS_OPTIONS = [
  "Draft",
  "Sent",
  "Order Confirmed",
  "Rejected",
  "Cancelled",
];


const EMPTY_ITEM:
ProformaItemCreate = {

  product_id: null,

  description: "",

  quantity: 1,

  unit: "Nos",

  unit_price: 0,

  discount_percent: 0,

  tax_percent: 18,
};


/* ================================================================
   HELPERS
================================================================ */

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


function money(
  value:
    string
    | number
) {

  const amount =
    Number(
      value || 0
    );

  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}


function formatDate(
  value: string
) {

  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}


function statusClass(
  status: string
) {

  return status
    .toLowerCase()
    .replace(
      /\s+/g,
      "-"
    );
}


function getApiError(
  error: unknown
) {

  if (
    axios.isAxiosError(
      error
    )
  ) {

    const detail =
      error.response
        ?.data
        ?.detail;

    if (
      typeof detail
      === "string"
    ) {
      return detail;
    }

  }

  if (
    error
    instanceof Error
  ) {
    return error.message;
  }

  return (
    "Something went wrong. "
    +
    "Please try again."
  );
}


function calculateItem(
  item:
    ProformaItemCreate
) {

  const quantity =
    Number(
      item.quantity
    ) || 0;

  const unitPrice =
    Number(
      item.unit_price
    ) || 0;

  const discountPercent =
    Number(
      item.discount_percent
    ) || 0;

  const taxPercent =
    Number(
      item.tax_percent
    ) || 0;


  const gross =
    quantity
    * unitPrice;


  const discount =
    gross
    * (
      discountPercent
      / 100
    );


  const taxable =
    gross
    - discount;


  const tax =
    taxable
    * (
      taxPercent
      / 100
    );


  const total =
    taxable
    + tax;


  return {
    gross,
    discount,
    taxable,
    tax,
    total,
  };
}


function buildAddress(
  enquiry:
    EnquiryLite | null
) {

  if (!enquiry) {
    return "";
  }

  return [
    enquiry.address,
    enquiry.city,
    enquiry.state,
    enquiry.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}


function formFromProforma(
  proforma: Proforma
): ProformaCreate {

  return {

    proforma_date:
      proforma.proforma_date,


    /*
     * These IDs remain in the internal object only because
     * the current API type still contains them.
     *
     * They are NEVER displayed or editable.
     */
    enquiry_id:
      proforma.enquiry_id,

    customer_id:
      proforma.customer_id,


    company_name:
      proforma.company_name,

    contact_person:
      proforma.contact_person
      || "",

    phone:
      proforma.phone
      || "",

    email:
      proforma.email
      || "",


    billing_address:
      proforma.billing_address
      || "",

    shipping_address:
      proforma.shipping_address
      || "",


    validity_days:
      proforma.validity_days,


    payment_terms:
      proforma.payment_terms
      || "",

    delivery_terms:
      proforma.delivery_terms
      || "",


    notes:
      proforma.notes
      || "",

    terms_and_conditions:
      proforma
        .terms_and_conditions
      || "",


    status:
      proforma.status,


    items:
      proforma.items.map(
        item => ({

          /*
           * Manufactured output does not use purchased
           * Product Master IDs.
           */
          product_id: null,

          description:
            item.description
            || "",

          quantity:
            Number(
              item.quantity
            ),

          unit:
            item.unit
            || "Nos",

          unit_price:
            Number(
              item.unit_price
            ),

          discount_percent:
            Number(
              item
                .discount_percent
            ),

          tax_percent:
            Number(
              item.tax_percent
            ),
        })
      ),
  };
}


/* ================================================================
   PAGE
================================================================ */

export default function ProformaPage() {

  const navigate =
    useNavigate();


  const {
    id,
  } =
    useParams<{
      id: string;
    }>();


  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();


  const isDetails =
    Boolean(id);


  const [
    proformas,
    setProformas,
  ] =
    useState<
      Proforma[]
    >([]);


  const [
    selectedProforma,
    setSelectedProforma,
  ] =
    useState<
      Proforma | null
    >(
      null
    );


  const [
    selectedEnquiry,
    setSelectedEnquiry,
  ] =
    useState<
      EnquiryLite | null
    >(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState<
      ProformaCreate | null
    >(
      null
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    deleting,
    setDeleting,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    formError,
    setFormError,
  ] =
    useState("");


  const [
    copied,
    setCopied,
  ] =
    useState(false);


  const editing =
    searchParams.get(
      "edit"
    )
    === "true";


  /* ==============================================================
     LOAD PROFORMA LIST
  ============================================================== */

  async function loadProformas() {

    try {

      setLoading(
        true
      );

      setError(
        ""
      );


      const data =
        await getProformas({
          status:
            statusFilter
            || undefined,
        });


      setProformas(
        data
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  /* ==============================================================
     LOAD DETAILS
  ============================================================== */

  async function loadDetails(
    proformaId: number
  ) {

    try {

      setLoading(
        true
      );

      setError(
        ""
      );


      const data =
        await getProformaById(
          proformaId
        );


      setSelectedProforma(
        data
      );


      setForm(
        formFromProforma(
          data
        )
      );


      if (
        data.enquiry_id
      ) {

        try {

          const response =
            await axios.get<
              EnquiryLite
            >(
              `${API_BASE_URL}/enquiries/${data.enquiry_id}`,
              {
                headers:
                  getAuthHeaders(),
              }
            );


          setSelectedEnquiry(
            response.data
          );

        } catch {

          setSelectedEnquiry(
            null
          );

        }

      } else {

        setSelectedEnquiry(
          null
        );

      }

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      if (
        isDetails
        &&
        id
      ) {

        void loadDetails(
          Number(id)
        );

        return;

      }


      void loadProformas();

    },
    [
      isDetails,
      id,
      statusFilter,
    ]
  );


  /* ==============================================================
     FILTER LIST
  ============================================================== */

  const filteredProformas =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {
          return proformas;
        }


        return proformas.filter(
          proforma => {

            const firstItem =
              proforma.items[
                0
              ]?.description
              || "";


            return [
              proforma
                .proforma_number,

              proforma
                .company_name,

              proforma
                .contact_person,

              proforma.phone,

              proforma.email,

              firstItem,
            ]
              .filter(Boolean)
              .some(
                value =>
                  String(
                    value
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              );

          }
        );

      },
      [
        proformas,
        search,
      ]
    );


  /* ==============================================================
     TOTALS
  ============================================================== */

  const totals =
    useMemo(
      () => {

        if (!form) {

          return {
            subtotal: 0,
            discount: 0,
            taxable: 0,
            tax: 0,
            total: 0,
          };

        }


        let subtotal = 0;

        let discount = 0;

        let taxable = 0;

        let tax = 0;

        let total = 0;


        form.items.forEach(
          item => {

            const result =
              calculateItem(
                item
              );


            subtotal +=
              result.gross;

            discount +=
              result.discount;

            taxable +=
              result.taxable;

            tax +=
              result.tax;

            total +=
              result.total;

          }
        );


        return {
          subtotal,
          discount,
          taxable,
          tax,
          total,
        };

      },
      [
        form,
      ]
    );


  /* ==============================================================
     WORKFLOW LOCK
  ============================================================== */

  const workflowLocked =
    useMemo(
      () => {

        const status =
          (
            selectedProforma
              ?.status
            || ""
          )
            .trim()
            .toLowerCase();


        return [
          "order confirmed",
          "confirmed",
          "production started",
          "production completed",
          "final bill generated",
          "payment pending",
          "payment received",
          "completed",
        ].includes(
          status
        );

      },
      [
        selectedProforma,
      ]
    );


  /* ==============================================================
     FORM
  ============================================================== */

  function updateField<
    K extends keyof
      ProformaCreate
  >(
    field: K,
    value:
      ProformaCreate[K]
  ) {

    setForm(
      current => {

        if (!current) {
          return current;
        }


        return {
          ...current,

          [field]:
            value,
        };

      }
    );

  }


  function updateItem(
    index: number,
    field:
      keyof ProformaItemCreate,
    value:
      string
      | number
      | null
  ) {

    setForm(
      current => {

        if (!current) {
          return current;
        }


        return {
          ...current,

          items:
            current.items.map(
              (
                item,
                itemIndex
              ) =>
                itemIndex
                === index
                  ? {
                      ...item,

                      [field]:
                        value,
                    }
                  : item
            ),
        };

      }
    );

  }


  function addItem() {

    setForm(
      current => {

        if (!current) {
          return current;
        }


        return {
          ...current,

          items: [
            ...current.items,

            {
              ...EMPTY_ITEM,
            },
          ],
        };

      }
    );

  }


  function removeItem(
    index: number
  ) {

    setForm(
      current => {

        if (
          !current
          ||
          current.items.length
          === 1
        ) {
          return current;
        }


        return {
          ...current,

          items:
            current.items.filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex
                !== index
            ),
        };

      }
    );

  }


  function validateForm() {

    if (!form) {

      return (
        "Proforma data is not loaded."
      );

    }


    if (
      !form.proforma_date
    ) {

      return (
        "Proforma date is required."
      );

    }


    if (
      !form.items.length
    ) {

      return (
        "At least one item is required."
      );

    }


    for (
      let index = 0;
      index
      < form.items.length;
      index += 1
    ) {

      const item =
        form.items[
          index
        ];


      if (
        !item.description
          .trim()
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Finished Product / Machine "
          +
          "name is required."
        );

      }


      if (
        Number(
          item.quantity
        )
        <= 0
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Quantity must be greater than zero."
        );

      }


      if (
        Number(
          item.unit_price
        )
        < 0
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Unit price cannot be negative."
        );

      }

    }


    return "";

  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function handleSave(
    event:
      React.FormEvent
  ) {

    event.preventDefault();


    if (
      !selectedProforma
      ||
      !form
    ) {
      return;
    }


    if (
      workflowLocked
    ) {

      setFormError(
        "This Proforma has already entered "
        +
        "the confirmed production workflow "
        +
        "and can no longer be edited."
      );

      return;

    }


    const validation =
      validateForm();


    if (
      validation
    ) {

      setFormError(
        validation
      );

      return;

    }


    try {

      setSaving(
        true
      );

      setFormError(
        ""
      );


      const payload:
        ProformaCreate = {

        ...form,


        /*
         * Internal identity is preserved automatically.
         * User cannot modify these values.
         */
        enquiry_id:
          selectedProforma
            .enquiry_id,

        customer_id:
          selectedProforma
            .customer_id,


        company_name:
          selectedProforma
            .company_name,

        contact_person:
          selectedProforma
            .contact_person,

        phone:
          selectedProforma
            .phone,

        email:
          selectedProforma
            .email,


        items:
          form.items.map(
            item => ({

              /*
               * Manufactured product.
               * Never link to purchased Product Master.
               */
              product_id: null,

              description:
                item.description
                  .trim(),

              quantity:
                Number(
                  item.quantity
                ),

              unit:
                (
                  item.unit
                  || "Nos"
                ).trim(),

              unit_price:
                Number(
                  item.unit_price
                ),

              discount_percent:
                Number(
                  item
                    .discount_percent
                ),

              tax_percent:
                Number(
                  item.tax_percent
                ),
            })
          ),
      };


      const updated =
        await updateProforma(
          selectedProforma.id,
          payload
        );


      setSelectedProforma(
        updated
      );


      setForm(
        formFromProforma(
          updated
        )
      );


      setSearchParams(
        {}
      );

    } catch (
      err
    ) {

      setFormError(
        getApiError(
          err
        )
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     STATUS
  ============================================================== */

  async function handleStatusChange(
    newStatus: string
  ) {

    if (
      !selectedProforma
    ) {
      return;
    }


    try {

      setSaving(
        true
      );

      setError(
        ""
      );


      const updated =
        await updateProformaStatus(
          selectedProforma.id,
          newStatus
        );


      setSelectedProforma(
        updated
      );


      setForm(
        formFromProforma(
          updated
        )
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     DELETE
  ============================================================== */

  async function handleDelete() {

    if (
      !selectedProforma
    ) {
      return;
    }


    if (
      workflowLocked
    ) {

      setError(
        "A confirmed/production Proforma "
        +
        "cannot be deleted."
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Delete ${selectedProforma.proforma_number}? `
        +
        "This action cannot be undone."
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeleting(
        true
      );


      await deleteProforma(
        selectedProforma.id
      );


      navigate(
        "/proformas"
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setDeleting(
        false
      );

    }

  }


  /* ==============================================================
     COPY / PRINT
  ============================================================== */

  async function copyNumber() {

    if (
      !selectedProforma
    ) {
      return;
    }


    await navigator
      .clipboard
      .writeText(
        selectedProforma
          .proforma_number
      );


    setCopied(
      true
    );


    window.setTimeout(
      () =>
        setCopied(
          false
        ),
      1800
    );

  }


  function handlePrint() {

    window.print();

  }


  /* ==============================================================
     DETAILS PAGE
  ============================================================== */

  if (
    isDetails
  ) {

    if (
      loading
      ||
      !selectedProforma
      ||
      !form
    ) {

      return (
        <div className="proforma-page">

          <div className="table-state">

            <Loader2
              size={28}
              className="spin"
            />

            <h3>
              Loading Proforma...
            </h3>

          </div>

        </div>
      );

    }


    const addressFromEnquiry =
      buildAddress(
        selectedEnquiry
      );


    const currentStatusOptions =
      USER_STATUS_OPTIONS.includes(
        selectedProforma.status
      )
        ? USER_STATUS_OPTIONS
        : [
            selectedProforma.status,
            ...USER_STATUS_OPTIONS,
          ];


    return (
      <div className="proforma-page">

        {/* ======================================================
            BREADCRUMB
        ====================================================== */}

        <div className="proforma-breadcrumb">

          <button
            type="button"
            className="breadcrumb-back"
            onClick={() =>
              navigate(
                "/proformas"
              )
            }
          >

            <ArrowLeft
              size={16}
            />

            Proformas

          </button>


          <ChevronRight
            size={15}
          />


          <span>

            {
              selectedProforma
                .proforma_number
            }

          </span>

        </div>


        {
          error
          && (
            <div className="proforma-alert error">

              <span>
                {error}
              </span>


              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >

                <X
                  size={16}
                />

              </button>

            </div>
          )
        }


        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="proforma-page-header">

          <div className="page-heading">

            <div className="page-heading-icon">

              <FileText
                size={23}
              />

            </div>


            <div>

              <div className="page-eyebrow">
                SALES DOCUMENT
              </div>


              <h1>

                {
                  selectedProforma
                    .proforma_number
                }

              </h1>


              <p>

                {
                  selectedProforma
                    .company_name
                }

                {
                  form.items[
                    0
                  ]?.description
                    ? (
                        <>
                          {" • "}
                          {
                            form.items[
                              0
                            ].description
                          }
                        </>
                      )
                    : null
                }

              </p>

            </div>

          </div>


          <div className="page-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={
                handlePrint
              }
            >

              <Printer
                size={17}
              />

              Print

            </button>


            <button
              type="button"
              className="secondary-button"
              onClick={
                copyNumber
              }
            >

              {
                copied
                  ? (
                      <CheckCircle2
                        size={17}
                      />
                    )
                  : (
                      <Copy
                        size={17}
                      />
                    )
              }

              {
                copied
                  ? "Copied"
                  : "Copy Number"
              }

            </button>


            {
              !editing
              &&
              !workflowLocked
              && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setSearchParams({
                      edit:
                        "true",
                    })
                  }
                >

                  <Pencil
                    size={17}
                  />

                  Edit

                </button>
              )
            }


            {
              !workflowLocked
              && (
                <button
                  type="button"
                  className="danger-outline-button"
                  onClick={
                    handleDelete
                  }
                  disabled={
                    deleting
                  }
                >

                  {
                    deleting
                      ? (
                          <Loader2
                            size={17}
                            className="spin"
                          />
                        )
                      : (
                          <Trash2
                            size={17}
                          />
                        )
                  }

                  Delete

                </button>
              )
            }

          </div>

        </section>


        {/* ======================================================
            VIEW MODE
        ====================================================== */}

        {
          !editing
          ? (
            <div className="proforma-workspace">

              <div className="proforma-form">

                {/* ============================================
                    BUSINESS ORIGIN
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Business Origin
                      </h2>


                      <p>
                        Customer and Enquiry details
                        inherited automatically.
                      </p>

                    </div>


                    <span
                      className={`status-badge ${statusClass(
                        selectedProforma.status
                      )}`}
                    >

                      {
                        selectedProforma
                          .status
                      }

                    </span>

                  </div>


                  <div className="form-grid three">

                    <div>

                      <span className="record-secondary">
                        Enquiry
                      </span>

                      <strong>

                        {
                          selectedEnquiry
                            ?.enquiry_number
                          ||
                          "Linked Enquiry"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Proforma Date
                      </span>

                      <strong>

                        {
                          formatDate(
                            selectedProforma
                              .proforma_date
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Customer
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .company_name
                        }

                      </strong>

                    </div>

                  </div>

                </section>


                {/* ============================================
                    CUSTOMER DETAILS
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Customer Details
                      </h2>


                      <p>
                        Captured from the original Enquiry.
                      </p>

                    </div>

                  </div>


                  <div className="form-grid two">

                    <div>

                      <span className="record-secondary">
                        Company
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .company_name
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Contact Person
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .contact_person
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Phone
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .phone
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Email
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .email
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        GSTIN
                      </span>

                      <strong>

                        {
                          selectedEnquiry
                            ?.gst_number
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Enquiry Address
                      </span>

                      <strong>

                        {
                          addressFromEnquiry
                          ||
                          "-"
                        }

                      </strong>

                    </div>

                  </div>

                </section>


                {/* ============================================
                    ITEMS
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Finished Product / Machine
                      </h2>


                      <p>
                        Manufactured output quoted
                        to the customer.
                      </p>

                    </div>

                  </div>


                  <div className="items-table-wrapper">

                    <table className="items-table">

                      <thead>

                        <tr>

                          <th>
                            Description
                          </th>

                          <th>
                            Qty
                          </th>

                          <th>
                            Unit
                          </th>

                          <th>
                            Unit Price
                          </th>

                          <th>
                            Discount %
                          </th>

                          <th>
                            GST %
                          </th>

                          <th>
                            Total
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {
                          form.items.map(
                            (
                              item,
                              index
                            ) => {

                              const calculated =
                                calculateItem(
                                  item
                                );


                              return (
                                <tr
                                  key={
                                    index
                                  }
                                >

                                  <td>

                                    <strong>

                                      {
                                        item
                                          .description
                                      }

                                    </strong>

                                  </td>


                                  <td>

                                    {
                                      item.quantity
                                    }

                                  </td>


                                  <td>

                                    {
                                      item.unit
                                      ||
                                      "Nos"
                                    }

                                  </td>


                                  <td>

                                    ₹
                                    {
                                      money(
                                        item.unit_price
                                      )
                                    }

                                  </td>


                                  <td>

                                    {
                                      item
                                        .discount_percent
                                    }
                                    %

                                  </td>


                                  <td>

                                    {
                                      item
                                        .tax_percent
                                    }
                                    %

                                  </td>


                                  <td>

                                    <strong className="amount">

                                      ₹
                                      {
                                        money(
                                          calculated
                                            .total
                                        )
                                      }

                                    </strong>

                                  </td>

                                </tr>
                              );

                            }
                          )
                        }

                      </tbody>

                    </table>

                  </div>

                </section>


                {/* ============================================
                    ADDRESSES
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Document Addresses
                      </h2>

                    </div>

                  </div>


                  <div className="form-grid two">

                    <div>

                      <span className="record-secondary">
                        Billing Address
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .billing_address
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Shipping Address
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .shipping_address
                          ||
                          "-"
                        }

                      </strong>

                    </div>

                  </div>

                </section>


                {/* ============================================
                    COMMERCIAL TERMS
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Commercial Terms
                      </h2>

                    </div>

                  </div>


                  <div className="form-grid two">

                    <div>

                      <span className="record-secondary">
                        Validity
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .validity_days
                          ??
                          "-"
                        }
                        {" days"}

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Payment Terms
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .payment_terms
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Delivery Terms
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .delivery_terms
                          ||
                          "-"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Notes
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .notes
                          ||
                          "-"
                        }

                      </strong>

                    </div>

                  </div>

                </section>

              </div>


              {/* ==============================================
                  SUMMARY
              ============================================== */}

              <aside className="proforma-summary">

                <div className="summary-card">

                  <div className="summary-card-header">

                    <div>

                      <span>
                        DOCUMENT SUMMARY
                      </span>


                      <h3>

                        {
                          selectedProforma
                            .proforma_number
                        }

                      </h3>

                    </div>


                    <CircleDollarSign
                      size={21}
                    />

                  </div>


                  <div className="summary-total">

                    <span>
                      Grand Total
                    </span>

                    <strong>

                      ₹
                      {
                        money(
                          selectedProforma
                            .grand_total
                        )
                      }

                    </strong>

                  </div>


                  <div className="summary-lines">

                    <div>

                      <span>
                        Subtotal
                      </span>

                      <strong>

                        ₹
                        {
                          money(
                            selectedProforma
                              .subtotal
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span>
                        Discount
                      </span>

                      <strong>

                        − ₹
                        {
                          money(
                            selectedProforma
                              .discount_amount
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span>
                        Taxable Amount
                      </span>

                      <strong>

                        ₹
                        {
                          money(
                            selectedProforma
                              .taxable_amount
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span>
                        GST / Tax
                      </span>

                      <strong>

                        ₹
                        {
                          money(
                            selectedProforma
                              .tax_amount
                          )
                        }

                      </strong>

                    </div>

                  </div>

                </div>


                <div className="status-card">

                  <div className="status-card-title">

                    <span>
                      WORKFLOW STATUS
                    </span>


                    <CheckCircle2
                      size={17}
                    />

                  </div>


                  {
                    workflowLocked
                      ? (
                          <div
                            className={`status-badge ${statusClass(
                              selectedProforma.status
                            )}`}
                          >

                            {
                              selectedProforma
                                .status
                            }

                          </div>
                        )
                      : (
                          <select
                            value={
                              selectedProforma
                                .status
                            }
                            onChange={
                              event =>
                                void handleStatusChange(
                                  event.target
                                    .value
                                )
                            }
                            disabled={
                              saving
                            }
                          >

                            {
                              currentStatusOptions
                                .map(
                                  status => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {status}
                                    </option>
                                  )
                                )
                            }

                          </select>
                        )
                  }


                  <p>
                    Order Confirmed moves the
                    Enquiry into the production workflow.
                  </p>

                </div>

              </aside>

            </div>
          )
          : (
            /* ==================================================
               EDIT MODE
            ================================================== */

            <div className="proforma-workspace">

              <form
                className="proforma-form"
                onSubmit={
                  handleSave
                }
              >

                {/* ============================================
                    LOCKED ORIGIN
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Business Origin
                      </h2>


                      <p>
                        Customer identity is inherited
                        from Enquiry and cannot be changed here.
                      </p>

                    </div>

                  </div>


                  <div className="form-grid three">

                    <div>

                      <span className="record-secondary">
                        Enquiry
                      </span>

                      <strong>

                        {
                          selectedEnquiry
                            ?.enquiry_number
                          ||
                          "Linked Enquiry"
                        }

                      </strong>

                    </div>


                    <div>

                      <span className="record-secondary">
                        Customer
                      </span>

                      <strong>

                        {
                          selectedProforma
                            .company_name
                        }

                      </strong>

                    </div>


                    <label>

                      <span>
                        Proforma Date *
                      </span>


                      <input
                        type="date"
                        value={
                          form.proforma_date
                        }
                        onChange={
                          event =>
                            updateField(
                              "proforma_date",
                              event.target.value
                            )
                        }
                      />

                    </label>

                  </div>

                </section>


                {/* ============================================
                    DOCUMENT ADDRESSES
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Document Addresses
                      </h2>


                      <p>
                        Defaulted from Enquiry but
                        editable for this quotation.
                      </p>

                    </div>

                  </div>


                  <div className="form-grid two">

                    <label>

                      <span>
                        Billing Address
                      </span>


                      <textarea
                        rows={3}
                        value={
                          form.billing_address
                          ||
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "billing_address",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label>

                      <span>
                        Shipping Address
                      </span>


                      <textarea
                        rows={3}
                        value={
                          form.shipping_address
                          ||
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "shipping_address",
                              event.target.value
                            )
                        }
                      />

                    </label>

                  </div>

                </section>


                {/* ============================================
                    MANUFACTURED ITEMS
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Finished Product / Machine
                      </h2>


                      <p>
                        Enter the manufactured output.
                        No purchased Product ID is used.
                      </p>

                    </div>


                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        addItem
                      }
                    >

                      <Plus
                        size={17}
                      />

                      Add Item

                    </button>

                  </div>


                  <div className="items-table-wrapper">

                    <table className="items-table">

                      <thead>

                        <tr>

                          <th>
                            Finished Product / Machine
                          </th>

                          <th>
                            Qty
                          </th>

                          <th>
                            Unit
                          </th>

                          <th>
                            Unit Price
                          </th>

                          <th>
                            Discount %
                          </th>

                          <th>
                            GST %
                          </th>

                          <th>
                            Total
                          </th>

                          <th />

                        </tr>

                      </thead>


                      <tbody>

                        {
                          form.items.map(
                            (
                              item,
                              index
                            ) => {

                              const calculated =
                                calculateItem(
                                  item
                                );


                              return (
                                <tr
                                  key={
                                    index
                                  }
                                >

                                  <td>

                                    <input
                                      value={
                                        item
                                          .description
                                      }
                                      onChange={
                                        event =>
                                          updateItem(
                                            index,
                                            "description",
                                            event.target.value
                                          )
                                      }
                                      placeholder="e.g. Hydraulic Lift Crane"
                                    />

                                  </td>


                                  <td>

                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={
                                        item.quantity
                                      }
                                      onChange={
                                        event =>
                                          updateItem(
                                            index,
                                            "quantity",
                                            Number(
                                              event.target.value
                                            )
                                          )
                                      }
                                    />

                                  </td>


                                  <td>

                                    <input
                                      value={
                                        item.unit
                                        ||
                                        ""
                                      }
                                      onChange={
                                        event =>
                                          updateItem(
                                            index,
                                            "unit",
                                            event.target.value
                                          )
                                      }
                                    />

                                  </td>


                                  <td>

                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={
                                        item.unit_price
                                      }
                                      onChange={
                                        event =>
                                          updateItem(
                                            index,
                                            "unit_price",
                                            Number(
                                              event.target.value
                                            )
                                          )
                                      }
                                    />

                                  </td>


                                  <td>

                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={
                                        item
                                          .discount_percent
                                      }
                                      onChange={
                                        event =>
                                          updateItem(
                                            index,
                                            "discount_percent",
                                            Number(
                                              event.target.value
                                            )
                                          )
                                      }
                                    />

                                  </td>


                                  <td>

                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={
                                        item
                                          .tax_percent
                                      }
                                      onChange={
                                        event =>
                                          updateItem(
                                            index,
                                            "tax_percent",
                                            Number(
                                              event.target.value
                                            )
                                          )
                                      }
                                    />

                                  </td>


                                  <td>

                                    <strong className="amount">

                                      ₹
                                      {
                                        money(
                                          calculated
                                            .total
                                        )
                                      }

                                    </strong>

                                  </td>


                                  <td>

                                    <button
                                      type="button"
                                      className="icon-danger-button"
                                      disabled={
                                        form.items.length
                                        === 1
                                      }
                                      onClick={() =>
                                        removeItem(
                                          index
                                        )
                                      }
                                    >

                                      <Trash2
                                        size={16}
                                      />

                                    </button>

                                  </td>

                                </tr>
                              );

                            }
                          )
                        }

                      </tbody>

                    </table>

                  </div>

                </section>


                {/* ============================================
                    COMMERCIAL TERMS
                ============================================ */}

                <section className="form-card">

                  <div className="form-card-heading">

                    <div>

                      <h2>
                        Commercial Terms
                      </h2>

                    </div>

                  </div>


                  <div className="form-grid two">

                    <label>

                      <span>
                        Validity Days
                      </span>


                      <input
                        type="number"
                        min="1"
                        value={
                          form.validity_days
                          ??
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "validity_days",
                              event.target.value
                                ? Number(
                                    event.target.value
                                  )
                                : null
                            )
                        }
                      />

                    </label>


                    <label>

                      <span>
                        Payment Terms
                      </span>


                      <textarea
                        rows={3}
                        value={
                          form.payment_terms
                          ||
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "payment_terms",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label>

                      <span>
                        Delivery Terms
                      </span>


                      <textarea
                        rows={3}
                        value={
                          form.delivery_terms
                          ||
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "delivery_terms",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label>

                      <span>
                        Notes
                      </span>


                      <textarea
                        rows={3}
                        value={
                          form.notes
                          ||
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "notes",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="span-two">

                      <span>
                        Terms & Conditions
                      </span>


                      <textarea
                        rows={4}
                        value={
                          form
                            .terms_and_conditions
                          ||
                          ""
                        }
                        onChange={
                          event =>
                            updateField(
                              "terms_and_conditions",
                              event.target.value
                            )
                        }
                      />

                    </label>

                  </div>

                </section>


                {
                  formError
                  && (
                    <div className="proforma-alert error">

                      <span>
                        {formError}
                      </span>

                    </div>
                  )
                }


                <div className="form-bottom-bar">

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      saving
                    }
                    onClick={() => {

                      setForm(
                        formFromProforma(
                          selectedProforma
                        )
                      );

                      setSearchParams(
                        {}
                      );

                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      saving
                    }
                  >

                    {
                      saving
                        ? (
                            <Loader2
                              size={17}
                              className="spin"
                            />
                          )
                        : (
                            <Save
                              size={17}
                            />
                          )
                    }

                    {
                      saving
                        ? "Saving..."
                        : "Save Changes"
                    }

                  </button>

                </div>

              </form>


              {/* ==============================================
                  LIVE SUMMARY
              ============================================== */}

              <aside className="proforma-summary">

                <div className="summary-card">

                  <div className="summary-card-header">

                    <div>

                      <span>
                        DOCUMENT SUMMARY
                      </span>


                      <h3>

                        {
                          selectedProforma
                            .proforma_number
                        }

                      </h3>

                    </div>


                    <CircleDollarSign
                      size={21}
                    />

                  </div>


                  <div className="summary-total">

                    <span>
                      Grand Total
                    </span>

                    <strong>

                      ₹
                      {
                        money(
                          totals.total
                        )
                      }

                    </strong>

                  </div>


                  <div className="summary-lines">

                    <div>

                      <span>
                        Subtotal
                      </span>

                      <strong>

                        ₹
                        {
                          money(
                            totals.subtotal
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span>
                        Discount
                      </span>

                      <strong>

                        − ₹
                        {
                          money(
                            totals.discount
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span>
                        Taxable Amount
                      </span>

                      <strong>

                        ₹
                        {
                          money(
                            totals.taxable
                          )
                        }

                      </strong>

                    </div>


                    <div>

                      <span>
                        GST / Tax
                      </span>

                      <strong>

                        ₹
                        {
                          money(
                            totals.tax
                          )
                        }

                      </strong>

                    </div>

                  </div>

                </div>

              </aside>

            </div>
          )
        }

      </div>
    );

  }


  /* ==============================================================
     LIST PAGE
  ============================================================== */

  return (
    <div className="proforma-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="proforma-page-header">

        <div className="page-heading">

          <div className="page-heading-icon">

            <FileText
              size={23}
            />

          </div>


          <div>

            <div className="page-eyebrow">
              SALES WORKFLOW
            </div>


            <h1>
              Proformas
            </h1>


            <p>
              Create, manage and track
              customer quotations.
            </p>

          </div>

        </div>


        <div className="page-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void loadProformas()
            }
            disabled={
              loading
            }
          >

            <RefreshCw
              size={17}
              className={
                loading
                  ? "spin"
                  : ""
              }
            />

            Refresh

          </button>


          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/proformas/new"
              )
            }
          >

            <FilePlus2
              size={18}
            />

            New Proforma

          </button>

        </div>

      </section>


      {/* ======================================================
          KPI
      ====================================================== */}

      <section className="proforma-kpi-grid">

        <div className="proforma-kpi">

          <div className="kpi-icon">

            <FileText
              size={19}
            />

          </div>


          <div>

            <span>
              Total Proformas
            </span>

            <strong>

              {
                proformas.length
              }

            </strong>

            <small>
              All recorded documents
            </small>

          </div>

        </div>


        <div className="proforma-kpi">

          <div className="kpi-icon">

            <ClipboardList
              size={19}
            />

          </div>


          <div>

            <span>
              Drafts
            </span>

            <strong>

              {
                proformas.filter(
                  item =>
                    item.status
                    === "Draft"
                ).length
              }

            </strong>

            <small>
              Still being prepared
            </small>

          </div>

        </div>


        <div className="proforma-kpi">

          <div className="kpi-icon">

            <CheckCircle2
              size={19}
            />

          </div>


          <div>

            <span>
              Order Confirmed
            </span>

            <strong>

              {
                proformas.filter(
                  item =>
                    [
                      "Confirmed",
                      "Order Confirmed",
                      "Production Started",
                      "Production Completed",
                    ].includes(
                      item.status
                    )
                ).length
              }

            </strong>

            <small>
              Accepted customer orders
            </small>

          </div>

        </div>


        <div className="proforma-kpi highlight">

          <div className="kpi-icon">

            <CircleDollarSign
              size={19}
            />

          </div>


          <div>

            <span>
              Total Value
            </span>

            <strong>

              ₹
              {
                money(
                  proformas.reduce(
                    (
                      total,
                      item
                    ) =>
                      total
                      +
                      Number(
                        item.grand_total
                      ),
                    0
                  )
                )
              }

            </strong>

            <small>
              Current records
            </small>

          </div>

        </div>

      </section>


      {/* ======================================================
          FILTER
      ====================================================== */}

      <section className="filter-card">

        <div className="search-box">

          <Search
            size={18}
          />


          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Search proforma, customer or finished product..."
          />


          {
            search
            && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >

                <X
                  size={16}
                />

              </button>
            )
          }

        </div>


        <select
          value={
            statusFilter
          }
          onChange={
            event =>
              setStatusFilter(
                event.target.value
              )
          }
        >

          <option value="">
            All Statuses
          </option>


          <option value="Draft">
            Draft
          </option>


          <option value="Sent">
            Sent
          </option>


          <option value="Order Confirmed">
            Order Confirmed
          </option>


          <option value="Production Started">
            Production Started
          </option>


          <option value="Production Completed">
            Production Completed
          </option>


          <option value="Rejected">
            Rejected
          </option>


          <option value="Cancelled">
            Cancelled
          </option>

        </select>

      </section>


      {
        error
        && (
          <div className="proforma-alert error">

            <span>
              {error}
            </span>


            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >

              <X
                size={16}
              />

            </button>

          </div>
        )
      }


      {/* ======================================================
          TABLE
      ====================================================== */}

      <section className="table-card">

        <div className="table-card-header">

          <div>

            <h2>
              Proforma Records
            </h2>


            <p>

              {
                filteredProformas
                  .length
              }
              {" records shown"}

            </p>

          </div>


          <span className="table-meta">
            Enquiry → Proforma
          </span>

        </div>


        {
          loading
          ? (
            <div className="table-state">

              <Loader2
                size={28}
                className="spin"
              />

              <h3>
                Loading Proformas...
              </h3>

            </div>
          )
          :
          filteredProformas.length
          === 0
          ? (
            <div className="table-state">

              <div className="empty-state-icon">

                <FileText
                  size={27}
                />

              </div>


              <h3>
                No Proformas found
              </h3>


              <p>
                Try changing the search or status filter.
              </p>

            </div>
          )
          : (
            <div className="proforma-table-wrapper">

              <table className="proforma-table">

                <thead>

                  <tr>

                    <th>
                      Proforma
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Customer
                    </th>

                    <th>
                      Finished Product / Machine
                    </th>

                    <th>
                      Items
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {
                    filteredProformas.map(
                      proforma => {

                        const firstItem =
                          proforma.items[
                            0
                          ]?.description
                          ||
                          "-";


                        return (
                          <tr
                            key={
                              proforma.id
                            }
                          >

                            <td>

                              <div className="record-primary">

                                {
                                  proforma
                                    .proforma_number
                                }

                              </div>

                            </td>


                            <td>

                              {
                                formatDate(
                                  proforma
                                    .proforma_date
                                )
                              }

                            </td>


                            <td>

                              <div className="customer-name">

                                {
                                  proforma
                                    .company_name
                                }

                              </div>


                              {
                                proforma
                                  .contact_person
                                && (
                                  <div className="record-secondary">

                                    {
                                      proforma
                                        .contact_person
                                    }

                                  </div>
                                )
                              }

                            </td>


                            <td>

                              <div className="record-primary">

                                {
                                  firstItem
                                }

                              </div>


                              {
                                proforma.items.length
                                > 1
                                && (
                                  <div className="record-secondary">

                                    +
                                    {
                                      proforma
                                        .items
                                        .length
                                      - 1
                                    }
                                    {" more"}

                                  </div>
                                )
                              }

                            </td>


                            <td>

                              {
                                proforma
                                  .items
                                  .length
                              }

                            </td>


                            <td>

                              <strong className="amount">

                                ₹
                                {
                                  money(
                                    proforma
                                      .grand_total
                                  )
                                }

                              </strong>

                            </td>


                            <td>

                              <span
                                className={`status-badge ${statusClass(
                                  proforma.status
                                )}`}
                              >

                                {
                                  proforma
                                    .status
                                }

                              </span>

                            </td>


                            <td>

                              <div className="row-actions">

                                <button
                                  type="button"
                                  title="View"
                                  onClick={() =>
                                    navigate(
                                      `/proformas/${proforma.id}`
                                    )
                                  }
                                >

                                  <Eye
                                    size={16}
                                  />

                                </button>


                                {
                                  ![
                                    "Order Confirmed",
                                    "Confirmed",
                                    "Production Started",
                                    "Production Completed",
                                  ].includes(
                                    proforma.status
                                  )
                                  && (
                                    <button
                                      type="button"
                                      title="Edit"
                                      onClick={() =>
                                        navigate(
                                          `/proformas/${proforma.id}?edit=true`
                                        )
                                      }
                                    >

                                      <Pencil
                                        size={16}
                                      />

                                    </button>
                                  )
                                }

                              </div>

                            </td>

                          </tr>
                        );

                      }
                    )
                  }

                </tbody>

              </table>

            </div>
          )
        }

      </section>

    </div>
  );
}