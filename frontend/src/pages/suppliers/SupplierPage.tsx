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
  
  import "./SupplierPage.css";
  
  import {
    createSupplier,
    deactivateSupplier,
    getSuppliers,
    updateSupplier,
  } from "../../services/supplierService";
  
  import type {
    Supplier,
    SupplierCreatePayload,
  } from "../../types/supplier";
  
  
  const EMPTY_FORM: SupplierCreatePayload = {
    supplier_code: "",
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
  
  
  export default function SupplierPage() {
    const [suppliers, setSuppliers] =
      useState<Supplier[]>([]);
  
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
  
    const [editingSupplier, setEditingSupplier] =
      useState<Supplier | null>(null);
  
    const [form, setForm] =
      useState<SupplierCreatePayload>(
        EMPTY_FORM
      );
  
  
    async function loadSuppliers(
      query = ""
    ) {
      try {
        setLoading(true);
        setError(null);
  
        const data =
          await getSuppliers(query);
  
        setSuppliers(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load suppliers."
        );
      } finally {
        setLoading(false);
      }
    }
  
  
    useEffect(() => {
      void loadSuppliers();
    }, []);
  
  
    const activeCount =
      useMemo(
        () =>
          suppliers.filter(
            (supplier) =>
              supplier.is_active
          ).length,
        [suppliers]
      );
  
  
    const inactiveCount =
      useMemo(
        () =>
          suppliers.filter(
            (supplier) =>
              !supplier.is_active
          ).length,
        [suppliers]
      );
  
  
    function openCreateForm() {
      setEditingSupplier(null);
      setForm(EMPTY_FORM);
      setShowForm(true);
    }
  
  
    function openEditForm(
      supplier: Supplier
    ) {
      setEditingSupplier(supplier);
  
      setForm({
        supplier_code:
          supplier.supplier_code,
  
        company_name:
          supplier.company_name,
  
        contact_person:
          supplier.contact_person,
  
        email:
          supplier.email,
  
        phone:
          supplier.phone,
  
        gst_number:
          supplier.gst_number,
  
        address:
          supplier.address,
  
        city:
          supplier.city,
  
        state:
          supplier.state,
  
        pincode:
          supplier.pincode,
  
        is_active:
          supplier.is_active,
      });
  
      setShowForm(true);
    }
  
  
    function closeForm() {
      setShowForm(false);
      setEditingSupplier(null);
      setForm(EMPTY_FORM);
    }
  
  
    function updateField(
      field: keyof SupplierCreatePayload,
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
  
        if (editingSupplier) {
          await updateSupplier(
            editingSupplier.id,
            form
          );
        } else {
          await createSupplier(form);
        }
  
        closeForm();
  
        await loadSuppliers(search);
      } catch (err) {
        console.error(err);
  
        setError(
          editingSupplier
            ? "Unable to update supplier."
            : "Unable to create supplier."
        );
      } finally {
        setSaving(false);
      }
    }
  
  
    async function handleDeactivate(
      supplier: Supplier
    ) {
      const confirmed =
        window.confirm(
          `Deactivate ${supplier.company_name}?`
        );
  
      if (!confirmed) {
        return;
      }
  
      try {
        setError(null);
  
        await deactivateSupplier(
          supplier.id
        );
  
        await loadSuppliers(search);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to deactivate supplier."
        );
      }
    }
  
  
    async function handleSearch(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      await loadSuppliers(search);
    }
  
  
    async function handleClearSearch() {
      setSearch("");
  
      await loadSuppliers("");
    }
  
  
    return (
      <div className="supplier-page">
  
        <div className="supplier-page-header">
          <div>
            <div className="supplier-eyebrow">
              SUPPLIER MASTER
            </div>
  
            <h1 className="supplier-title">
              Suppliers
            </h1>
  
            <p className="supplier-subtitle">
              Manage supplier companies,
              contact details, GST information,
              and availability for purchasing.
            </p>
          </div>
  
          <button
            type="button"
            className="supplier-primary-button"
            onClick={openCreateForm}
          >
            <Plus size={17} />
  
            Add Supplier
          </button>
        </div>
  
  
        {error && (
          <div className="supplier-error">
            {error}
          </div>
        )}
  
  
        <div className="supplier-kpi-grid">
  
          <div className="supplier-kpi-card">
            <div>
              <div className="supplier-kpi-label">
                Total Suppliers
              </div>
  
              <div className="supplier-kpi-value">
                {suppliers.length}
              </div>
            </div>
  
            <div className="supplier-kpi-icon blue">
              <Building2 size={20} />
            </div>
          </div>
  
  
          <div className="supplier-kpi-card">
            <div>
              <div className="supplier-kpi-label">
                Active Suppliers
              </div>
  
              <div className="supplier-kpi-value">
                {activeCount}
              </div>
            </div>
  
            <div className="supplier-kpi-icon green">
              <ShieldCheck size={20} />
            </div>
          </div>
  
  
          <div className="supplier-kpi-card">
            <div>
              <div className="supplier-kpi-label">
                Inactive Suppliers
              </div>
  
              <div className="supplier-kpi-value">
                {inactiveCount}
              </div>
            </div>
  
            <div className="supplier-kpi-icon rose">
              <Building2 size={20} />
            </div>
          </div>
  
        </div>
  
  
        <div className="supplier-toolbar">
          <form
            className="supplier-search"
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
                className="supplier-search-clear"
                onClick={handleClearSearch}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
  
            <button
              type="submit"
              className="supplier-secondary-button"
            >
              Search
            </button>
          </form>
        </div>
  
  
        <div className="supplier-panel">
  
          <div className="supplier-panel-header">
            <div>
              <div className="supplier-panel-title">
                Supplier Directory
              </div>
  
              <div className="supplier-panel-subtitle">
                Registered suppliers available
                for purchase transactions.
              </div>
            </div>
  
            <div className="supplier-panel-badge">
              {suppliers.length} records
            </div>
          </div>
  
  
          {loading ? (
            <div className="supplier-loading-state">
              <Loader2
                size={23}
                className="supplier-spin"
              />
  
              Loading suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="supplier-empty-state">
              <Building2 size={25} />
  
              <div>
                No suppliers found.
              </div>
            </div>
          ) : (
            <div className="supplier-table-wrap">
  
              <table className="supplier-table">
  
                <thead>
                  <tr>
                    <th>
                      Supplier
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
                  {suppliers.map(
                    (supplier) => (
                      <tr key={supplier.id}>
  
                        <td>
                          <div className="supplier-company">
                            {supplier.company_name}
                          </div>
  
                          <div className="supplier-code">
                            {supplier.supplier_code}
                          </div>
                        </td>
  
  
                        <td>
                          <div className="supplier-inline">
                            <UserRound size={13} />
  
                            {supplier.contact_person}
                          </div>
                        </td>
  
  
                        <td>
                          <div className="supplier-inline">
                            <Mail size={13} />
  
                            {supplier.email}
                          </div>
                        </td>
  
  
                        <td>
                          <div className="supplier-inline">
                            <Phone size={13} />
  
                            {supplier.phone}
                          </div>
                        </td>
  
  
                        <td>
                          <span className="supplier-gstin">
                            {supplier.gst_number}
                          </span>
                        </td>
  
  
                        <td>
                          <div className="supplier-inline">
                            <MapPin size={13} />
  
                            {supplier.city},
                            {" "}
                            {supplier.state}
                          </div>
                        </td>
  
  
                        <td>
                          <span
                            className={
                              supplier.is_active
                                ? "supplier-status active"
                                : "supplier-status inactive"
                            }
                          >
                            {supplier.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>
  
  
                        <td className="align-right">
                          <div className="supplier-actions">
  
                            <button
                              type="button"
                              className="supplier-icon-button"
                              onClick={() =>
                                openEditForm(
                                  supplier
                                )
                              }
                              title="Edit supplier"
                            >
                              <Edit3 size={15} />
                            </button>
  
  
                            {supplier.is_active && (
                              <button
                                type="button"
                                className="supplier-deactivate-button"
                                onClick={() =>
                                  handleDeactivate(
                                    supplier
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
          <div className="supplier-modal-backdrop">
  
            <div className="supplier-modal">
  
              <div className="supplier-modal-header">
                <div>
                  <div className="supplier-modal-title">
                    {editingSupplier
                      ? "Edit Supplier"
                      : "Add Supplier"}
                  </div>
  
                  <div className="supplier-modal-subtitle">
                    Enter supplier master information.
                  </div>
                </div>
  
                <button
                  type="button"
                  className="supplier-modal-close"
                  onClick={closeForm}
                >
                  <X size={18} />
                </button>
              </div>
  
  
              <form
                className="supplier-form"
                onSubmit={handleSubmit}
              >
  
                <div className="supplier-form-grid">
  
                  <label className="supplier-field">
                    <span>
                      Supplier Code *
                    </span>
  
                    <input
                      required
                      value={
                        form.supplier_code
                      }
                      onChange={(event) =>
                        updateField(
                          "supplier_code",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-field">
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
  
  
                  <label className="supplier-checkbox-field">
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
  
                    Active Supplier
                  </label>
  
                </div>
  
  
                <label className="supplier-field supplier-field-full">
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
  
  
                <div className="supplier-form-actions">
  
                  <button
                    type="button"
                    className="supplier-ghost-button"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
  
  
                  <button
                    type="submit"
                    className="supplier-primary-button"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="supplier-spin"
                      />
                    ) : (
                      <Plus size={16} />
                    )}
  
                    {editingSupplier
                      ? "Save Changes"
                      : "Create Supplier"}
                  </button>
  
                </div>
  
              </form>
  
            </div>
          </div>
        )}
  
      </div>
    );
  }