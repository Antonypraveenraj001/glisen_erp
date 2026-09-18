import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
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


interface Enquiry {
  id: number;

  enquiry_number: string;
  enquiry_date: string;

  customer_id: number;

  company_name: string;

  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;

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


interface EnquiryForm {
  enquiry_date: string;

  customer_id: string;

  company_name: string;

  contact_person: string;
  phone: string;
  email: string;

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


function createEmptyForm(): EnquiryForm {
  return {
    enquiry_date:
      new Date()
        .toISOString()
        .split("T")[0],

    customer_id: "",

    company_name: "",

    contact_person: "",
    phone: "",
    email: "",

    machine_name: "",
    machine_model: "",

    application: "",

    quantity: "",

    requirements: "",
    remarks: "",

    status: "New",
  };
}


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
     LOAD
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
     FILTER
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
     MODAL
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


  function openEditModal(
    enquiry: Enquiry
  ) {

    setEditingEnquiry(
      enquiry
    );


    setForm({
      enquiry_date:
        enquiry.enquiry_date
        || "",

      customer_id:
        String(
          enquiry.customer_id
        ),

      company_name:
        enquiry.company_name
        || "",

      contact_person:
        enquiry.contact_person
        || "",

      phone:
        enquiry.phone
        || "",

      email:
        enquiry.email
        || "",

      machine_name:
        enquiry.machine_name
        || "",

      machine_model:
        enquiry.machine_model
        || "",

      application:
        enquiry.application
        || "",

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
        enquiry.requirements
        || "",

      remarks:
        enquiry.remarks
        || "",

      status:
        enquiry.status
        || "New",
    });


    setFormError(
      ""
    );

    setShowModal(
      true
    );

  }


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
          value,
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


    const customerId =
      Number(
        form.customer_id
      );


    if (
      !Number.isInteger(
        customerId
      )
      || customerId
      <= 0
    ) {

      setFormError(
        "Enter a valid Customer ID."
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


    const payload =
      {
        enquiry_date:
          form.enquiry_date,

        customer_id:
          customerId,

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
                Capture, track and manage customer
                enquiries before generating a proforma.
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


        {/* KPI */}

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


        {/* FILTER */}

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
              placeholder="Search enquiry number, company, contact, phone or machine..."
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


        {/* ERROR */}

        {
          error
          && (
            <div className="alert alert-error">
              {error}
            </div>
          )
        }


        {/* TABLE */}

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
                                        openEditModal(
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
                      Enter customer and machine
                      requirements below.
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
                        label="Customer ID *"
                      >
                        <input
                          type="number"
                          min="1"
                          value={
                            form.customer_id
                          }
                          onChange={
                            event =>
                              updateForm(
                                "customer_id",
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
                        />
                      </FormField>


                      <FormField
                        label="Contact Person"
                      >
                        <input
                          type="text"
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


                  <div className="form-section">

                    <div className="form-section-title">
                      Machine & Requirement
                    </div>


                    <div className="form-grid form-grid-3">

                      <FormField
                        label="Machine Name"
                      >
                        <input
                          type="text"
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
                        />
                      </FormField>


                      <FormField
                        label="Machine Model"
                      >
                        <input
                          type="text"
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
                        />

                      </label>

                    </div>

                  </div>


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

              </div>

            </PrintSection>


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
                  label="Model"
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
    React.ReactNode;
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
    React.ReactNode;
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