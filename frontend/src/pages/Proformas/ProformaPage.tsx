import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
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
    Search,
    Trash2,
    X,
  } from "lucide-react";
  
  import {
    useLocation,
    useNavigate,
    useParams,
  } from "react-router-dom";
  
  import axios from "axios";
  
  import {
    createProforma,
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
  
  const STATUS_OPTIONS = [
    "Draft",
    "Sent",
    "Confirmed",
    "Rejected",
    "Cancelled",
  ];
  
  const EMPTY_ITEM: ProformaItemCreate = {
    product_id: null,
    description: "",
    quantity: 1,
    unit: "Nos",
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 18,
  };
  
  const EMPTY_FORM: ProformaCreate = {
    proforma_date:
      new Date()
        .toISOString()
        .split("T")[0],
  
    enquiry_id: 0,
    customer_id: 0,
  
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
  
    billing_address: "",
    shipping_address: "",
  
    validity_days: 30,
  
    payment_terms: "",
    delivery_terms: "",
  
    notes: "",
    terms_and_conditions: "",
  
    status: "Draft",
  
    items: [
      {
        ...EMPTY_ITEM,
      },
    ],
  };
  
  function money(value: string | number) {
    const amount = Number(value || 0);
  
    return amount.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }
  
  function formatDate(value: string) {
    if (!value) {
      return "-";
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
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
  
  function statusClass(status: string) {
    return status
      .toLowerCase()
      .replace(/\s+/g, "-");
  }
  
  function getApiError(error: unknown) {
    if (
      axios.isAxiosError(error)
    ) {
      const detail =
        error.response?.data?.detail;
  
      if (typeof detail === "string") {
        return detail;
      }
    }
  
    if (error instanceof Error) {
      return error.message;
    }
  
    return "Something went wrong. Please try again.";
  }
  
  function calculatePreviewItem(
    item: ProformaItemCreate
  ) {
    const quantity =
      Number(item.quantity) || 0;
  
    const unitPrice =
      Number(item.unit_price) || 0;
  
    const discountPercent =
      Number(item.discount_percent) || 0;
  
    const taxPercent =
      Number(item.tax_percent) || 0;
  
    const gross =
      quantity * unitPrice;
  
    const discount =
      gross *
      (discountPercent / 100);
  
    const taxable =
      gross - discount;
  
    const tax =
      taxable *
      (taxPercent / 100);
  
    const total =
      taxable + tax;
  
    return {
      gross,
      discount,
      taxable,
      tax,
      total,
    };
  }
  
  function emptyFormFromProforma(
    proforma: Proforma
  ): ProformaCreate {
    return {
      proforma_date:
        proforma.proforma_date,
  
      enquiry_id:
        proforma.enquiry_id,
  
      customer_id:
        proforma.customer_id,
  
      company_name:
        proforma.company_name,
  
      contact_person:
        proforma.contact_person || "",
  
      phone:
        proforma.phone || "",
  
      email:
        proforma.email || "",
  
      billing_address:
        proforma.billing_address || "",
  
      shipping_address:
        proforma.shipping_address || "",
  
      validity_days:
        proforma.validity_days,
  
      payment_terms:
        proforma.payment_terms || "",
  
      delivery_terms:
        proforma.delivery_terms || "",
  
      notes:
        proforma.notes || "",
  
      terms_and_conditions:
        proforma.terms_and_conditions ||
        "",
  
      status:
        proforma.status,
  
      items: proforma.items.map(
        (item) => ({
          product_id:
            item.product_id,
  
          description:
            item.description || "",
  
          quantity:
            Number(item.quantity),
  
          unit:
            item.unit || "Nos",
  
          unit_price:
            Number(item.unit_price),
  
          discount_percent:
            Number(
              item.discount_percent
            ),
  
          tax_percent:
            Number(item.tax_percent),
        })
      ),
    };
  }
  
  export default function ProformaPage() {
    const navigate = useNavigate();
  
    const location =
      useLocation();
  
    const { id } =
      useParams<{
        id: string;
      }>();
  
    const isCreate =
      location.pathname.endsWith(
        "/new"
      );
  
    const isDetails =
      Boolean(id) && !isCreate;
  
    const [proformas, setProformas] =
      useState<Proforma[]>([]);
  
    const [selectedProforma, setSelectedProforma] =
      useState<Proforma | null>(null);
  
    const [form, setForm] =
      useState<ProformaCreate>(
        EMPTY_FORM
      );
  
    const [search, setSearch] =
      useState("");
  
    const [statusFilter, setStatusFilter] =
      useState("");
  
    const [loading, setLoading] =
      useState(true);
  
    const [saving, setSaving] =
      useState(false);
  
    const [deleting, setDeleting] =
      useState(false);
  
    const [error, setError] =
      useState("");
  
    const [formError, setFormError] =
      useState("");
  
    const [copied, setCopied] =
      useState(false);
  
    const loadProformas =
      async () => {
        try {
          setLoading(true);
          setError("");
  
          const data =
            await getProformas({
              search,
              status:
                statusFilter || undefined,
            });
  
          setProformas(data);
        } catch (err) {
          setError(
            getApiError(err)
          );
        } finally {
          setLoading(false);
        }
      };
  
    const loadDetails =
      async (
        proformaId: number
      ) => {
        try {
          setLoading(true);
          setError("");
  
          const data =
            await getProformaById(
              proformaId
            );
  
          setSelectedProforma(
            data
          );
  
          setForm(
            emptyFormFromProforma(
              data
            )
          );
        } catch (err) {
          setError(
            getApiError(err)
          );
        } finally {
          setLoading(false);
        }
      };
  
    useEffect(() => {
      if (isDetails && id) {
        loadDetails(
          Number(id)
        );
  
        return;
      }
  
      if (isCreate) {
        setLoading(false);
        setSelectedProforma(
          null
        );
        setForm({
          ...EMPTY_FORM,
          items: [
            {
              ...EMPTY_ITEM,
            },
          ],
        });
  
        return;
      }
  
      loadProformas();
    }, [
      isDetails,
      isCreate,
      id,
      statusFilter,
    ]);
  
    const filteredProformas =
      useMemo(() => {
        if (!search.trim()) {
          return proformas;
        }
  
        const query =
          search
            .toLowerCase()
            .trim();
  
        return proformas.filter(
          (proforma) =>
            [
              proforma.proforma_number,
              proforma.company_name,
              proforma.contact_person,
              proforma.phone,
              proforma.email,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
              )
        );
      }, [
        proformas,
        search,
      ]);
  
    const totals =
      useMemo(() => {
        let subtotal = 0;
        let discount = 0;
        let taxable = 0;
        let tax = 0;
        let grandTotal = 0;
  
        form.items.forEach(
          (item) => {
            const calculated =
              calculatePreviewItem(
                item
              );
  
            subtotal +=
              calculated.gross;
  
            discount +=
              calculated.discount;
  
            taxable +=
              calculated.taxable;
  
            tax +=
              calculated.tax;
  
            grandTotal +=
              calculated.total;
          }
        );
  
        return {
          subtotal,
          discount,
          taxable,
          tax,
          grandTotal,
        };
      }, [form.items]);
  
    const updateField = <
      K extends keyof ProformaCreate
    >(
      field: K,
      value: ProformaCreate[K]
    ) => {
      setForm(
        (current) => ({
          ...current,
          [field]: value,
        })
      );
    };
  
    const updateItem = (
      index: number,
      field: keyof ProformaItemCreate,
      value: string | number | null
    ) => {
      setForm(
        (current) => ({
          ...current,
          items: current.items.map(
            (item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    [field]: value,
                  }
                : item
          ),
        })
      );
    };
  
    const addItem = () => {
      setForm(
        (current) => ({
          ...current,
          items: [
            ...current.items,
            {
              ...EMPTY_ITEM,
            },
          ],
        })
      );
    };
  
    const removeItem = (
      index: number
    ) => {
      if (
        form.items.length === 1
      ) {
        return;
      }
  
      setForm(
        (current) => ({
          ...current,
          items:
            current.items.filter(
              (_, itemIndex) =>
                itemIndex !== index
            ),
        })
      );
    };
  
    const validateForm =
      () => {
        if (
          !form.proforma_date
        ) {
          return "Proforma date is required.";
        }
  
        if (
          !Number.isInteger(
            Number(form.enquiry_id)
          ) ||
          Number(form.enquiry_id) <=
            0
        ) {
          return "Enter a valid enquiry ID.";
        }
  
        if (
          !Number.isInteger(
            Number(form.customer_id)
          ) ||
          Number(form.customer_id) <=
            0
        ) {
          return "Enter a valid customer ID.";
        }
  
        if (
          !form.company_name.trim()
        ) {
          return "Company name is required.";
        }
  
        if (
          !form.items.length
        ) {
          return "At least one item is required.";
        }
  
        for (
          let index = 0;
          index < form.items.length;
          index += 1
        ) {
          const item =
            form.items[index];
  
          if (
            !item.description.trim()
          ) {
            return `Item ${index + 1}: description is required.`;
          }
  
          if (
            Number(item.quantity) <=
            0
          ) {
            return `Item ${index + 1}: quantity must be greater than zero.`;
          }
  
          if (
            Number(item.unit_price) <
            0
          ) {
            return `Item ${index + 1}: unit price cannot be negative.`;
          }
        }
  
        return "";
      };
  
    const handleSave =
      async (
        event: React.FormEvent
      ) => {
        event.preventDefault();
  
        const validation =
          validateForm();
  
        if (validation) {
          setFormError(
            validation
          );
  
          return;
        }
  
        try {
          setSaving(true);
          setFormError("");
  
          const payload: ProformaCreate =
            {
              ...form,
  
              enquiry_id:
                Number(
                  form.enquiry_id
                ),
  
              customer_id:
                Number(
                  form.customer_id
                ),
  
              validity_days:
                form.validity_days ===
                  null
                  ? null
                  : Number(
                      form.validity_days
                    ),
  
              items:
                form.items.map(
                  (item) => ({
                    ...item,
                    product_id:
                      item.product_id
                        ? Number(
                            item.product_id
                          )
                        : null,
                    quantity:
                      Number(
                        item.quantity
                      ),
                    unit_price:
                      Number(
                        item.unit_price
                      ),
                    discount_percent:
                      Number(
                        item.discount_percent
                      ),
                    tax_percent:
                      Number(
                        item.tax_percent
                      ),
                  })
                ),
            };
  
          if (
            selectedProforma
          ) {
            await updateProforma(
              selectedProforma.id,
              payload
            );
  
            navigate(
              `/proformas/${selectedProforma.id}`
            );
          } else {
            const created =
              await createProforma(
                payload
              );
  
            navigate(
              `/proformas/${created.id}`
            );
          }
        } catch (err) {
          setFormError(
            getApiError(err)
          );
        } finally {
          setSaving(false);
        }
      };
  
    const handleStatusChange =
      async (
        newStatus: string
      ) => {
        if (
          !selectedProforma
        ) {
          return;
        }
  
        try {
          setSaving(true);
          setError("");
  
          const updated =
            await updateProformaStatus(
              selectedProforma.id,
              newStatus
            );
  
          setSelectedProforma(
            updated
          );
  
          setForm(
            emptyFormFromProforma(
              updated
            )
          );
        } catch (err) {
          setError(
            getApiError(err)
          );
        } finally {
          setSaving(false);
        }
      };
  
    const handleDelete =
      async () => {
        if (
          !selectedProforma
        ) {
          return;
        }
  
        const confirmed =
          window.confirm(
            `Delete ${selectedProforma.proforma_number}? This action cannot be undone.`
          );
  
        if (!confirmed) {
          return;
        }
  
        try {
          setDeleting(true);
  
          await deleteProforma(
            selectedProforma.id
          );
  
          navigate(
            "/proformas"
          );
        } catch (err) {
          setError(
            getApiError(err)
          );
        } finally {
          setDeleting(false);
        }
      };
  
    const copyNumber =
      async () => {
        if (
          !selectedProforma
        ) {
          return;
        }
  
        await navigator.clipboard.writeText(
          selectedProforma.proforma_number
        );
  
        setCopied(true);
  
        window.setTimeout(
          () => setCopied(false),
          1800
        );
      };
  
    const handlePrint =
      () => {
        window.print();
      };
  
    if (
      isCreate ||
      selectedProforma
    ) {
      return (
        <div className="proforma-page">
          <div className="proforma-breadcrumb">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/proformas"
                )
              }
              className="breadcrumb-back"
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
              {selectedProforma
                ? selectedProforma.proforma_number
                : "New Proforma"}
            </span>
          </div>
  
          {error && (
            <div className="proforma-alert error">
              <span>{error}</span>
  
              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                <X size={16} />
              </button>
            </div>
          )}
  
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
                  {selectedProforma
                    ? selectedProforma.proforma_number
                    : "Create Proforma"}
                </h1>
  
                <p>
                  {selectedProforma
                    ? "Review, edit and manage this customer proforma."
                    : "Prepare a professional quotation from the customer enquiry."}
                </p>
              </div>
            </div>
  
            <div className="page-actions">
              {selectedProforma && (
                <>
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
                    {copied ? (
                      <CheckCircle2
                        size={17}
                      />
                    ) : (
                      <Copy
                        size={17}
                      />
                    )}
  
                    {copied
                      ? "Copied"
                      : "Copy Number"}
                  </button>
  
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
                    {deleting ? (
                      <Loader2
                        size={17}
                        className="spin"
                      />
                    ) : (
                      <Trash2
                        size={17}
                      />
                    )}
                    Delete
                  </button>
                </>
              )}
            </div>
          </section>
  
          <div className="proforma-workspace">
            <form
              className="proforma-form"
              onSubmit={
                handleSave
              }
            >
              <section className="form-card">
                <div className="form-card-heading">
                  <div>
                    <h2>
                      Proforma Information
                    </h2>
                    <p>
                      Basic document and customer details
                    </p>
                  </div>
  
                  {selectedProforma && (
                    <span
                      className={`status-badge ${statusClass(
                        selectedProforma.status
                      )}`}
                    >
                      {
                        selectedProforma.status
                      }
                    </span>
                  )}
                </div>
  
                <div className="form-grid three">
                  <label>
                    <span>
                      Proforma Date *
                    </span>
  
                    <input
                      type="date"
                      value={
                        form.proforma_date
                      }
                      onChange={(event) =>
                        updateField(
                          "proforma_date",
                          event.target
                            .value
                        )
                      }
                    />
                  </label>
  
                  <label>
                    <span>
                      Enquiry ID *
                    </span>
  
                    <input
                      type="number"
                      min="1"
                      value={
                        form.enquiry_id ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "enquiry_id",
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      placeholder="e.g. 1"
                    />
                  </label>
  
                  <label>
                    <span>
                      Customer ID *
                    </span>
  
                    <input
                      type="number"
                      min="1"
                      value={
                        form.customer_id ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "customer_id",
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      placeholder="e.g. 1"
                    />
                  </label>
                </div>
              </section>
  
              <section className="form-card">
                <div className="form-card-heading">
                  <div>
                    <h2>
                      Customer Details
                    </h2>
                    <p>
                      Information displayed on the Proforma
                    </p>
                  </div>
                </div>
  
                <div className="form-grid two">
                  <label>
                    <span>
                      Company Name *
                    </span>
  
                    <input
                      value={
                        form.company_name
                      }
                      onChange={(event) =>
                        updateField(
                          "company_name",
                          event.target
                            .value
                        )
                      }
                      placeholder="Company name"
                    />
                  </label>
  
                  <label>
                    <span>
                      Contact Person
                    </span>
  
                    <input
                      value={
                        form.contact_person ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "contact_person",
                          event.target
                            .value
                        )
                      }
                      placeholder="Contact person"
                    />
                  </label>
  
                  <label>
                    <span>
                      Phone
                    </span>
  
                    <input
                      value={
                        form.phone || ""
                      }
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target
                            .value
                        )
                      }
                      placeholder="Phone number"
                    />
                  </label>
  
                  <label>
                    <span>
                      Email
                    </span>
  
                    <input
                      type="email"
                      value={
                        form.email || ""
                      }
                      onChange={(event) =>
                        updateField(
                          "email",
                          event.target
                            .value
                        )
                      }
                      placeholder="customer@example.com"
                    />
                  </label>
  
                  <label className="span-two">
                    <span>
                      Billing Address
                    </span>
  
                    <textarea
                      rows={3}
                      value={
                        form.billing_address ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "billing_address",
                          event.target
                            .value
                        )
                      }
                      placeholder="Billing address"
                    />
                  </label>
  
                  <label className="span-two">
                    <span>
                      Shipping Address
                    </span>
  
                    <textarea
                      rows={3}
                      value={
                        form.shipping_address ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "shipping_address",
                          event.target
                            .value
                        )
                      }
                      placeholder="Shipping address"
                    />
                  </label>
                </div>
              </section>
  
              <section className="form-card">
                <div className="form-card-heading">
                  <div>
                    <h2>
                      Items
                    </h2>
  
                    <p>
                      Products, pricing, discounts and GST
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
                          Product ID
                        </th>
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
                          Tax %
                        </th>
                        <th>
                          Total
                        </th>
                        <th />
                      </tr>
                    </thead>
  
                    <tbody>
                      {form.items.map(
                        (
                          item,
                          index
                        ) => {
                          const calculated =
                            calculatePreviewItem(
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
                                  type="number"
                                  min="1"
                                  value={
                                    item.product_id ??
                                    ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "product_id",
                                      event
                                        .target
                                        .value
                                        ? Number(
                                            event
                                              .target
                                              .value
                                          )
                                        : null
                                    )
                                  }
                                  placeholder="ID"
                                />
                              </td>
  
                              <td>
                                <input
                                  value={
                                    item.description
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "description",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Product / service description"
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
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "quantity",
                                      Number(
                                        event
                                          .target
                                          .value
                                      )
                                    )
                                  }
                                />
                              </td>
  
                              <td>
                                <input
                                  value={
                                    item.unit
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "unit",
                                      event
                                        .target
                                        .value
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
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "unit_price",
                                      Number(
                                        event
                                          .target
                                          .value
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
                                    item.discount_percent
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "discount_percent",
                                      Number(
                                        event
                                          .target
                                          .value
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
                                    item.tax_percent
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "tax_percent",
                                      Number(
                                        event
                                          .target
                                          .value
                                      )
                                    )
                                  }
                                />
                              </td>
  
                              <td className="line-total">
                                ₹
                                {money(
                                  calculated.total
                                )}
                              </td>
  
                              <td>
                                <button
                                  type="button"
                                  className="icon-danger-button"
                                  onClick={() =>
                                    removeItem(
                                      index
                                    )
                                  }
                                  disabled={
                                    form
                                      .items
                                      .length ===
                                    1
                                  }
                                  title="Remove item"
                                >
                                  <Trash2
                                    size={16}
                                  />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
  
              <section className="form-card">
                <div className="form-card-heading">
                  <div>
                    <h2>
                      Commercial Terms
                    </h2>
                    <p>
                      Payment, delivery and document notes
                    </p>
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
                        form.validity_days ??
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "validity_days",
                          event.target
                            .value
                            ? Number(
                                event.target
                                  .value
                              )
                            : null
                        )
                      }
                    />
                  </label>
  
                  <label>
                    <span>
                      Status
                    </span>
  
                    <select
                      value={
                        form.status
                      }
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target
                            .value
                        )
                      }
                    >
                      {STATUS_OPTIONS.map(
                        (status) => (
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
                      )}
                    </select>
                  </label>
  
                  <label>
                    <span>
                      Payment Terms
                    </span>
  
                    <textarea
                      rows={4}
                      value={
                        form.payment_terms ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "payment_terms",
                          event.target
                            .value
                        )
                      }
                      placeholder="e.g. 50% advance, balance before delivery"
                    />
                  </label>
  
                  <label>
                    <span>
                      Delivery Terms
                    </span>
  
                    <textarea
                      rows={4}
                      value={
                        form.delivery_terms ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "delivery_terms",
                          event.target
                            .value
                        )
                      }
                      placeholder="e.g. Delivery within 15 days"
                    />
                  </label>
  
                  <label>
                    <span>
                      Notes
                    </span>
  
                    <textarea
                      rows={4}
                      value={
                        form.notes || ""
                      }
                      onChange={(event) =>
                        updateField(
                          "notes",
                          event.target
                            .value
                        )
                      }
                      placeholder="Internal/customer-facing notes"
                    />
                  </label>
  
                  <label>
                    <span>
                      Terms & Conditions
                    </span>
  
                    <textarea
                      rows={4}
                      value={
                        form.terms_and_conditions ||
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "terms_and_conditions",
                          event.target
                            .value
                        )
                      }
                      placeholder="Standard terms and conditions"
                    />
                  </label>
                </div>
              </section>
  
              {formError && (
                <div className="proforma-alert error">
                  <strong>
                    Please check the form
                  </strong>
  
                  <span>
                    {formError}
                  </span>
                </div>
              )}
  
              <div className="form-bottom-bar">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    navigate(
                      "/proformas"
                    )
                  }
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
                    <Loader2
                      size={17}
                      className="spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={17}
                    />
                  )}
  
                  {selectedProforma
                    ? "Save Changes"
                    : "Create Proforma"}
                </button>
              </div>
            </form>
  
            <aside className="proforma-summary">
              <div className="summary-card">
                <div className="summary-card-header">
                  <div>
                    <span>
                      DOCUMENT SUMMARY
                    </span>
  
                    <h3>
                      {selectedProforma
                        ? selectedProforma.proforma_number
                        : "New Proforma"}
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
                    {money(
                      totals.grandTotal
                    )}
                  </strong>
                </div>
  
                <div className="summary-lines">
                  <div>
                    <span>
                      Subtotal
                    </span>
  
                    <strong>
                      ₹
                      {money(
                        totals.subtotal
                      )}
                    </strong>
                  </div>
  
                  <div>
                    <span>
                      Discount
                    </span>
  
                    <strong>
                      − ₹
                      {money(
                        totals.discount
                      )}
                    </strong>
                  </div>
  
                  <div>
                    <span>
                      Taxable Amount
                    </span>
  
                    <strong>
                      ₹
                      {money(
                        totals.taxable
                      )}
                    </strong>
                  </div>
  
                  <div>
                    <span>
                      GST / Tax
                    </span>
  
                    <strong>
                      ₹
                      {money(
                        totals.tax
                      )}
                    </strong>
                  </div>
                </div>
  
                <div className="summary-divider" />
  
                <div className="summary-meta">
                  <div>
                    <span>
                      Items
                    </span>
  
                    <strong>
                      {
                        form.items
                          .length
                      }
                    </strong>
                  </div>
  
                  <div>
                    <span>
                      Validity
                    </span>
  
                    <strong>
                      {form.validity_days ??
                        "-"}{" "}
                      days
                    </strong>
                  </div>
                </div>
              </div>
  
              {selectedProforma && (
                <div className="status-card">
                  <div className="status-card-title">
                    <span>
                      WORKFLOW STATUS
                    </span>
  
                    <CheckCircle2
                      size={17}
                    />
                  </div>
  
                  <select
                    value={
                      selectedProforma.status
                    }
                    onChange={(
                      event
                    ) =>
                      handleStatusChange(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      saving
                    }
                  >
                    {STATUS_OPTIONS.map(
                      (status) => (
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
                    )}
                  </select>
  
                  <p>
                    Change the document status without editing the rest of the Proforma.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      );
    }
  
    return (
      <div className="proforma-page">
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
                Create, manage and track professional customer proformas.
              </p>
            </div>
          </div>
  
          <div className="page-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={
                loadProformas
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
                {proformas.length}
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
                    (item) =>
                      item.status ===
                      "Draft"
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
                Confirmed
              </span>
  
              <strong>
                {
                  proformas.filter(
                    (item) =>
                      item.status ===
                      "Confirmed"
                  ).length
                }
              </strong>
  
              <small>
                Customer-approved
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
                {money(
                  proformas.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      Number(
                        item.grand_total
                      ),
                    0
                  )
                )}
              </strong>
  
              <small>
                Current records
              </small>
            </div>
          </div>
        </section>
  
        <section className="filter-card">
          <div className="search-box">
            <Search
              size={18}
            />
  
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search proforma number, company, contact or phone..."
            />
  
            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={16} />
              </button>
            )}
          </div>
  
          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All Statuses
            </option>
  
            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>
        </section>
  
        {error && (
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
              <X size={16} />
            </button>
          </div>
        )}
  
        <section className="table-card">
          <div className="table-card-header">
            <div>
              <h2>
                Proforma Records
              </h2>
  
              <p>
                {filteredProformas.length}{" "}
                record
                {filteredProformas.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </p>
            </div>
  
            <span className="table-meta">
              Sales → Proforma
            </span>
          </div>
  
          {loading ? (
            <div className="table-state">
              <Loader2
                size={28}
                className="spin"
              />
  
              <h3>
                Loading proformas...
              </h3>
  
              <p>
                Connecting to the ERP backend.
              </p>
            </div>
          ) : filteredProformas.length ===
            0 ? (
            <div className="table-state">
              <div className="empty-state-icon">
                <FileText
                  size={27}
                />
              </div>
  
              <h3>
                No proformas found
              </h3>
  
              <p>
                {search ||
                statusFilter
                  ? "Try changing your search or status filter."
                  : "Create your first Proforma to begin the sales quotation workflow."}
              </p>
  
              {!search &&
                !statusFilter && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                      navigate(
                        "/proformas/new"
                      )
                    }
                  >
                    <Plus
                      size={17}
                    />
                    Create Proforma
                  </button>
                )}
            </div>
          ) : (
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
                      Enquiry
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
                  {filteredProformas.map(
                    (
                      proforma
                    ) => (
                      <tr
                        key={
                          proforma.id
                        }
                      >
                        <td>
                          <div className="record-primary">
                            {
                              proforma.proforma_number
                            }
                          </div>
  
                          <div className="record-secondary">
                            ID #
                            {
                              proforma.id
                            }
                          </div>
                        </td>
  
                        <td>
                          {
                            formatDate(
                              proforma.proforma_date
                            )
                          }
                        </td>
  
                        <td>
                          <div className="customer-name">
                            {
                              proforma.company_name
                            }
                          </div>
  
                          {proforma.contact_person && (
                            <div className="record-secondary">
                              {
                                proforma.contact_person
                              }
                            </div>
                          )}
                        </td>
  
                        <td>
                          <span className="id-pill">
                            #
                            {
                              proforma.enquiry_id
                            }
                          </span>
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
                            {money(
                              proforma.grand_total
                            )}
                          </strong>
                        </td>
  
                        <td>
                          <span
                            className={`status-badge ${statusClass(
                              proforma.status
                            )}`}
                          >
                            {
                              proforma.status
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
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }