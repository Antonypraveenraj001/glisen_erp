import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    Building2,
    Edit3,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    UserRound,
    X,
  } from "lucide-react";
  
  import "./CustomerPage.css";
  
  import {
    createCustomer,
    deactivateCustomer,
    getCustomers,
    updateCustomer,
  } from "../../services/customerService";
  
  import type {
    Customer,
    CustomerCreatePayload,
  } from "../../types/customer";
  
  
  const EMPTY_FORM: CustomerCreatePayload = {
    customer_code: "",
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    gst_number: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_active: true,
  };
  
  
  export default function CustomerPage() {
    const [customers, setCustomers] =
      useState<Customer[]>([]);
  
    const [search, setSearch] =
      useState("");
  
    const [loading, setLoading] =
      useState(true);
  
    const [saving, setSaving] =
      useState(false);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const [showForm, setShowForm] =
      useState(false);
  
    const [editingCustomer, setEditingCustomer] =
      useState<Customer | null>(null);
  
    const [form, setForm] =
      useState<CustomerCreatePayload>(
        EMPTY_FORM
      );
  
  
    async function loadCustomers(
      query = ""
    ) {
      try {
        setLoading(true);
        setError(null);
  
        const data =
          await getCustomers(query);
  
        setCustomers(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load customers."
        );
      } finally {
        setLoading(false);
      }
    }
  
  
    useEffect(() => {
      void loadCustomers();
    }, []);
  
  
    const activeCount =
      useMemo(
        () =>
          customers.filter(
            (customer) =>
              customer.is_active
          ).length,
        [customers]
      );
  
  
    const inactiveCount =
      useMemo(
        () =>
          customers.filter(
            (customer) =>
              !customer.is_active
          ).length,
        [customers]
      );
  
  
    function openCreateForm() {
      setEditingCustomer(null);
      setForm(EMPTY_FORM);
      setShowForm(true);
    }
  
  
    function openEditForm(
      customer: Customer
    ) {
      setEditingCustomer(customer);
  
      setForm({
        customer_code:
          customer.customer_code,
  
        company_name:
          customer.company_name,
  
        contact_person:
          customer.contact_person,
  
        email:
          customer.email,
  
        phone:
          customer.phone,
  
        gst_number:
          customer.gst_number,
  
        address:
          customer.address,
  
        city:
          customer.city,
  
        state:
          customer.state,
  
        pincode:
          customer.pincode,
  
        is_active:
          customer.is_active,
      });
  
      setShowForm(true);
    }
  
  
    function closeForm() {
      setShowForm(false);
      setEditingCustomer(null);
      setForm(EMPTY_FORM);
    }
  
  
    function updateField(
      field: keyof CustomerCreatePayload,
      value: string | boolean
    ) {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    }
  
  
    async function handleSubmit(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      try {
        setSaving(true);
        setError(null);
  
        if (editingCustomer) {
          await updateCustomer(
            editingCustomer.id,
            form
          );
        } else {
          await createCustomer(form);
        }
  
        closeForm();
  
        await loadCustomers(search);
      } catch (err) {
        console.error(err);
  
        setError(
          editingCustomer
            ? "Unable to update customer."
            : "Unable to create customer."
        );
      } finally {
        setSaving(false);
      }
    }
  
  
    async function handleDeactivate(
      customer: Customer
    ) {
      const confirmed =
        window.confirm(
          `Deactivate ${customer.company_name}?`
        );
  
      if (!confirmed) {
        return;
      }
  
      try {
        setError(null);
  
        await deactivateCustomer(
          customer.id
        );
  
        await loadCustomers(search);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to deactivate customer."
        );
      }
    }
  
  
    async function handleSearch(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      await loadCustomers(search);
    }
  
  
    async function handleClearSearch() {
      setSearch("");
  
      await loadCustomers("");
    }
  
  
    return (
      <div className="customer-page">
  
        <div className="customer-page-header">
          <div>
            <div className="customer-eyebrow">
              CUSTOMER MASTER
            </div>
  
            <h1 className="customer-title">
              Customers
            </h1>
  
            <p className="customer-subtitle">
              Manage customer companies,
              contact information, GST details,
              and active sales relationships.
            </p>
          </div>
  
          <button
            type="button"
            className="customer-primary-button"
            onClick={openCreateForm}
          >
            <Plus size={17} />
  
            Add Customer
          </button>
        </div>
  
  
        {error && (
          <div className="customer-error">
            {error}
          </div>
        )}
  
  
        <div className="customer-kpi-grid">
  
          <div className="customer-kpi-card">
            <div>
              <div className="customer-kpi-label">
                Total Customers
              </div>
  
              <div className="customer-kpi-value">
                {customers.length}
              </div>
            </div>
  
            <div className="customer-kpi-icon blue">
              <Building2 size={20} />
            </div>
          </div>
  
  
          <div className="customer-kpi-card">
            <div>
              <div className="customer-kpi-label">
                Active Customers
              </div>
  
              <div className="customer-kpi-value">
                {activeCount}
              </div>
            </div>
  
            <div className="customer-kpi-icon green">
              <ShieldCheck size={20} />
            </div>
          </div>
  
  
          <div className="customer-kpi-card">
            <div>
              <div className="customer-kpi-label">
                Inactive Customers
              </div>
  
              <div className="customer-kpi-value">
                {inactiveCount}
              </div>
            </div>
  
            <div className="customer-kpi-icon rose">
              <Building2 size={20} />
            </div>
          </div>
  
        </div>
  
  
        <div className="customer-toolbar">
          <form
            className="customer-search"
            onSubmit={handleSearch}
          >
            <Search size={17} />
  
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search code, company, contact or phone..."
            />
  
            {search && (
              <button
                type="button"
                className="customer-search-clear"
                onClick={handleClearSearch}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
  
            <button
              type="submit"
              className="customer-secondary-button"
            >
              Search
            </button>
          </form>
        </div>
  
  
        <div className="customer-panel">
  
          <div className="customer-panel-header">
            <div>
              <div className="customer-panel-title">
                Customer Directory
              </div>
  
              <div className="customer-panel-subtitle">
                Registered customers available
                for sales transactions.
              </div>
            </div>
  
            <div className="customer-panel-badge">
              {customers.length} records
            </div>
          </div>
  
  
          {loading ? (
            <div className="customer-loading-state">
              <Loader2
                size={23}
                className="customer-spin"
              />
  
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="customer-empty-state">
              <Building2 size={25} />
  
              <div>
                No customers found.
              </div>
            </div>
          ) : (
            <div className="customer-table-wrap">
  
              <table className="customer-table">
  
                <thead>
                  <tr>
                    <th>
                      Customer
                    </th>
  
                    <th>
                      Contact
                    </th>
  
                    <th>
                      Email
                    </th>
  
                    <th>
                      Phone
                    </th>
  
                    <th>
                      GSTIN
                    </th>
  
                    <th>
                      Location
                    </th>
  
                    <th>
                      Status
                    </th>
  
                    <th className="align-right">
                      Actions
                    </th>
                  </tr>
                </thead>
  
  
                <tbody>
                  {customers.map(
                    (customer) => (
                      <tr key={customer.id}>
  
                        <td>
                          <div className="customer-company">
                            {customer.company_name}
                          </div>
  
                          <div className="customer-code">
                            {customer.customer_code}
                          </div>
                        </td>
  
  
                        <td>
                          <div className="customer-inline">
                            <UserRound size={13} />
  
                            {customer.contact_person}
                          </div>
                        </td>
  
  
                        <td>
                          <div className="customer-inline">
                            <Mail size={13} />
  
                            {customer.email}
                          </div>
                        </td>
  
  
                        <td>
                          <div className="customer-inline">
                            <Phone size={13} />
  
                            {customer.phone}
                          </div>
                        </td>
  
  
                        <td>
                          <span className="customer-gstin">
                            {customer.gst_number}
                          </span>
                        </td>
  
  
                        <td>
                          <div className="customer-inline">
                            <MapPin size={13} />
  
                            {customer.city},
                            {" "}
                            {customer.state}
                          </div>
                        </td>
  
  
                        <td>
                          <span
                            className={
                              customer.is_active
                                ? "customer-status active"
                                : "customer-status inactive"
                            }
                          >
                            {customer.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>
  
  
                        <td className="align-right">
                          <div className="customer-actions">
  
                            <button
                              type="button"
                              className="customer-icon-button"
                              onClick={() =>
                                openEditForm(
                                  customer
                                )
                              }
                              title="Edit customer"
                            >
                              <Edit3 size={15} />
                            </button>
  
  
                            {customer.is_active && (
                              <button
                                type="button"
                                className="customer-deactivate-button"
                                onClick={() =>
                                  handleDeactivate(
                                    customer
                                  )
                                }
                              >
                                Deactivate
                              </button>
                            )}
  
                          </div>
                        </td>
  
                      </tr>
                    )
                  )}
                </tbody>
  
              </table>
            </div>
          )}
  
        </div>
  
  
        {showForm && (
          <div className="customer-modal-backdrop">
  
            <div className="customer-modal">
  
              <div className="customer-modal-header">
                <div>
                  <div className="customer-modal-title">
                    {editingCustomer
                      ? "Edit Customer"
                      : "Add Customer"}
                  </div>
  
                  <div className="customer-modal-subtitle">
                    Enter customer master information.
                  </div>
                </div>
  
                <button
                  type="button"
                  className="customer-modal-close"
                  onClick={closeForm}
                >
                  <X size={18} />
                </button>
              </div>
  
  
              <form
                className="customer-form"
                onSubmit={handleSubmit}
              >
  
                <div className="customer-form-grid">
  
                  <label className="customer-field">
                    <span>
                      Customer Code *
                    </span>
  
                    <input
                      required
                      value={
                        form.customer_code
                      }
                      onChange={(event) =>
                        updateField(
                          "customer_code",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      Company Name *
                    </span>
  
                    <input
                      required
                      value={
                        form.company_name
                      }
                      onChange={(event) =>
                        updateField(
                          "company_name",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      Contact Person *
                    </span>
  
                    <input
                      required
                      value={
                        form.contact_person
                      }
                      onChange={(event) =>
                        updateField(
                          "contact_person",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      Email *
                    </span>
  
                    <input
                      required
                      type="email"
                      value={
                        form.email
                      }
                      onChange={(event) =>
                        updateField(
                          "email",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      Phone *
                    </span>
  
                    <input
                      required
                      value={
                        form.phone
                      }
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      GST Number *
                    </span>
  
                    <input
                      required
                      value={
                        form.gst_number
                      }
                      onChange={(event) =>
                        updateField(
                          "gst_number",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      City *
                    </span>
  
                    <input
                      required
                      value={
                        form.city
                      }
                      onChange={(event) =>
                        updateField(
                          "city",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      State *
                    </span>
  
                    <input
                      required
                      value={
                        form.state
                      }
                      onChange={(event) =>
                        updateField(
                          "state",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-field">
                    <span>
                      Pincode *
                    </span>
  
                    <input
                      required
                      value={
                        form.pincode
                      }
                      onChange={(event) =>
                        updateField(
                          "pincode",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="customer-checkbox-field">
                    <input
                      type="checkbox"
                      checked={
                        form.is_active
                      }
                      onChange={(event) =>
                        updateField(
                          "is_active",
                          event.target.checked
                        )
                      }
                    />
  
                    Active Customer
                  </label>
  
                </div>
  
  
                <label className="customer-field customer-field-full">
                  <span>
                    Address *
                  </span>
  
                  <textarea
                    required
                    rows={3}
                    value={
                      form.address
                    }
                    onChange={(event) =>
                      updateField(
                        "address",
                        event.target.value
                      )
                    }
                  />
                </label>
  
  
                <div className="customer-form-actions">
  
                  <button
                    type="button"
                    className="customer-ghost-button"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
  
  
                  <button
                    type="submit"
                    className="customer-primary-button"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="customer-spin"
                      />
                    ) : (
                      <Plus size={16} />
                    )}
  
                    {editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
                  </button>
  
                </div>
  
              </form>
  
            </div>
          </div>
        )}
  
      </div>
    );
  }