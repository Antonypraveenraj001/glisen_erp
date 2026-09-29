import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import axios from "axios";

import {
  FileText,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  usePermissions,
} from "../../hooks/usePermissions";

import "./EnquiryList.css";


/* ================================================================
   TYPES
================================================================ */

interface Enquiry {
  id: number;

  enquiry_number: string;

  enquiry_date: string;

  /*
   * Internal database relationship only.
   * Never displayed or entered manually.
   */
  customer_id: number;

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

  application?: string | null;

  quantity?: number | null;

  requirements?: string | null;

  remarks?: string | null;

  status: string;

  created_at: string;

  updated_at?: string | null;
}


interface Customer {
  id: number;

  customer_code: string;

  company_name: string;

  contact_person?: string | null;

  email?: string | null;

  phone?: string | null;

  gst_number?: string | null;

  address?: string | null;

  city?: string | null;

  state?: string | null;

  pincode?: string | null;
}


interface EnquiryForm {
  enquiry_date: string;

  company_name: string;

  contact_person: string;

  phone: string;

  email: string;

  gst_number: string;

  address: string;

  city: string;

  state: string;

  pincode: string;

  machine_name: string;

  machine_model: string;

  application: string;

  quantity: string;

  requirements: string;

  remarks: string;

  status: string;
}


/* ================================================================
   CONSTANTS
================================================================ */

const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


const ROWS_PER_PAGE =
  10;


const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Quotation",
  "Order Confirmed",
  "Production Started",
  "Production Completed",
  "Final Bill Generated",
  "Payment Pending",
  "Payment Received",
  "Completed",
  "Cancelled",
];


const ACTIVE_ENQUIRY_STATUSES = [
  "New",
  "Contacted",
  "Quotation",
];


/* ================================================================
   EMPTY FORM
================================================================ */

function createEmptyForm(): EnquiryForm {

  return {
    enquiry_date:
      new Date()
        .toISOString()
        .split("T")[0],

    company_name:
      "",

    contact_person:
      "",

    phone:
      "",

    email:
      "",

    gst_number:
      "",

    address:
      "",

    city:
      "",

    state:
      "",

    pincode:
      "",

    machine_name:
      "",

    machine_model:
      "",

    application:
      "",

    quantity:
      "",

    requirements:
      "",

    remarks:
      "",

    status:
      "New",
  };

}


/* ================================================================
   AUTH
================================================================ */

function getAuthHeaders() {

  const token =
    localStorage.getItem(
      "access_token"
    );


  return {
    Authorization:
      `Bearer ${token}`,
  };

}


/* ================================================================
   HELPERS
================================================================ */

function formatDate(
  value:
    string
    | null
    | undefined
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(
      `${value}T00:00:00`
    );


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


function getStatusClass(
  status: string
) {

  return status
    .toLowerCase()
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /[^a-z0-9-]/g,
      ""
    );

}


function normalizeGST(
  value: string
) {

  return value
    .replace(
      /\s+/g,
      ""
    )
    .toUpperCase();

}


function valueOrEmpty(
  value:
    string
    | null
    | undefined
) {

  return value
  || "";

}


/* ================================================================
   PAGE
================================================================ */

export default function EnquiryList() {

  /* ==============================================================
     PERMISSIONS
  ============================================================== */

  const {
    hasPermission,
  } =
    usePermissions();


  const canCreateEnquiry =
    hasPermission(
      "enquiries.create"
    );


  const canEditEnquiry =
    hasPermission(
      "enquiries.edit"
    );


  const canCancelEnquiry =
    hasPermission(
      "enquiries.cancel"
    );


  /* ==============================================================
     STATE
  ============================================================== */

  const [
    enquiries,
    setEnquiries,
  ] =
    useState<
      Enquiry[]
    >(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    saving,
    setSaving,
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


  const [
    formError,
    setFormError,
  ] =
    useState(
      ""
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      ""
    );


  const [
    showModal,
    setShowModal,
  ] =
    useState(
      false
    );


  const [
    editingEnquiry,
    setEditingEnquiry,
  ] =
    useState<
      Enquiry | null
    >(
      null
    );


  const [
    printEnquiry,
    setPrintEnquiry,
  ] =
    useState<
      Enquiry | null
    >(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState<
      EnquiryForm
    >(
      createEmptyForm()
    );


  /* ==============================================================
     WORKFLOW STATUS PERMISSIONS

     A user without enquiries.cancel cannot newly select Cancelled.

     If the record is already Cancelled, we keep Cancelled visible
     while editing so the existing status is not silently changed.
  ============================================================== */

  const editableStatusOptions =
    useMemo(
      () =>
        STATUS_OPTIONS.filter(
          status =>
            status
            !== "Cancelled"
            ||
            canCancelEnquiry
            ||
            form.status
            === "Cancelled"
        ),
      [
        canCancelEnquiry,
        form.status,
      ]
    );


  /* ==============================================================
     INDEPENDENT PAGINATION
  ============================================================== */

  const [
    activePage,
    setActivePage,
  ] =
    useState(
      1
    );


  const [
    confirmedPage,
    setConfirmedPage,
  ] =
    useState(
      1
    );


  const [
    cancelledPage,
    setCancelledPage,
  ] =
    useState(
      1
    );


  /* ==============================================================
     LOAD ENQUIRIES
  ============================================================== */

  async function fetchEnquiries() {

    try {

      setLoading(
        true
      );


      setError(
        ""
      );


      const params:
        Record<
          string,
          string
        > =
        {};


      if (
        search.trim()
      ) {

        params.search =
          search.trim();

      }


      if (
        statusFilter
      ) {

        params.status =
          statusFilter;

      }


      const response =
        await axios.get<
          Enquiry[]
        >(
          `${API_BASE_URL}/enquiries`,
          {
            headers:
              getAuthHeaders(),

            params,
          }
        );


      setEnquiries(
        response.data
      );

    } catch (
      err
    ) {

      console.error(
        "Enquiry loading error:",
        err
      );


      if (
        axios.isAxiosError(
          err
        )
        &&
        err.response?.status
        ===
        401
      ) {

        setError(
          "Your session has expired. Please login again."
        );

      } else if (
        axios.isAxiosError(
          err
        )
        &&
        err.response?.status
        ===
        403
      ) {

        setError(
          typeof
            err.response?.data?.detail
          ===
          "string"
            ? err.response.data.detail
            : "You do not have permission to view Enquiries."
        );

      } else if (
        axios.isAxiosError(
          err
        )
        &&
        typeof
          err.response?.data?.detail
        ===
        "string"
      ) {

        setError(
          err.response.data.detail
        );

      } else {

        setError(
          "Unable to load enquiries."
        );

      }

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void fetchEnquiries();

    },
    [
      statusFilter,
    ]
  );


  /* ==============================================================
     RESET PAGES WHEN SEARCH / FILTER CHANGES
  ============================================================== */

  useEffect(
    () => {

      setActivePage(
        1
      );

      setConfirmedPage(
        1
      );

      setCancelledPage(
        1
      );

    },
    [
      search,
      statusFilter,
    ]
  );


  /* ==============================================================
     AFTER PRINT
  ============================================================== */

  useEffect(
    () => {

      function handleAfterPrint() {

        setPrintEnquiry(
          null
        );

      }


      window.addEventListener(
        "afterprint",
        handleAfterPrint
      );


      return () => {

        window.removeEventListener(
          "afterprint",
          handleAfterPrint
        );

      };

    },
    []
  );


  /* ==============================================================
     SEARCH
  ============================================================== */

  const filteredEnquiries =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (
          !query
        ) {

          return enquiries;

        }


        return enquiries.filter(
          enquiry =>
            [
              enquiry
                .enquiry_number,

              enquiry
                .company_name,

              enquiry
                .contact_person,

              enquiry
                .phone,

              enquiry
                .email,

              enquiry
                .gst_number,

              enquiry
                .machine_name,

              enquiry
                .machine_model,
            ]
              .filter(
                Boolean
              )
              .some(
                value =>
                  String(
                    value
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
        );

      },
      [
        enquiries,
        search,
      ]
    );


  /* ==============================================================
     GROUPED ENQUIRIES
  ============================================================== */

  const activeEnquiries =
    useMemo(
      () =>
        filteredEnquiries.filter(
          enquiry =>
            ACTIVE_ENQUIRY_STATUSES
              .includes(
                enquiry.status
              )
        ),
      [
        filteredEnquiries,
      ]
    );


  const confirmedEnquiries =
    useMemo(
      () =>
        filteredEnquiries.filter(
          enquiry =>
            !ACTIVE_ENQUIRY_STATUSES
              .includes(
                enquiry.status
              )
            &&
            enquiry.status
            !==
            "Cancelled"
        ),
      [
        filteredEnquiries,
      ]
    );


  const cancelledEnquiries =
    useMemo(
      () =>
        filteredEnquiries.filter(
          enquiry =>
            enquiry.status
            ===
            "Cancelled"
        ),
      [
        filteredEnquiries,
      ]
    );


  /* ==============================================================
     PAGE COUNTS
  ============================================================== */

  const activeTotalPages =
    Math.max(
      1,
      Math.ceil(
        activeEnquiries.length
        /
        ROWS_PER_PAGE
      )
    );


  const confirmedTotalPages =
    Math.max(
      1,
      Math.ceil(
        confirmedEnquiries.length
        /
        ROWS_PER_PAGE
      )
    );


  const cancelledTotalPages =
    Math.max(
      1,
      Math.ceil(
        cancelledEnquiries.length
        /
        ROWS_PER_PAGE
      )
    );


  /* ==============================================================
     KEEP PAGE NUMBERS VALID AFTER EDIT / FILTER
  ============================================================== */

  useEffect(
    () => {

      setActivePage(
        current =>
          Math.min(
            current,
            activeTotalPages
          )
      );

    },
    [
      activeTotalPages,
    ]
  );


  useEffect(
    () => {

      setConfirmedPage(
        current =>
          Math.min(
            current,
            confirmedTotalPages
          )
      );

    },
    [
      confirmedTotalPages,
    ]
  );


  useEffect(
    () => {

      setCancelledPage(
        current =>
          Math.min(
            current,
            cancelledTotalPages
          )
      );

    },
    [
      cancelledTotalPages,
    ]
  );


  /* ==============================================================
     PAGINATED RECORDS
  ============================================================== */

  const paginatedActiveEnquiries =
    useMemo(
      () => {

        const start =
          (
            activePage
            -
            1
          )
          *
          ROWS_PER_PAGE;


        return activeEnquiries.slice(
          start,
          start
          +
          ROWS_PER_PAGE
        );

      },
      [
        activeEnquiries,
        activePage,
      ]
    );


  const paginatedConfirmedEnquiries =
    useMemo(
      () => {

        const start =
          (
            confirmedPage
            -
            1
          )
          *
          ROWS_PER_PAGE;


        return confirmedEnquiries.slice(
          start,
          start
          +
          ROWS_PER_PAGE
        );

      },
      [
        confirmedEnquiries,
        confirmedPage,
      ]
    );


  const paginatedCancelledEnquiries =
    useMemo(
      () => {

        const start =
          (
            cancelledPage
            -
            1
          )
          *
          ROWS_PER_PAGE;


        return cancelledEnquiries.slice(
          start,
          start
          +
          ROWS_PER_PAGE
        );

      },
      [
        cancelledEnquiries,
        cancelledPage,
      ]
    );


  /* ==============================================================
     CREATE MODAL
  ============================================================== */

  function openCreateModal() {

    if (
      !canCreateEnquiry
    ) {

      return;

    }


    setEditingEnquiry(
      null
    );


    setForm(
      createEmptyForm()
    );


    setFormError(
      ""
    );


    setShowModal(
      true
    );

  }


  /* ==============================================================
     EDIT MODAL
  ============================================================== */

  async function openEditModal(
    enquiry:
      Enquiry
  ) {

    if (
      !canEditEnquiry
    ) {

      return;

    }


    setEditingEnquiry(
      enquiry
    );


    setFormError(
      ""
    );


    let companyName =
      valueOrEmpty(
        enquiry.company_name
      );


    let contactPerson =
      valueOrEmpty(
        enquiry.contact_person
      );


    let phone =
      valueOrEmpty(
        enquiry.phone
      );


    let email =
      valueOrEmpty(
        enquiry.email
      );


    let gstNumber =
      valueOrEmpty(
        enquiry.gst_number
      );


    let address =
      valueOrEmpty(
        enquiry.address
      );


    let city =
      valueOrEmpty(
        enquiry.city
      );


    let state =
      valueOrEmpty(
        enquiry.state
      );


    let pincode =
      valueOrEmpty(
        enquiry.pincode
      );


    /*
     * Older enquiries may not contain all customer
     * snapshot information.
     */
    if (
      enquiry.customer_id
      &&
      (
        !gstNumber
        ||
        !address
        ||
        !city
        ||
        !state
        ||
        !pincode
      )
    ) {

      try {

        const response =
          await axios.get<
            Customer
          >(
            `${API_BASE_URL}/customers/${enquiry.customer_id}`,
            {
              headers:
                getAuthHeaders(),
            }
          );


        const customer =
          response.data;


        companyName =
          companyName
          ||
          valueOrEmpty(
            customer.company_name
          );


        contactPerson =
          contactPerson
          ||
          valueOrEmpty(
            customer.contact_person
          );


        phone =
          phone
          ||
          valueOrEmpty(
            customer.phone
          );


        email =
          email
          ||
          valueOrEmpty(
            customer.email
          );


        gstNumber =
          gstNumber
          ||
          valueOrEmpty(
            customer.gst_number
          );


        address =
          address
          ||
          valueOrEmpty(
            customer.address
          );


        city =
          city
          ||
          valueOrEmpty(
            customer.city
          );


        state =
          state
          ||
          valueOrEmpty(
            customer.state
          );


        pincode =
          pincode
          ||
          valueOrEmpty(
            customer.pincode
          );

      } catch (
        err
      ) {

        console.error(
          "Unable to load legacy customer details:",
          err
        );

      }

    }


    setForm(
      {
        enquiry_date:
          enquiry.enquiry_date
          ||
          "",

        company_name:
          companyName,

        contact_person:
          contactPerson,

        phone,

        email,

        gst_number:
          gstNumber,

        address,

        city,

        state,

        pincode,

        machine_name:
          valueOrEmpty(
            enquiry.machine_name
          ),

        machine_model:
          valueOrEmpty(
            enquiry.machine_model
          ),

        application:
          valueOrEmpty(
            enquiry.application
          ),

        quantity:
          enquiry.quantity
          !==
          null
          &&
          enquiry.quantity
          !==
          undefined
            ? String(
                enquiry.quantity
              )
            : "",

        requirements:
          valueOrEmpty(
            enquiry.requirements
          ),

        remarks:
          valueOrEmpty(
            enquiry.remarks
          ),

        status:
          enquiry.status
          ||
          "New",
      }
    );


    setShowModal(
      true
    );

  }


  /* ==============================================================
     CLOSE MODAL
  ============================================================== */

  function closeModal() {

    if (
      saving
    ) {

      return;

    }


    setShowModal(
      false
    );


    setEditingEnquiry(
      null
    );


    setFormError(
      ""
    );

  }


  /* ==============================================================
     FORM FIELD UPDATE
  ============================================================== */

  function updateForm(
    field:
      keyof EnquiryForm,

    value:
      string
  ) {

    setForm(
      current => ({
        ...current,

        [field]:
          field
          ===
          "gst_number"
            ? normalizeGST(
                value
              )
            : value,
      })
    );

  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setFormError(
      ""
    );


    if (
      editingEnquiry
      &&
      !canEditEnquiry
    ) {

      setFormError(
        "You do not have permission to edit Enquiries."
      );

      return;

    }


    if (
      !editingEnquiry
      &&
      !canCreateEnquiry
    ) {

      setFormError(
        "You do not have permission to create Enquiries."
      );

      return;

    }


    if (
      form.status
      === "Cancelled"
      &&
      editingEnquiry
      ?.status
      !== "Cancelled"
      &&
      !canCancelEnquiry
    ) {

      setFormError(
        "You do not have permission to cancel Enquiries."
      );

      return;

    }


    if (
      !form.enquiry_date
    ) {

      setFormError(
        "Enquiry date is required."
      );

      return;

    }


    if (
      !form.company_name.trim()
    ) {

      setFormError(
        "Company name is required."
      );

      return;

    }


    const gstNumber =
      normalizeGST(
        form.gst_number
      );


    if (
      !gstNumber
    ) {

      setFormError(
        "GST Number is required."
      );

      return;

    }


    let quantity:
      number | null =
      null;


    if (
      form.quantity.trim()
    ) {

      quantity =
        Number(
          form.quantity
        );


      if (
        !Number.isInteger(
          quantity
        )
        ||
        quantity
        <=
        0
      ) {

        setFormError(
          "Quantity must be a positive whole number."
        );

        return;

      }

    }


    const payload = {
      enquiry_date:
        form.enquiry_date,

      company_name:
        form.company_name
          .trim(),

      contact_person:
        form.contact_person
          .trim()
        ||
        null,

      phone:
        form.phone
          .trim()
        ||
        null,

      email:
        form.email
          .trim()
        ||
        null,

      gst_number:
        gstNumber,

      address:
        form.address
          .trim()
        ||
        null,

      city:
        form.city
          .trim()
        ||
        null,

      state:
        form.state
          .trim()
        ||
        null,

      pincode:
        form.pincode
          .trim()
        ||
        null,

      machine_name:
        form.machine_name
          .trim()
        ||
        null,

      machine_model:
        form.machine_model
          .trim()
        ||
        null,

      application:
        form.application
          .trim()
        ||
        null,

      quantity,

      requirements:
        form.requirements
          .trim()
        ||
        null,

      remarks:
        form.remarks
          .trim()
        ||
        null,

      status:
        form.status,
    };


    try {

      setSaving(
        true
      );


      if (
        editingEnquiry
      ) {

        await axios.put(
          `${API_BASE_URL}/enquiries/${editingEnquiry.id}`,
          payload,
          {
            headers:
              getAuthHeaders(),
          }
        );

      } else {

        await axios.post(
          `${API_BASE_URL}/enquiries`,
          payload,
          {
            headers:
              getAuthHeaders(),
          }
        );

      }


      setShowModal(
        false
      );


      setEditingEnquiry(
        null
      );


      await fetchEnquiries();

    } catch (
      err
    ) {

      console.error(
        "Enquiry save error:",
        err
      );


      if (
        axios.isAxiosError(
          err
        )
        &&
        typeof
          err.response?.data?.detail
        ===
        "string"
      ) {

        setFormError(
          err.response.data.detail
        );

      } else {

        setFormError(
          editingEnquiry
            ? "Unable to update enquiry."
            : "Unable to create enquiry."
        );

      }

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     PRINT
  ============================================================== */

  function handlePrint(
    enquiry:
      Enquiry
  ) {

    setPrintEnquiry(
      enquiry
    );


    window.setTimeout(
      () => {

        window.print();

      },
      150
    );

  }


  /* ==============================================================
     COUNTS
  ============================================================== */

  const totalEnquiries =
    filteredEnquiries.length;


  const activeCount =
    activeEnquiries.length;


  const confirmedCount =
    confirmedEnquiries.length;


  const cancelledCount =
    cancelledEnquiries.length;


  /* ==============================================================
     ENQUIRY TABLE
  ============================================================== */

  function renderEnquiryTable(
    rows:
      Enquiry[],

    emptyMessage:
      string
  ) {

    if (
      loading
    ) {

      return (
        <div className="table-state">

          <div className="loader" />

          <p>
            Loading enquiries...
          </p>

        </div>
      );

    }


    if (
      rows.length
      ===
      0
    ) {

      return (
        <div className="table-state">

          <FileText
            size={28}
          />

          <h3>
            {emptyMessage}
          </h3>

        </div>
      );

    }


    return (
      <div className="table-wrapper">

        <table className="enquiry-table">

          <thead>

            <tr>

              <th>
                Enquiry
              </th>

              <th>
                Date
              </th>

              <th>
                Company
              </th>

              <th>
                Contact
              </th>

              <th>
                Machine
              </th>

              <th>
                Qty
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
              rows.map(
                enquiry => (

                  <tr
                    key={
                      enquiry.id
                    }
                  >

                    <td>

                      <div className="enquiry-number">

                        {
                          enquiry
                            .enquiry_number
                        }

                      </div>

                    </td>


                    <td>

                      {
                        formatDate(
                          enquiry
                            .enquiry_date
                        )
                      }

                    </td>


                    <td>

                      <div className="company-name">

                        {
                          enquiry
                            .company_name
                        }

                      </div>


                      {
                        enquiry
                          .gst_number
                        && (
                          <div className="contact-phone">

                            {
                              enquiry
                                .gst_number
                            }

                          </div>
                        )
                      }

                    </td>


                    <td>

                      <div className="contact-name">

                        {
                          enquiry
                            .contact_person
                          ||
                          "—"
                        }

                      </div>


                      <div className="contact-phone">

                        {
                          enquiry.phone
                          ||
                          enquiry.email
                          ||
                          "—"
                        }

                      </div>

                    </td>


                    <td>

                      <div className="machine-name">

                        {
                          enquiry
                            .machine_name
                          ||
                          "—"
                        }

                      </div>


                      {
                        enquiry
                          .machine_model
                        && (
                          <div className="machine-model">

                            {
                              enquiry
                                .machine_model
                            }

                          </div>
                        )
                      }

                    </td>


                    <td>

                      {
                        enquiry.quantity
                        ??
                        "—"
                      }

                    </td>


                    <td>

                      <span
                        className={
                          `status-badge status-${getStatusClass(
                            enquiry.status
                          )}`
                        }
                      >

                        {
                          enquiry.status
                        }

                      </span>

                    </td>


                    <td>

                      <div className="enquiry-row-actions">

                        <button
                          type="button"
                          className="icon-action-button"
                          title="Print enquiry"
                          onClick={() =>
                            handlePrint(
                              enquiry
                            )
                          }
                        >

                          <Printer
                            size={16}
                          />

                        </button>


                        {
                          canEditEnquiry
                          &&
                          (
                            <button
                              type="button"
                              className="icon-action-button"
                              title="Edit enquiry"
                              onClick={() =>
                                void openEditModal(
                                  enquiry
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

                )
              )
            }

          </tbody>

        </table>

      </div>
    );

  }


  /* ==============================================================
     PAGINATION
  ============================================================== */

  function renderPagination(
    totalRecords:
      number,

    currentPage:
      number,

    totalPages:
      number,

    setPage:
      (
        page:
          number
        |
        (
          (
            current:
              number
          ) =>
            number
        )
      ) =>
        void
  ) {

    if (
      totalRecords
      ===
      0
    ) {

      return null;

    }


    const startRecord =
      (
        (
          currentPage
          -
          1
        )
        *
        ROWS_PER_PAGE
      )
      +
      1;


    const endRecord =
      Math.min(
        currentPage
        *
        ROWS_PER_PAGE,

        totalRecords
      );


    return (
      <div
        style={{
          minHeight:
            "58px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "16px",

          padding:
            "11px 18px",

          borderTop:
            "1px solid #e8eef6",

          background:
            "#fbfcff",

          flexWrap:
            "wrap",
        }}
      >

        <div
          style={{
            color:
              "#8090a8",

            fontSize:
              "10px",

            fontWeight:
              650,
          }}
        >

          Showing{" "}

          <strong
            style={{
              color:
                "#425a7d",
            }}
          >

            {
              startRecord
            }

            –

            {
              endRecord
            }

          </strong>

          {" of "}

          <strong
            style={{
              color:
                "#425a7d",
            }}
          >

            {
              totalRecords
            }

          </strong>

          {" records"}

        </div>


        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "8px",
          }}
        >

          <button
            type="button"
            className="secondary-button"
            disabled={
              currentPage
              <=
              1
            }
            onClick={() =>
              setPage(
                current =>
                  Math.max(
                    1,
                    current
                    -
                    1
                  )
              )
            }
            style={{
              minHeight:
                "34px",

              padding:
                "0 12px",

              fontSize:
                "10px",
            }}
          >

            Previous

          </button>


          <div
            style={{
              minWidth:
                "92px",

              textAlign:
                "center",

              color:
                "#506789",

              fontSize:
                "10px",

              fontWeight:
                750,
            }}
          >

            Page{" "}

            {
              currentPage
            }

            {" of "}

            {
              totalPages
            }

          </div>


          <button
            type="button"
            className="secondary-button"
            disabled={
              currentPage
              >=
              totalPages
            }
            onClick={() =>
              setPage(
                current =>
                  Math.min(
                    totalPages,
                    current
                    +
                    1
                  )
              )
            }
            style={{
              minHeight:
                "34px",

              padding:
                "0 12px",

              fontSize:
                "10px",
            }}
          >

            Next

          </button>

        </div>

      </div>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="enquiry-page">


      {/* ========================================================
          NORMAL SCREEN
      ======================================================== */}

      <div className="enquiry-screen-content">


        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="enquiry-header">

          <div className="enquiry-title-group">

            <div className="enquiry-title-icon">

              <FileText
                size={22}
              />

            </div>


            <div>

              <div className="page-eyebrow">
                SALES WORKFLOW
              </div>


              <h1>
                Enquiries
              </h1>


              <p>
                Active enquiries stay in the sales pipeline.
                Confirmed orders are separated from enquiries
                still awaiting confirmation, while cancelled
                enquiries remain available for history.
              </p>

            </div>

          </div>


          <div className="header-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                void fetchEnquiries()
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


            {
              canCreateEnquiry
              &&
              (
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    openCreateModal
                  }
                >

                  <Plus
                    size={18}
                  />

                  New Enquiry

                </button>
              )
            }

          </div>

        </section>


        {/* ======================================================
            KPI
        ====================================================== */}

        <section className="enquiry-kpi-grid">

          <div className="kpi-card">

            <div className="kpi-label">
              Total Enquiries
            </div>


            <div className="kpi-value">
              {totalEnquiries}
            </div>


            <div className="kpi-helper">
              Matching current search/filter
            </div>

          </div>


          <div className="kpi-card">

            <div className="kpi-label">
              Active Enquiries
            </div>


            <div className="kpi-value">
              {activeCount}
            </div>


            <div className="kpi-helper">
              New, Contacted or Quotation
            </div>

          </div>


          <div className="kpi-card">

            <div className="kpi-label">
              Confirmed / Converted
            </div>


            <div className="kpi-value">
              {confirmedCount}
            </div>


            <div className="kpi-helper">
              Orders moved beyond enquiry stage
            </div>

          </div>


          <div className="kpi-card kpi-card-accent">

            <div className="kpi-label">
              Cancelled
            </div>


            <div className="kpi-value">
              {cancelledCount}
            </div>


            <div className="kpi-helper">
              Closed without confirmation
            </div>

          </div>

        </section>


        {/* ======================================================
            FILTER
        ====================================================== */}

        <section className="filter-card">

          <div className="filter-search">

            <Search
              size={18}
            />


            <input
              type="text"
              value={
                search
              }
              onChange={
                event =>
                  setSearch(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Search enquiry number, company, GSTIN, contact, phone or machine..."
            />


            {
              search
              && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() =>
                    setSearch(
                      ""
                    )
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
            className="status-filter"
            value={
              statusFilter
            }
            onChange={
              event =>
                setStatusFilter(
                  event
                    .target
                    .value
                )
            }
          >

            <option value="">
              All Statuses
            </option>


            {
              STATUS_OPTIONS.map(
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


          <button
            type="button"
            className="filter-refresh"
            onClick={() =>
              void fetchEnquiries()
            }
            disabled={
              loading
            }
          >

            Apply

          </button>

        </section>


        {/* ======================================================
            ERROR
        ====================================================== */}

        {
          error
          && (
            <div className="alert alert-error">
              {error}
            </div>
          )
        }


        {/* ======================================================
            ACTIVE ENQUIRIES
        ====================================================== */}

        <section className="table-card">

          <div className="table-card-header">

            <div>

              <h2>
                Active Enquiries
              </h2>


              <p>
                New, Contacted and Quotation enquiries
                still waiting for customer confirmation.
              </p>

            </div>


            <div
              style={{
                padding:
                  "5px 10px",

                borderRadius:
                  "999px",

                background:
                  "#eaf2ff",

                color:
                  "#3973df",

                fontSize:
                  "9px",

                fontWeight:
                  800,
              }}
            >

              {
                activeEnquiries.length
              }

              {" active"}

            </div>

          </div>


          {
            renderEnquiryTable(
              paginatedActiveEnquiries,
              "No active enquiries"
            )
          }


          {
            renderPagination(
              activeEnquiries.length,
              activePage,
              activeTotalPages,
              setActivePage
            )
          }

        </section>


        {/* ======================================================
            CONFIRMED / CONVERTED
        ====================================================== */}

        <section className="table-card">

          <div className="table-card-header">

            <div>

              <h2>
                Confirmed / Converted Enquiries
              </h2>


              <p>
                Enquiries converted into confirmed orders
                and moved into Production, Billing or
                later workflow stages.
              </p>

            </div>


            <div
              style={{
                padding:
                  "5px 10px",

                borderRadius:
                  "999px",

                background:
                  "#eaf8f1",

                color:
                  "#287657",

                fontSize:
                  "9px",

                fontWeight:
                  800,
              }}
            >

              {
                confirmedEnquiries.length
              }

              {" confirmed"}

            </div>

          </div>


          {
            renderEnquiryTable(
              paginatedConfirmedEnquiries,
              "No confirmed enquiries"
            )
          }


          {
            renderPagination(
              confirmedEnquiries.length,
              confirmedPage,
              confirmedTotalPages,
              setConfirmedPage
            )
          }

        </section>


        {/* ======================================================
            CANCELLED
        ====================================================== */}

        <section className="table-card">

          <div className="table-card-header">

            <div>

              <h2>
                Cancelled Enquiries
              </h2>


              <p>
                Enquiries closed without order confirmation.
              </p>

            </div>


            <div
              style={{
                padding:
                  "5px 10px",

                borderRadius:
                  "999px",

                background:
                  "#fff0f0",

                color:
                  "#b54747",

                fontSize:
                  "9px",

                fontWeight:
                  800,
              }}
            >

              {
                cancelledEnquiries.length
              }

              {" cancelled"}

            </div>

          </div>


          {
            renderEnquiryTable(
              paginatedCancelledEnquiries,
              "No cancelled enquiries"
            )
          }


          {
            renderPagination(
              cancelledEnquiries.length,
              cancelledPage,
              cancelledTotalPages,
              setCancelledPage
            )
          }

        </section>


        {/* ======================================================
            CREATE / EDIT MODAL
        ====================================================== */}

        {
          showModal
          && (
            <div
              className="modal-backdrop"
              onMouseDown={
                event => {

                  if (
                    event.target
                    ===
                    event.currentTarget
                  ) {

                    closeModal();

                  }

                }
              }
            >

              <div className="enquiry-modal">

                <div className="modal-header">

                  <div>

                    <div className="page-eyebrow">

                      {
                        editingEnquiry
                          ? "UPDATE RECORD"
                          : "NEW RECORD"
                      }

                    </div>


                    <h2>

                      {
                        editingEnquiry
                          ? `Edit ${editingEnquiry.enquiry_number}`
                          : "Create New Enquiry"
                      }

                    </h2>


                    <p>
                      Enter the customer details once.
                      The ERP automatically creates or reuses
                      the Customer using GSTIN.
                    </p>

                  </div>


                  <button
                    type="button"
                    className="modal-close"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                  >

                    <X
                      size={20}
                    />

                  </button>

                </div>


                {
                  formError
                  && (
                    <div className="alert alert-error modal-alert">
                      {formError}
                    </div>
                  )
                }


                <form
                  className="enquiry-form"
                  onSubmit={
                    handleSubmit
                  }
                >


                  {/* ==================================================
                      CUSTOMER INFORMATION
                  ================================================== */}

                  <div className="form-section">

                    <div className="form-section-title">
                      Customer Information
                    </div>


                    <div className="form-grid form-grid-3">

                      <FormField
                        label="Enquiry Date *"
                      >

                        <input
                          type="date"
                          required
                          value={
                            form.enquiry_date
                          }
                          onChange={
                            event =>
                              updateForm(
                                "enquiry_date",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <FormField
                        label="Company Name *"
                      >

                        <input
                          type="text"
                          required
                          maxLength={200}
                          value={
                            form.company_name
                          }
                          onChange={
                            event =>
                              updateForm(
                                "company_name",
                                event
                                  .target
                                  .value
                              )
                          }
                          placeholder="Customer company name"
                        />

                      </FormField>


                      <FormField
                        label="GST Number *"
                      >

                        <input
                          type="text"
                          required
                          maxLength={50}
                          value={
                            form.gst_number
                          }
                          onChange={
                            event =>
                              updateForm(
                                "gst_number",
                                event
                                  .target
                                  .value
                              )
                          }
                          placeholder="GSTIN"
                        />

                      </FormField>


                      <FormField
                        label="Contact Person"
                      >

                        <input
                          type="text"
                          maxLength={150}
                          value={
                            form.contact_person
                          }
                          onChange={
                            event =>
                              updateForm(
                                "contact_person",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <FormField
                        label="Phone"
                      >

                        <input
                          type="text"
                          maxLength={30}
                          value={
                            form.phone
                          }
                          onChange={
                            event =>
                              updateForm(
                                "phone",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <FormField
                        label="Email"
                      >

                        <input
                          type="email"
                          maxLength={150}
                          value={
                            form.email
                          }
                          onChange={
                            event =>
                              updateForm(
                                "email",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>

                    </div>

                  </div>


                  {/* ==================================================
                      ADDRESS
                  ================================================== */}

                  <div className="form-section">

                    <div className="form-section-title">
                      Customer Address
                    </div>


                    <div className="form-grid form-grid-3">

                      <label className="form-field form-field-wide">

                        <span>
                          Address
                        </span>


                        <textarea
                          rows={3}
                          maxLength={500}
                          value={
                            form.address
                          }
                          onChange={
                            event =>
                              updateForm(
                                "address",
                                event
                                  .target
                                  .value
                              )
                          }
                          placeholder="Billing / company address"
                        />

                      </label>


                      <FormField
                        label="City"
                      >

                        <input
                          type="text"
                          maxLength={100}
                          value={
                            form.city
                          }
                          onChange={
                            event =>
                              updateForm(
                                "city",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <FormField
                        label="State"
                      >

                        <input
                          type="text"
                          maxLength={100}
                          value={
                            form.state
                          }
                          onChange={
                            event =>
                              updateForm(
                                "state",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <FormField
                        label="Pincode"
                      >

                        <input
                          type="text"
                          maxLength={20}
                          value={
                            form.pincode
                          }
                          onChange={
                            event =>
                              updateForm(
                                "pincode",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>

                    </div>

                  </div>


                  {/* ==================================================
                      MACHINE / REQUIREMENT
                  ================================================== */}

                  <div className="form-section">

                    <div className="form-section-title">
                      Machine & Requirement
                    </div>


                    <div className="form-grid form-grid-3">

                      <FormField
                        label="Machine / Product Required"
                      >

                        <input
                          type="text"
                          maxLength={200}
                          value={
                            form.machine_name
                          }
                          onChange={
                            event =>
                              updateForm(
                                "machine_name",
                                event
                                  .target
                                  .value
                              )
                          }
                          placeholder="What the customer requires"
                        />

                      </FormField>


                      <FormField
                        label="Model / Reference"
                      >

                        <input
                          type="text"
                          maxLength={150}
                          value={
                            form.machine_model
                          }
                          onChange={
                            event =>
                              updateForm(
                                "machine_model",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <FormField
                        label="Quantity"
                      >

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            form.quantity
                          }
                          onChange={
                            event =>
                              updateForm(
                                "quantity",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>


                      <label className="form-field form-field-wide">

                        <span>
                          Application
                        </span>


                        <input
                          type="text"
                          maxLength={300}
                          value={
                            form.application
                          }
                          onChange={
                            event =>
                              updateForm(
                                "application",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </label>


                      <label className="form-field form-field-wide">

                        <span>
                          Requirements
                        </span>


                        <textarea
                          rows={4}
                          value={
                            form.requirements
                          }
                          onChange={
                            event =>
                              updateForm(
                                "requirements",
                                event
                                  .target
                                  .value
                              )
                          }
                          placeholder="Customer requirement, specification or enquiry details"
                        />

                      </label>

                    </div>

                  </div>


                  {/* ==================================================
                      WORKFLOW
                  ================================================== */}

                  <div className="form-section">

                    <div className="form-section-title">
                      Workflow
                    </div>


                    <div className="form-grid form-grid-2">

                      <FormField
                        label="Status"
                      >

                        <select
                          value={
                            form.status
                          }
                          onChange={
                            event =>
                              updateForm(
                                "status",
                                event
                                  .target
                                  .value
                              )
                          }
                        >

                          {
                            editableStatusOptions.map(
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

                      </FormField>


                      <FormField
                        label="Remarks"
                      >

                        <input
                          type="text"
                          value={
                            form.remarks
                          }
                          onChange={
                            event =>
                              updateForm(
                                "remarks",
                                event
                                  .target
                                  .value
                              )
                          }
                        />

                      </FormField>

                    </div>

                  </div>


                  {/* ==================================================
                      FOOTER
                  ================================================== */}

                  <div className="modal-footer">

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        closeModal
                      }
                      disabled={
                        saving
                      }
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

                      <FileText
                        size={17}
                      />


                      {
                        saving
                          ? "Saving..."
                          : editingEnquiry
                            ? "Update Enquiry"
                            : "Create Enquiry"
                      }

                    </button>

                  </div>

                </form>

              </div>

            </div>
          )
        }

      </div>


      {/* ========================================================
          PRINT DOCUMENT
      ======================================================== */}

      {
        printEnquiry
        && (
          <article className="enquiry-print-document">

            <div className="enquiry-print-letterhead" />


            <header className="enquiry-print-header">

              <div>

                <div className="print-eyebrow">
                  CUSTOMER ENQUIRY
                </div>


                <h1>

                  {
                    printEnquiry
                      .enquiry_number
                  }

                </h1>

              </div>


              <div className="print-header-meta">

                <PrintField
                  label="Enquiry Date"
                  value={
                    formatDate(
                      printEnquiry
                        .enquiry_date
                    )
                  }
                />


                <PrintField
                  label="Status"
                  value={
                    printEnquiry
                      .status
                  }
                />

              </div>

            </header>


            {/* ==================================================
                CUSTOMER INFORMATION
            ================================================== */}

            <PrintSection
              title="Customer Information"
            >

              <div className="print-grid">

                <PrintField
                  label="Company Name"
                  value={
                    printEnquiry
                      .company_name
                  }
                />


                <PrintField
                  label="GSTIN"
                  value={
                    printEnquiry
                      .gst_number
                    ||
                    "—"
                  }
                />


                <PrintField
                  label="Contact Person"
                  value={
                    printEnquiry
                      .contact_person
                    ||
                    "—"
                  }
                />


                <PrintField
                  label="Phone"
                  value={
                    printEnquiry
                      .phone
                    ||
                    "—"
                  }
                />


                <PrintField
                  label="Email"
                  value={
                    printEnquiry
                      .email
                    ||
                    "—"
                  }
                />


                <PrintField
                  label="Location"
                  value={
                    [
                      printEnquiry
                        .city,

                      printEnquiry
                        .state,

                      printEnquiry
                        .pincode,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ", "
                      )
                    ||
                    "—"
                  }
                />

              </div>


              {
                printEnquiry
                  .address
                && (
                  <div
                    className="print-long-text"
                    style={{
                      marginTop:
                        "4mm",
                    }}
                  >

                    {
                      printEnquiry
                        .address
                    }

                  </div>
                )
              }

            </PrintSection>


            {/* ==================================================
                MACHINE REQUIREMENT
            ================================================== */}

            <PrintSection
              title="Product / Machine Requirement"
            >

              <div className="print-grid">

                <PrintField
                  label="Machine / Product"
                  value={
                    printEnquiry
                      .machine_name
                    ||
                    "—"
                  }
                />


                <PrintField
                  label="Model / Reference"
                  value={
                    printEnquiry
                      .machine_model
                    ||
                    "—"
                  }
                />


                <PrintField
                  label="Quantity"
                  value={
                    printEnquiry.quantity
                    !==
                    null
                    &&
                    printEnquiry.quantity
                    !==
                    undefined
                      ? String(
                          printEnquiry.quantity
                        )
                      : "—"
                  }
                />


                <PrintField
                  label="Application"
                  value={
                    printEnquiry
                      .application
                    ||
                    "—"
                  }
                />

              </div>

            </PrintSection>


            <PrintSection
              title="Customer Requirements"
            >

              <div className="print-long-text">

                {
                  printEnquiry
                    .requirements
                  ||
                  "—"
                }

              </div>

            </PrintSection>


            {
              printEnquiry
                .remarks
              && (
                <PrintSection
                  title="Remarks"
                >

                  <div className="print-long-text">

                    {
                      printEnquiry
                        .remarks
                    }

                  </div>

                </PrintSection>
              )
            }


            <footer className="enquiry-print-footer">

              <span>
                Glisen ERP
              </span>


              <div className="print-signature">
                Authorized Signature
              </div>

            </footer>

          </article>
        )
      }

    </div>
  );

}


/* ================================================================
   FORM FIELD
================================================================ */

function FormField({
  label,
  children,
}: {
  label:
    string;

  children:
    ReactNode;
}) {

  return (
    <label className="form-field">

      <span>
        {label}
      </span>


      {children}

    </label>
  );

}


/* ================================================================
   PRINT FIELD
================================================================ */

function PrintField({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {

  return (
    <div className="print-field">

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>
  );

}


/* ================================================================
   PRINT SECTION
================================================================ */

function PrintSection({
  title,
  children,
}: {
  title:
    string;

  children:
    ReactNode;
}) {

  return (
    <section className="print-section">

      <h2>
        {title}
      </h2>


      {children}

    </section>
  );

}