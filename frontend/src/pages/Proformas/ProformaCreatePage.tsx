import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import axios from "axios";
  
  import {
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    FileText,
    Loader2,
    MapPin,
    Plus,
    Search,
    Trash2,
    UserRound,
    X,
  } from "lucide-react";
  
  import {
    useNavigate,
  } from "react-router-dom";
  
  import {
    createProforma,
  } from "../../services/proformaService";
  
  import type {
    ProformaCreate,
    ProformaItemCreate,
  } from "../../types/proforma";
  
  import "./ProformaPage.css";
  import "./ProformaCreatePage.css";
  
  
  /* ================================================================
     TYPES
  ================================================================ */
  
  interface Enquiry {
    id: number;
  
    enquiry_number: string;
    enquiry_date: string;
  
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
  }
  
  
  /* ================================================================
     CONSTANTS
  ================================================================ */
  
  const API_BASE_URL =
    "http://127.0.0.1:8000/api/v1";
  
  
  const BLOCKED_ENQUIRY_STATUSES =
    new Set([
      "order confirmed",
      "production started",
      "production completed",
      "final bill generated",
      "payment pending",
      "payment received",
      "completed",
      "cancelled",
    ]);
  
  
  const EMPTY_ITEM: ProformaItemCreate = {
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
  
  
  function formatDate(
    value: string
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
  
  
  function getApiError(
    error: unknown
  ) {
    if (
      axios.isAxiosError(
        error
      )
    ) {
      const detail =
        error.response?.data?.detail;
  
      if (
        typeof detail
        === "string"
      ) {
        return detail;
      }
    }
  
    if (
      error instanceof Error
    ) {
      return error.message;
    }
  
    return (
      "Something went wrong. "
      + "Please try again."
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
      Enquiry
  ) {
    return [
      enquiry.address,
      enquiry.city,
      enquiry.state,
      enquiry.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  }
  
  
  /* ================================================================
     PAGE
  ================================================================ */
  
  export default function ProformaCreatePage() {
  
    const navigate =
      useNavigate();
  
  
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
      selectedEnquiry,
      setSelectedEnquiry,
    ] =
      useState<
        Enquiry | null
      >(
        null
      );
  
  
    const [
      search,
      setSearch,
    ] =
      useState(
        ""
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
      proformaDate,
      setProformaDate,
    ] =
      useState(
        new Date()
          .toISOString()
          .split("T")[0]
      );
  
  
    const [
      items,
      setItems,
    ] =
      useState<
        ProformaItemCreate[]
      >([
        {
          ...EMPTY_ITEM,
        },
      ]);
  
  
    const [
      validityDays,
      setValidityDays,
    ] =
      useState(
        30
      );
  
  
    const [
      paymentTerms,
      setPaymentTerms,
    ] =
      useState(
        ""
      );
  
  
    const [
      deliveryTerms,
      setDeliveryTerms,
    ] =
      useState(
        ""
      );
  
  
    const [
      notes,
      setNotes,
    ] =
      useState(
        ""
      );
  
  
    const [
      termsAndConditions,
      setTermsAndConditions,
    ] =
      useState(
        ""
      );
  
  
    /* ==============================================================
       LOAD ENQUIRIES
    ============================================================== */
  
    useEffect(
      () => {
  
        async function load() {
  
          try {
  
            setLoading(
              true
            );
  
            setError(
              ""
            );
  
  
            const response =
              await axios.get<
                Enquiry[]
              >(
                `${API_BASE_URL}/enquiries`,
                {
                  headers:
                    getAuthHeaders(),
                }
              );
  
  
            setEnquiries(
              response.data
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
  
  
        void load();
  
      },
      []
    );
  
  
    /* ==============================================================
       ELIGIBLE ENQUIRIES
    ============================================================== */
  
    const eligibleEnquiries =
      useMemo(
        () => {
  
          return enquiries.filter(
            enquiry => {
  
              const status =
                (
                  enquiry.status
                  || ""
                )
                  .trim()
                  .toLowerCase();
  
  
              return (
                !BLOCKED_ENQUIRY_STATUSES
                  .has(
                    status
                  )
              );
  
            }
          );
  
        },
        [
          enquiries,
        ]
      );
  
  
    const visibleEnquiries =
      useMemo(
        () => {
  
          const query =
            search
              .trim()
              .toLowerCase();
  
  
          if (!query) {
            return eligibleEnquiries;
          }
  
  
          return (
            eligibleEnquiries
            .filter(
              enquiry =>
                [
                  enquiry.enquiry_number,
                  enquiry.company_name,
                  enquiry.gst_number,
                  enquiry.contact_person,
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
            )
          );
  
        },
        [
          eligibleEnquiries,
          search,
        ]
      );
  
  
    /* ==============================================================
       TOTALS
    ============================================================== */
  
    const totals =
      useMemo(
        () => {
  
          let subtotal = 0;
          let discount = 0;
          let taxable = 0;
          let tax = 0;
          let total = 0;
  
  
          items.forEach(
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
          items,
        ]
      );
  
  
    /* ==============================================================
       SELECT ENQUIRY
    ============================================================== */
  
    function selectEnquiry(
      enquiry:
        Enquiry
    ) {
  
      setSelectedEnquiry(
        enquiry
      );
  
  
      setError(
        ""
      );
  
  
      setItems([
        {
          ...EMPTY_ITEM,
  
          /*
           * Finished manufactured product name.
           * This is NOT a purchased stock Product.
           */
          description:
            enquiry.machine_name
            || "",
  
          quantity:
            enquiry.quantity
            && enquiry.quantity > 0
              ? enquiry.quantity
              : 1,
        },
      ]);
  
    }
  
  
    function changeEnquiry() {
  
      if (
        saving
      ) {
        return;
      }
  
  
      setSelectedEnquiry(
        null
      );
  
  
      setItems([
        {
          ...EMPTY_ITEM,
        },
      ]);
  
  
      setError(
        ""
      );
  
    }
  
  
    /* ==============================================================
       ITEMS
    ============================================================== */
  
    function updateItem(
      index: number,
      field:
        keyof ProformaItemCreate,
      value:
        string
        | number
        | null
    ) {
  
      setItems(
        current =>
          current.map(
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
          )
      );
  
    }
  
  
    function addItem() {
  
      setItems(
        current => [
          ...current,
  
          {
            ...EMPTY_ITEM,
          },
        ]
      );
  
    }
  
  
    function removeItem(
      index: number
    ) {
  
      if (
        items.length
        === 1
      ) {
        return;
      }
  
  
      setItems(
        current =>
          current.filter(
            (
              _,
              itemIndex
            ) =>
              itemIndex
              !== index
          )
      );
  
    }
  
  
    /* ==============================================================
       VALIDATION
    ============================================================== */
  
    function validate() {
  
      if (
        !selectedEnquiry
      ) {
        return (
          "Select an Enquiry."
        );
      }
  
  
      if (
        !proformaDate
      ) {
        return (
          "Proforma date is required."
        );
      }
  
  
      if (
        !items.length
      ) {
        return (
          "At least one item is required."
        );
      }
  
  
      for (
        let index = 0;
        index < items.length;
        index += 1
      ) {
  
        const item =
          items[
            index
          ];
  
  
        if (
          !item.description
            .trim()
        ) {
          return (
            `Item ${index + 1}: `
            + "Finished Product / "
            + "Machine name is required."
          );
        }
  
  
        if (
          Number(
            item.quantity
          ) <= 0
        ) {
          return (
            `Item ${index + 1}: `
            + "Quantity must be "
            + "greater than zero."
          );
        }
  
  
        if (
          Number(
            item.unit_price
          ) < 0
        ) {
          return (
            `Item ${index + 1}: `
            + "Unit price cannot "
            + "be negative."
          );
        }
  
  
        if (
          Number(
            item.discount_percent
          ) < 0
          ||
          Number(
            item.discount_percent
          ) > 100
        ) {
          return (
            `Item ${index + 1}: `
            + "Discount must be "
            + "between 0 and 100."
          );
        }
  
  
        if (
          Number(
            item.tax_percent
          ) < 0
          ||
          Number(
            item.tax_percent
          ) > 100
        ) {
          return (
            `Item ${index + 1}: `
            + "GST must be "
            + "between 0 and 100."
          );
        }
  
      }
  
  
      return "";
  
    }
  
  
    /* ==============================================================
       CREATE
    ============================================================== */
  
    async function handleCreate(
      event:
        React.FormEvent
    ) {
  
      event.preventDefault();
  
  
      const validation =
        validate();
  
  
      if (
        validation
      ) {
  
        setError(
          validation
        );
  
        return;
      }
  
  
      if (
        !selectedEnquiry
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
  
  
        const address =
          buildAddress(
            selectedEnquiry
          );
  
  
        const payload:
          ProformaCreate = {
  
          proforma_date:
            proformaDate,
  
          /*
           * Internal IDs are supplied automatically.
           * User never sees or enters them.
           */
          enquiry_id:
            selectedEnquiry.id,
  
          customer_id:
            selectedEnquiry
              .customer_id,
  
          company_name:
            selectedEnquiry
              .company_name,
  
          contact_person:
            selectedEnquiry
              .contact_person
            || null,
  
          phone:
            selectedEnquiry
              .phone
            || null,
  
          email:
            selectedEnquiry
              .email
            || null,
  
          billing_address:
            address
            || null,
  
          shipping_address:
            address
            || null,
  
          validity_days:
            Number(
              validityDays
            ),
  
          payment_terms:
            paymentTerms.trim()
            || null,
  
          delivery_terms:
            deliveryTerms.trim()
            || null,
  
          notes:
            notes.trim()
            || null,
  
          terms_and_conditions:
            termsAndConditions
              .trim()
            || null,
  
          status:
            "Draft",
  
          /*
           * product_id is always NULL.
           *
           * Description is the manufactured
           * product / machine name.
           */
          items:
            items.map(
              item => ({
                product_id:
                  null,
  
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
                    item.discount_percent
                  ),
  
                tax_percent:
                  Number(
                    item.tax_percent
                  ),
              })
            ),
        };
  
  
        const created =
          await createProforma(
            payload
          );
  
  
        navigate(
          `/proformas/${created.id}`
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
       SELECT ENQUIRY SCREEN
    ============================================================== */
  
    if (
      !selectedEnquiry
    ) {
  
      return (
        <div className="proforma-page">
  
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
  
          </div>
  
  
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
                  Create Proforma
                </h1>
  
  
                <p>
                  Select the customer Enquiry
                  you want to quote.
                </p>
  
              </div>
  
            </div>
  
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
  
  
          <section className="proforma-create-selector">
  
            <div className="proforma-create-selector-header">
  
              <div>
  
                <h2>
                  Select Enquiry
                </h2>
  
  
                <p>
                  Only enquiries that have not
                  reached Order Confirmed or later
                  stages are shown.
                </p>
  
              </div>
  
  
              <span className="proforma-create-count">
  
                {
                  eligibleEnquiries
                    .length
                }{" "}
                eligible
  
              </span>
  
            </div>
  
  
            <div className="proforma-enquiry-search">
  
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
                placeholder="Search ENQ number, company, GSTIN or machine..."
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
  
  
            {
              loading
                ? (
                  <div className="proforma-create-state">
  
                    <Loader2
                      size={27}
                      className="spin"
                    />
  
                    <strong>
                      Loading enquiries...
                    </strong>
  
                  </div>
                )
                : visibleEnquiries
                    .length
                  === 0
                  ? (
                    <div className="proforma-create-state">
  
                      <CheckCircle2
                        size={30}
                      />
  
                      <strong>
                        No eligible enquiries
                      </strong>
  
                      <span>
                        Create a new Enquiry or
                        change your search.
                      </span>
  
                    </div>
                  )
                  : (
                    <div className="proforma-enquiry-grid">
  
                      {
                        visibleEnquiries.map(
                          enquiry => (
  
                            <button
                              key={
                                enquiry.id
                              }
                              type="button"
                              className="proforma-enquiry-card"
                              onClick={() =>
                                selectEnquiry(
                                  enquiry
                                )
                              }
                            >
  
                              <div className="proforma-enquiry-card-top">
  
                                <div>
  
                                  <strong className="proforma-enquiry-number">
  
                                    {
                                      enquiry
                                        .enquiry_number
                                    }
  
                                  </strong>
  
  
                                  <span>
  
                                    {
                                      formatDate(
                                        enquiry
                                          .enquiry_date
                                      )
                                    }
  
                                  </span>
  
                                </div>
  
  
                                <span className="proforma-enquiry-status">
  
                                  {
                                    enquiry.status
                                  }
  
                                </span>
  
                              </div>
  
  
                              <div className="proforma-enquiry-company">
  
                                <Building2
                                  size={17}
                                />
  
                                <strong>
                                  {
                                    enquiry
                                      .company_name
                                  }
                                </strong>
  
                              </div>
  
  
                              {
                                enquiry.gst_number
                                && (
                                  <div className="proforma-enquiry-detail">
  
                                    GSTIN:{" "}
                                    {
                                      enquiry
                                        .gst_number
                                    }
  
                                  </div>
                                )
                              }
  
  
                              <div className="proforma-enquiry-detail">
  
                                Requirement:{" "}
  
                                <strong>
  
                                  {
                                    enquiry.machine_name
                                    || "Not specified"
                                  }
  
                                </strong>
  
                                {
                                  enquiry.machine_model
                                  ? (
                                    <>
                                      {" • "}
                                      {
                                        enquiry
                                          .machine_model
                                      }
                                    </>
                                  )
                                  : null
                                }
  
                              </div>
  
  
                              <div className="proforma-enquiry-detail">
  
                                Qty:{" "}
  
                                {
                                  enquiry.quantity
                                  ?? "—"
                                }
  
                              </div>
  
  
                              <div className="proforma-enquiry-select">
  
                                Select Enquiry
  
                              </div>
  
                            </button>
  
                          )
                        )
                      }
  
                    </div>
                  )
            }
  
          </section>
  
        </div>
      );
  
    }
  
  
    /* ==============================================================
       PROFORMA FORM
    ============================================================== */
  
    return (
      <div className="proforma-page">
  
        <div className="proforma-breadcrumb">
  
          <button
            type="button"
            className="breadcrumb-back"
            onClick={
              changeEnquiry
            }
          >
  
            <ArrowLeft
              size={16}
            />
  
            Select Enquiry
  
          </button>
  
        </div>
  
  
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
                Create Proforma
              </h1>
  
  
              <p>
                Creating quotation against{" "}
                <strong>
                  {
                    selectedEnquiry
                      .enquiry_number
                  }
                </strong>
              </p>
  
            </div>
  
          </div>
  
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
  
  
        <div className="proforma-workspace">
  
          <form
            className="proforma-form"
            onSubmit={
              handleCreate
            }
          >
  
            {/* ==================================================
                ENQUIRY / CUSTOMER — READ ONLY
            =================================================== */}
  
            <section className="form-card">
  
              <div className="form-card-heading">
  
                <div>
  
                  <h2>
                    Selected Enquiry
                  </h2>
  
  
                  <p>
                    Customer details are taken
                    automatically from the Enquiry.
                  </p>
  
                </div>
  
  
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    changeEnquiry
                  }
                >
                  Change Enquiry
                </button>
  
              </div>
  
  
              <div className="selected-enquiry-summary">
  
                <div className="selected-enquiry-summary-item">
  
                  <CalendarDays
                    size={17}
                  />
  
                  <div>
  
                    <span>
                      Enquiry
                    </span>
  
                    <strong>
                      {
                        selectedEnquiry
                          .enquiry_number
                      }
                    </strong>
  
                  </div>
  
                </div>
  
  
                <div className="selected-enquiry-summary-item">
  
                  <Building2
                    size={17}
                  />
  
                  <div>
  
                    <span>
                      Customer
                    </span>
  
                    <strong>
                      {
                        selectedEnquiry
                          .company_name
                      }
                    </strong>
  
                  </div>
  
                </div>
  
  
                <div className="selected-enquiry-summary-item">
  
                  <UserRound
                    size={17}
                  />
  
                  <div>
  
                    <span>
                      Contact
                    </span>
  
                    <strong>
                      {
                        selectedEnquiry
                          .contact_person
                        || "—"
                      }
                    </strong>
  
                  </div>
  
                </div>
  
  
                <div className="selected-enquiry-summary-item">
  
                  <MapPin
                    size={17}
                  />
  
                  <div>
  
                    <span>
                      Location
                    </span>
  
                    <strong>
                      {
                        [
                          selectedEnquiry
                            .city,
                          selectedEnquiry
                            .state,
                        ]
                          .filter(Boolean)
                          .join(", ")
                        || "—"
                      }
                    </strong>
  
                  </div>
  
                </div>
  
              </div>
  
  
              <div className="selected-enquiry-customer-details">
  
                <div>
  
                  <span>
                    GSTIN
                  </span>
  
                  <strong>
  
                    {
                      selectedEnquiry
                        .gst_number
                      || "—"
                    }
  
                  </strong>
  
                </div>
  
  
                <div>
  
                  <span>
                    Phone
                  </span>
  
                  <strong>
  
                    {
                      selectedEnquiry
                        .phone
                      || "—"
                    }
  
                  </strong>
  
                </div>
  
  
                <div>
  
                  <span>
                    Email
                  </span>
  
                  <strong>
  
                    {
                      selectedEnquiry
                        .email
                      || "—"
                    }
  
                  </strong>
  
                </div>
  
  
                <div className="selected-enquiry-address">
  
                  <span>
                    Address
                  </span>
  
                  <strong>
  
                    {
                      buildAddress(
                        selectedEnquiry
                      )
                      || "—"
                    }
  
                  </strong>
  
                </div>
  
              </div>
  
            </section>
  
  
            {/* ==================================================
                ITEMS
            =================================================== */}
  
            <section className="form-card">
  
              <div className="form-card-heading">
  
                <div>
  
                  <h2>
                    Items
                  </h2>
  
  
                  <p>
                    Enter the machine or finished
                    product Glisen will manufacture.
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
  
                <table className="items-table manufactured-items-table">
  
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
                      items.map(
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
  
                              <td className="manufactured-name-cell">
  
                                <input
                                  type="text"
                                  value={
                                    item.description
                                  }
                                  onChange={
                                    event =>
                                      updateItem(
                                        index,
                                        "description",
                                        event
                                          .target
                                          .value
                                      )
                                  }
                                  placeholder="e.g. Custom Hydraulic Press"
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
                                  type="text"
                                  value={
                                    item.unit
                                  }
                                  onChange={
                                    event =>
                                      updateItem(
                                        index,
                                        "unit",
                                        event
                                          .target
                                          .value
                                      )
                                  }
                                  placeholder="Nos"
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
                                    item
                                      .discount_percent
                                  }
                                  onChange={
                                    event =>
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
                                  onChange={
                                    event =>
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
                                  className="item-delete-button"
                                  disabled={
                                    items.length
                                    === 1
                                  }
                                  onClick={() =>
                                    removeItem(
                                      index
                                    )
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
                      )
                    }
  
                  </tbody>
  
                </table>
  
              </div>
  
            </section>
  
  
            {/* ==================================================
                COMMERCIAL TERMS
            =================================================== */}
  
            <section className="form-card">
  
              <div className="form-card-heading">
  
                <div>
  
                  <h2>
                    Commercial Terms
                  </h2>
  
  
                  <p>
                    Payment, delivery and
                    quotation conditions.
                  </p>
  
                </div>
  
              </div>
  
  
              <div className="form-grid two">
  
                <label>
  
                  <span>
                    Proforma Date
                  </span>
  
                  <input
                    type="date"
                    value={
                      proformaDate
                    }
                    onChange={
                      event =>
                        setProformaDate(
                          event.target
                            .value
                        )
                    }
                  />
  
                </label>
  
  
                <label>
  
                  <span>
                    Validity Days
                  </span>
  
                  <input
                    type="number"
                    min="1"
                    value={
                      validityDays
                    }
                    onChange={
                      event =>
                        setValidityDays(
                          Number(
                            event.target
                              .value
                          )
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
                      paymentTerms
                    }
                    onChange={
                      event =>
                        setPaymentTerms(
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
                    rows={3}
                    value={
                      deliveryTerms
                    }
                    onChange={
                      event =>
                        setDeliveryTerms(
                          event.target
                            .value
                        )
                    }
                    placeholder="e.g. Delivery within 30 days"
                  />
  
                </label>
  
  
                <label>
  
                  <span>
                    Notes
                  </span>
  
                  <textarea
                    rows={4}
                    value={
                      notes
                    }
                    onChange={
                      event =>
                        setNotes(
                          event.target
                            .value
                        )
                    }
                  />
  
                </label>
  
  
                <label>
  
                  <span>
                    Terms & Conditions
                  </span>
  
                  <textarea
                    rows={4}
                    value={
                      termsAndConditions
                    }
                    onChange={
                      event =>
                        setTermsAndConditions(
                          event.target
                            .value
                        )
                    }
                  />
  
                </label>
  
              </div>
  
            </section>
  
  
            <div className="proforma-create-actions">
  
              <button
                type="button"
                className="secondary-button"
                disabled={
                  saving
                }
                onClick={() =>
                  navigate(
                    "/proformas"
                  )
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
  
                {
                  saving
                    ? (
                      <Loader2
                        size={17}
                        className="spin"
                      />
                    )
                    : (
                      <CheckCircle2
                        size={17}
                      />
                    )
                }
  
                {
                  saving
                    ? "Creating..."
                    : "Create Proforma"
                }
  
              </button>
  
            </div>
  
          </form>
  
  
          {/* ======================================================
              SUMMARY
          ======================================================= */}
  
          <aside className="proforma-summary-card">
  
            <div className="summary-eyebrow">
              DOCUMENT SUMMARY
            </div>
  
  
            <h3>
              New Proforma
            </h3>
  
  
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
  
  
            <div className="summary-row">
  
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
  
  
            <div className="summary-row">
  
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
  
  
            <div className="summary-row">
  
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
  
  
            <div className="summary-row">
  
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
  
  
            <div className="summary-divider" />
  
  
            <div className="summary-row">
  
              <span>
                Enquiry
              </span>
  
              <strong>
                {
                  selectedEnquiry
                    .enquiry_number
                }
              </strong>
  
            </div>
  
  
            <div className="summary-row">
  
              <span>
                Items
              </span>
  
              <strong>
                {
                  items.length
                }
              </strong>
  
            </div>
  
  
            <div className="summary-row">
  
              <span>
                Validity
              </span>
  
              <strong>
                {
                  validityDays
                } days
              </strong>
  
            </div>
  
          </aside>
  
        </div>
  
      </div>
    );
  }