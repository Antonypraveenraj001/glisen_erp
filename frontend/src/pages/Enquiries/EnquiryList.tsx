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
   * Never displayed or entered by the user.
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


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


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


/* ================================================================
   EMPTY FORM
================================================================ */

function createEmptyForm(): EnquiryForm {
  return {
    enquiry_date:
      new Date()
        .toISOString()
        .split("T")[0],

    company_name: "",

    contact_person: "",
    phone: "",
    email: "",

    gst_number: "",

    address: "",
    city: "",
    state: "",
    pincode: "",

    machine_name: "",
    machine_model: "",

    application: "",

    quantity: "",

    requirements: "",
    remarks: "",

    status: "New",
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
      day: "2-digit",
      month: "short",
      year: "numeric",
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
  return value || "";
}


/* ================================================================
   PAGE
================================================================ */

export default function EnquiryList() {

  const [
    enquiries,
    setEnquiries,
  ] =
    useState<Enquiry[]>(
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
    useState<EnquiryForm>(
      createEmptyForm()
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
        && err.response?.status
        === 401
      ) {

        setError(
          "Your session has expired. Please login again."
        );

      } else if (
        axios.isAxiosError(
          err
        )
        && typeof
          err.response?.data?.detail
        === "string"
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
     CLIENT SEARCH
  ============================================================== */

  const filteredEnquiries =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {
          return enquiries;
        }


        return enquiries.filter(
          enquiry =>
            [
              enquiry.enquiry_number,
              enquiry.company_name,
              enquiry.contact_person,
              enquiry.phone,
              enquiry.email,
              enquiry.gst_number,
              enquiry.machine_name,
              enquiry.machine_model,
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
              )
        );

      },
      [
        enquiries,
        search,
      ]
    );


  /* ==============================================================
     CREATE MODAL
  ============================================================== */

  function openCreateModal() {

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
    enquiry: Enquiry
  ) {

    setEditingEnquiry(
      enquiry
    );

    setFormError(
      ""
    );


    /*
     * Start using the Enquiry snapshot.
     */
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
     * Older enquiries were created before GST/address
     * details were stored on Enquiry.
     *
     * Recover those values silently from the internally
     * linked Customer. The Customer ID is never shown.
     */
    if (
      enquiry.customer_id
      && (
        !gstNumber
        || !address
        || !city
        || !state
        || !pincode
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
          || valueOrEmpty(
            customer.company_name
          );

        contactPerson =
          contactPerson
          || valueOrEmpty(
            customer.contact_person
          );

        phone =
          phone
          || valueOrEmpty(
            customer.phone
          );

        email =
          email
          || valueOrEmpty(
            customer.email
          );

        gstNumber =
          gstNumber
          || valueOrEmpty(
            customer.gst_number
          );

        address =
          address
          || valueOrEmpty(
            customer.address
          );

        city =
          city
          || valueOrEmpty(
            customer.city
          );

        state =
          state
          || valueOrEmpty(
            customer.state
          );

        pincode =
          pincode
          || valueOrEmpty(
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


    setForm({
      enquiry_date:
        enquiry.enquiry_date
        || "",

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
          !== null
        && enquiry.quantity
          !== undefined
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
        || "New",
    });


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
          field ===
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
        || quantity
        <= 0
      ) {

        setFormError(
          "Quantity must be a positive whole number."
        );

        return;
      }

    }


    /*
     * Notice:
     *
     * customer_id is NOT sent.
     *
     * Backend resolves the customer automatically
     * using GSTIN.
     */
    const payload = {
      enquiry_date:
        form.enquiry_date,

      company_name:
        form.company_name.trim(),

      contact_person:
        form.contact_person.trim()
        || null,

      phone:
        form.phone.trim()
        || null,

      email:
        form.email.trim()
        || null,

      gst_number:
        gstNumber,

      address:
        form.address.trim()
        || null,

      city:
        form.city.trim()
        || null,

      state:
        form.state.trim()
        || null,

      pincode:
        form.pincode.trim()
        || null,

      machine_name:
        form.machine_name.trim()
        || null,

      machine_model:
        form.machine_model.trim()
        || null,

      application:
        form.application.trim()
        || null,

      quantity,

      requirements:
        form.requirements.trim()
        || null,

      remarks:
        form.remarks.trim()
        || null,

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
        && typeof
          err.response?.data?.detail
        === "string"
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
     KPI
  ============================================================== */

  const totalEnquiries =
    enquiries.length;


  const newEnquiries =
    enquiries.filter(
      enquiry =>
        enquiry.status
        === "New"
    ).length;


  const activeEnquiries =
    enquiries.filter(
      enquiry =>
        ![
          "Completed",
          "Cancelled",
        ].includes(
          enquiry.status
        )
    ).length;


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="enquiry-page">

      {/* ========================================================
          NORMAL SCREEN
      ========================================================= */}

      <div className="enquiry-screen-content">

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
                Customer details are captured here once
                and automatically connected through the
                complete sales workflow.
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

          </div>

        </section>


        {/* ======================================================
            KPI
        ======================================================= */}

        <section className="enquiry-kpi-grid">

          <div className="kpi-card">

            <div className="kpi-label">
              Total Enquiries
            </div>

            <div className="kpi-value">
              {totalEnquiries}
            </div>

            <div className="kpi-helper">
              All recorded enquiries
            </div>

          </div>


          <div className="kpi-card">

            <div className="kpi-label">
              New Enquiries
            </div>

            <div className="kpi-value">
              {newEnquiries}
            </div>

            <div className="kpi-helper">
              Awaiting follow-up
            </div>

          </div>


          <div className="kpi-card">

            <div className="kpi-label">
              Active Pipeline
            </div>

            <div className="kpi-value">
              {activeEnquiries}
            </div>

            <div className="kpi-helper">
              Open customer opportunities
            </div>

          </div>


          <div className="kpi-card kpi-card-accent">

            <div className="kpi-label">
              Current View
            </div>

            <div className="kpi-value">
              {
                filteredEnquiries.length
              }
            </div>

            <div className="kpi-helper">
              Matching your filters
            </div>

          </div>

        </section>


        {/* ======================================================
            FILTER
        ======================================================= */}

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
                    event.target.value
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
            className="status-filter"
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
        ======================================================= */}

        {
          error
          && (
            <div className="alert alert-error">
              {error}
            </div>
          )
        }


        {/* ======================================================
            TABLE
        ======================================================= */}

        <section className="table-card">

          <div className="table-card-header">

            <div>

              <h2>
                Enquiry Records
              </h2>

              <p>
                {
                  filteredEnquiries.length
                }{" "}
                record
                {
                  filteredEnquiries.length
                  === 1
                    ? ""
                    : "s"
                }{" "}
                shown
              </p>

            </div>

          </div>


          {
            loading
              ? (
                <div className="table-state">

                  <div className="loader" />

                  <p>
                    Loading enquiries...
                  </p>

                </div>
              )
              : filteredEnquiries.length
                === 0
                ? (
                  <div className="table-state">

                    <FileText
                      size={28}
                    />

                    <h3>
                      No enquiries found
                    </h3>

                  </div>
                )
                : (
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
                          filteredEnquiries.map(
                            enquiry => (
                              <tr
                                key={
                                  enquiry.id
                                }
                              >

                                <td>

                                  <div className="enquiry-number">
                                    {
                                      enquiry.enquiry_number
                                    }
                                  </div>

                                </td>


                                <td>

                                  {
                                    formatDate(
                                      enquiry.enquiry_date
                                    )
                                  }

                                </td>


                                <td>

                                  <div className="company-name">
                                    {
                                      enquiry.company_name
                                    }
                                  </div>

                                  {
                                    enquiry.gst_number
                                    && (
                                      <div className="contact-phone">
                                        {
                                          enquiry.gst_number
                                        }
                                      </div>
                                    )
                                  }

                                </td>


                                <td>

                                  <div className="contact-name">

                                    {
                                      enquiry.contact_person
                                      || "—"
                                    }

                                  </div>

                                  <div className="contact-phone">

                                    {
                                      enquiry.phone
                                      || enquiry.email
                                      || "—"
                                    }

                                  </div>

                                </td>


                                <td>

                                  <div className="machine-name">

                                    {
                                      enquiry.machine_name
                                      || "—"
                                    }

                                  </div>

                                  {
                                    enquiry.machine_model
                                    && (
                                      <div className="machine-model">

                                        {
                                          enquiry.machine_model
                                        }

                                      </div>
                                    )
                                  }

                                </td>


                                <td>

                                  {
                                    enquiry.quantity
                                    ?? "—"
                                  }

                                </td>


                                <td>

                                  <span
                                    className={`status-badge status-${getStatusClass(
                                      enquiry.status
                                    )}`}
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

                                  </div>

                                </td>

                              </tr>
                            )
                          )
                        }

                      </tbody>

                    </table>

                  </div>
                )
          }

        </section>


        {/* ======================================================
            CREATE / EDIT MODAL
        ======================================================= */}

        {
          showModal
          && (
            <div
              className="modal-backdrop"
              onMouseDown={
                event => {

                  if (
                    event.target
                    === event.currentTarget
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
                      The ERP will automatically create
                      or reuse the Customer using GSTIN.
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
                      CUSTOMER
                  =================================================== */}

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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
                              )
                          }
                        />

                      </FormField>

                    </div>

                  </div>


                  {/* ==================================================
                      ADDRESS
                  =================================================== */}

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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
                              )
                          }
                        />

                      </FormField>

                    </div>

                  </div>


                  {/* ==================================================
                      REQUIREMENT
                  =================================================== */}

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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
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
                                event.target.value
                              )
                          }
                          placeholder="Customer requirement, specification or enquiry details"
                        />

                      </label>

                    </div>

                  </div>


                  {/* ==================================================
                      WORKFLOW
                  =================================================== */}

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
                                event.target.value
                              )
                          }
                        >

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
                                event.target.value
                              )
                          }
                        />

                      </FormField>

                    </div>

                  </div>


                  {/* ==================================================
                      FOOTER
                  =================================================== */}

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
      ========================================================= */}

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
                    printEnquiry.enquiry_number
                  }
                </h1>

              </div>


              <div className="print-header-meta">

                <PrintField
                  label="Enquiry Date"
                  value={
                    formatDate(
                      printEnquiry.enquiry_date
                    )
                  }
                />


                <PrintField
                  label="Status"
                  value={
                    printEnquiry.status
                  }
                />

              </div>

            </header>


            {/* ==================================================
                CUSTOMER PRINT
            =================================================== */}

            <PrintSection
              title="Customer Information"
            >

              <div className="print-grid">

                <PrintField
                  label="Company Name"
                  value={
                    printEnquiry.company_name
                  }
                />


                <PrintField
                  label="GSTIN"
                  value={
                    printEnquiry.gst_number
                    || "—"
                  }
                />


                <PrintField
                  label="Contact Person"
                  value={
                    printEnquiry.contact_person
                    || "—"
                  }
                />


                <PrintField
                  label="Phone"
                  value={
                    printEnquiry.phone
                    || "—"
                  }
                />


                <PrintField
                  label="Email"
                  value={
                    printEnquiry.email
                    || "—"
                  }
                />


                <PrintField
                  label="Location"
                  value={
                    [
                      printEnquiry.city,
                      printEnquiry.state,
                      printEnquiry.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")
                    || "—"
                  }
                />

              </div>


              {
                printEnquiry.address
                && (
                  <div
                    className="print-long-text"
                    style={{
                      marginTop:
                        "4mm",
                    }}
                  >
                    {
                      printEnquiry.address
                    }
                  </div>
                )
              }

            </PrintSection>


            {/* ==================================================
                REQUIREMENT PRINT
            =================================================== */}

            <PrintSection
              title="Product / Machine Requirement"
            >

              <div className="print-grid">

                <PrintField
                  label="Machine / Product"
                  value={
                    printEnquiry.machine_name
                    || "—"
                  }
                />


                <PrintField
                  label="Model / Reference"
                  value={
                    printEnquiry.machine_model
                    || "—"
                  }
                />


                <PrintField
                  label="Quantity"
                  value={
                    printEnquiry.quantity
                    !== null
                    && printEnquiry.quantity
                    !== undefined
                      ? String(
                          printEnquiry.quantity
                        )
                      : "—"
                  }
                />


                <PrintField
                  label="Application"
                  value={
                    printEnquiry.application
                    || "—"
                  }
                />

              </div>

            </PrintSection>


            <PrintSection
              title="Customer Requirements"
            >

              <div className="print-long-text">

                {
                  printEnquiry.requirements
                  || "—"
                }

              </div>

            </PrintSection>


            {
              printEnquiry.remarks
              && (
                <PrintSection
                  title="Remarks"
                >

                  <div className="print-long-text">

                    {
                      printEnquiry.remarks
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
  label: string;

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
  label: string;
  value: string;
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
  title: string;

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