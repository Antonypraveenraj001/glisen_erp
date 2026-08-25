import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, Plus, RefreshCw, Pencil, X, FileText } from "lucide-react";

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

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

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

const EMPTY_FORM: EnquiryForm = {
  enquiry_date: new Date().toISOString().split("T")[0],
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

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

function formatDate(date: string) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: string) {
  return status
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function EnquiryList() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);

  const [form, setForm] = useState<EnquiryForm>(EMPTY_FORM);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await axios.get<Enquiry[]>(
        `${API_BASE_URL}/enquiries`,
        {
          headers: getAuthHeaders(),
          params,
        }
      );

      setEnquiries(response.data);
    } catch (err) {
      console.error("Enquiry loading error:", err);

      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Your session has expired. Please login again.");
      } else if (
        axios.isAxiosError(err) &&
        typeof err.response?.data?.detail === "string"
      ) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load enquiries.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [statusFilter]);

  const filteredEnquiries = useMemo(() => {
    if (!search.trim()) {
      return enquiries;
    }

    const query = search.toLowerCase().trim();

    return enquiries.filter((enquiry) =>
      [
        enquiry.enquiry_number,
        enquiry.company_name,
        enquiry.contact_person,
        enquiry.phone,
        enquiry.machine_name,
        enquiry.machine_model,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [enquiries, search]);

  const openCreateModal = () => {
    setEditingEnquiry(null);
    setForm({
      ...EMPTY_FORM,
      enquiry_date: new Date().toISOString().split("T")[0],
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (enquiry: Enquiry) => {
    setEditingEnquiry(enquiry);

    setForm({
      enquiry_date: enquiry.enquiry_date || "",
      customer_id: String(enquiry.customer_id ?? ""),
      company_name: enquiry.company_name || "",
      contact_person: enquiry.contact_person || "",
      phone: enquiry.phone || "",
      email: enquiry.email || "",
      machine_name: enquiry.machine_name || "",
      machine_model: enquiry.machine_model || "",
      application: enquiry.application || "",
      quantity:
        enquiry.quantity !== null &&
        enquiry.quantity !== undefined
          ? String(enquiry.quantity)
          : "",
      requirements: enquiry.requirements || "",
      remarks: enquiry.remarks || "",
      status: enquiry.status || "New",
    });

    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingEnquiry(null);
    setFormError("");
  };

  const handleFormChange = (
    field: keyof EnquiryForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setFormError("");

    if (!form.enquiry_date) {
      setFormError("Enquiry date is required.");
      return;
    }

    if (!form.customer_id.trim()) {
      setFormError("Customer ID is required.");
      return;
    }

    if (!form.company_name.trim()) {
      setFormError("Company name is required.");
      return;
    }

    const customerId = Number(form.customer_id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      setFormError("Customer ID must be a valid positive number.");
      return;
    }

    let quantity: number | null = null;

    if (form.quantity.trim()) {
      quantity = Number(form.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        setFormError("Quantity must be a positive whole number.");
        return;
      }
    }

    const payload = {
      enquiry_date: form.enquiry_date,
      customer_id: customerId,
      company_name: form.company_name.trim(),
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      machine_name: form.machine_name.trim() || null,
      machine_model: form.machine_model.trim() || null,
      application: form.application.trim() || null,
      quantity,
      requirements: form.requirements.trim() || null,
      remarks: form.remarks.trim() || null,
      status: form.status,
    };

    try {
      setSaving(true);

      if (editingEnquiry) {
        await axios.put(
          `${API_BASE_URL}/enquiries/${editingEnquiry.id}`,
          payload,
          {
            headers: getAuthHeaders(),
          }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/enquiries`,
          payload,
          {
            headers: getAuthHeaders(),
          }
        );
      }

      closeModal();
      await fetchEnquiries();
    } catch (err) {
      console.error("Enquiry save error:", err);

      if (
        axios.isAxiosError(err) &&
        typeof err.response?.data?.detail === "string"
      ) {
        setFormError(err.response.data.detail);
      } else {
        setFormError(
          editingEnquiry
            ? "Unable to update enquiry."
            : "Unable to create enquiry."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const totalEnquiries = enquiries.length;

  const newEnquiries = enquiries.filter(
    (enquiry) => enquiry.status === "New"
  ).length;

  const activeEnquiries = enquiries.filter(
    (enquiry) =>
      !["Completed", "Cancelled"].includes(enquiry.status)
  ).length;

  return (
    <div className="enquiry-page">
      {/* =========================
          PAGE HEADER
      ========================== */}

      <section className="enquiry-header">
        <div className="enquiry-title-group">
          <div className="enquiry-title-icon">
            <FileText size={22} />
          </div>

          <div>
            <div className="page-eyebrow">
              SALES WORKFLOW
            </div>

            <h1>Enquiries</h1>

            <p>
              Capture, track and manage customer enquiries
              before generating a proforma.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={fetchEnquiries}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            New Enquiry
          </button>
        </div>
      </section>

      {/* =========================
          KPI CARDS
      ========================== */}

      <section className="enquiry-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Enquiries</div>
          <div className="kpi-value">{totalEnquiries}</div>
          <div className="kpi-helper">
            All recorded enquiries
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">New Enquiries</div>
          <div className="kpi-value">{newEnquiries}</div>
          <div className="kpi-helper">
            Awaiting follow-up
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Active Pipeline</div>
          <div className="kpi-value">{activeEnquiries}</div>
          <div className="kpi-helper">
            Open customer opportunities
          </div>
        </div>

        <div className="kpi-card kpi-card-accent">
          <div className="kpi-label">Current View</div>
          <div className="kpi-value">
            {filteredEnquiries.length}
          </div>
          <div className="kpi-helper">
            Matching your filters
          </div>
        </div>
      </section>

      {/* =========================
          FILTER BAR
      ========================== */}

      <section className="filter-card">
        <div className="filter-search">
          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search enquiry number, company, contact, phone or machine..."
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          className="status-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="">All Statuses</option>

          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="filter-refresh"
          onClick={fetchEnquiries}
          disabled={loading}
        >
          Apply
        </button>
      </section>

      {/* =========================
          ERROR
      ========================== */}

      {error && (
        <div className="alert alert-error">
          <strong>Unable to load enquiries</strong>
          <span>{error}</span>
        </div>
      )}

      {/* =========================
          TABLE
      ========================== */}

      <section className="table-card">
        <div className="table-card-header">
          <div>
            <h2>Enquiry Records</h2>
            <p>
              {filteredEnquiries.length} record
              {filteredEnquiries.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="table-header-meta">
            Search and status filters update the current view.
          </div>
        </div>

        {loading ? (
          <div className="table-state">
            <div className="loader" />
            <p>Loading enquiries...</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="table-state empty-state">
            <div className="empty-icon">
              <FileText size={28} />
            </div>

            <h3>No enquiries found</h3>

            <p>
              {search || statusFilter
                ? "Try changing your search or filter."
                : "Create your first customer enquiry to get started."}
            </p>

            {!search && !statusFilter && (
              <button
                type="button"
                className="primary-button"
                onClick={openCreateModal}
              >
                <Plus size={17} />
                Create Enquiry
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Enquiry</th>
                  <th>Date</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Machine</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEnquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td>
                      <div className="enquiry-number">
                        {enquiry.enquiry_number}
                      </div>

                      <div className="record-id">
                        ID #{enquiry.id}
                      </div>
                    </td>

                    <td>
                      <span className="date-value">
                        {formatDate(enquiry.enquiry_date)}
                      </span>
                    </td>

                    <td>
                      <div className="company-name">
                        {enquiry.company_name}
                      </div>

                      <div className="customer-reference">
                        Customer #{enquiry.customer_id}
                      </div>
                    </td>

                    <td>
                      <div className="contact-name">
                        {enquiry.contact_person || "-"}
                      </div>

                      <div className="contact-phone">
                        {enquiry.phone || enquiry.email || "-"}
                      </div>
                    </td>

                    <td>
                      <div className="machine-name">
                        {enquiry.machine_name || "-"}
                      </div>

                      {enquiry.machine_model && (
                        <div className="machine-model">
                          {enquiry.machine_model}
                        </div>
                      )}
                    </td>

                    <td>
                      {enquiry.quantity ?? "-"}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${getStatusClass(
                          enquiry.status
                        )}`}
                      >
                        {enquiry.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="icon-action-button"
                        onClick={() =>
                          openEditModal(enquiry)
                        }
                        title="Edit enquiry"
                        aria-label={`Edit ${enquiry.enquiry_number}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =========================
          CREATE / EDIT MODAL
      ========================== */}

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="enquiry-modal">
            <div className="modal-header">
              <div>
                <div className="page-eyebrow">
                  {editingEnquiry
                    ? "UPDATE RECORD"
                    : "NEW RECORD"}
                </div>

                <h2>
                  {editingEnquiry
                    ? `Edit ${editingEnquiry.enquiry_number}`
                    : "Create New Enquiry"}
                </h2>

                <p>
                  Enter the customer and machine requirements
                  below.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="alert alert-error modal-alert">
                {formError}
              </div>
            )}

            <form
              className="enquiry-form"
              onSubmit={handleSubmit}
            >
              <div className="form-section">
                <div className="form-section-title">
                  Customer Information
                </div>

                <div className="form-grid form-grid-3">
                  <label className="form-field">
                    <span>
                      Enquiry Date <b>*</b>
                    </span>

                    <input
                      type="date"
                      value={form.enquiry_date}
                      onChange={(event) =>
                        handleFormChange(
                          "enquiry_date",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Customer ID <b>*</b>
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={form.customer_id}
                      onChange={(event) =>
                        handleFormChange(
                          "customer_id",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 1"
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Company Name <b>*</b>
                    </span>

                    <input
                      type="text"
                      value={form.company_name}
                      onChange={(event) =>
                        handleFormChange(
                          "company_name",
                          event.target.value
                        )
                      }
                      placeholder="Company name"
                    />
                  </label>

                  <label className="form-field">
                    <span>Contact Person</span>

                    <input
                      type="text"
                      value={form.contact_person}
                      onChange={(event) =>
                        handleFormChange(
                          "contact_person",
                          event.target.value
                        )
                      }
                      placeholder="Contact person"
                    />
                  </label>

                  <label className="form-field">
                    <span>Phone</span>

                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        handleFormChange(
                          "phone",
                          event.target.value
                        )
                      }
                      placeholder="Phone number"
                    />
                  </label>

                  <label className="form-field">
                    <span>Email</span>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        handleFormChange(
                          "email",
                          event.target.value
                        )
                      }
                      placeholder="customer@example.com"
                    />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">
                  Machine & Requirement
                </div>

                <div className="form-grid form-grid-3">
                  <label className="form-field">
                    <span>Machine Name</span>

                    <input
                      type="text"
                      value={form.machine_name}
                      onChange={(event) =>
                        handleFormChange(
                          "machine_name",
                          event.target.value
                        )
                      }
                      placeholder="Machine name"
                    />
                  </label>

                  <label className="form-field">
                    <span>Machine Model</span>

                    <input
                      type="text"
                      value={form.machine_model}
                      onChange={(event) =>
                        handleFormChange(
                          "machine_model",
                          event.target.value
                        )
                      }
                      placeholder="Model"
                    />
                  </label>

                  <label className="form-field">
                    <span>Quantity</span>

                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) =>
                        handleFormChange(
                          "quantity",
                          event.target.value
                        )
                      }
                      placeholder="Quantity"
                    />
                  </label>

                  <label className="form-field form-field-wide">
                    <span>Application</span>

                    <input
                      type="text"
                      value={form.application}
                      onChange={(event) =>
                        handleFormChange(
                          "application",
                          event.target.value
                        )
                      }
                      placeholder="How the machine will be used"
                    />
                  </label>

                  <label className="form-field form-field-wide">
                    <span>Requirements</span>

                    <textarea
                      rows={3}
                      value={form.requirements}
                      onChange={(event) =>
                        handleFormChange(
                          "requirements",
                          event.target.value
                        )
                      }
                      placeholder="Customer technical requirements..."
                    />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">
                  Workflow
                </div>

                <div className="form-grid form-grid-2">
                  <label className="form-field">
                    <span>Status</span>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        handleFormChange(
                          "status",
                          event.target.value
                        )
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Remarks</span>

                    <input
                      type="text"
                      value={form.remarks}
                      onChange={(event) =>
                        handleFormChange(
                          "remarks",
                          event.target.value
                        )
                      }
                      placeholder="Internal remarks"
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText size={17} />
                      {editingEnquiry
                        ? "Update Enquiry"
                        : "Create Enquiry"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}