import {
  useEffect,
  useState,
} from "react";

import {
  Building2,
  Edit3,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
  X,
} from "lucide-react";

import "./CustomerPage.css";

import {
  getCustomers,
  updateCustomer,
} from "../../services/customerService";

import type {
  Customer,
  CustomerUpdatePayload,
} from "../../types/customer";


const EMPTY_FORM:
CustomerUpdatePayload = {

  company_name: "",

  contact_person: "",

  email: "",

  phone: "",

  address: "",

  city: "",

  state: "",

  pincode: "",
};


export default function CustomerPage() {

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>([]);


  const [
    search,
    setSearch,
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    showForm,
    setShowForm,
  ] =
    useState(false);


  const [
    editingCustomer,
    setEditingCustomer,
  ] =
    useState<
      Customer | null
    >(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState<
      CustomerUpdatePayload
    >(
      EMPTY_FORM
    );


  /* ==============================================================
     LOAD CUSTOMERS
  ============================================================== */

  async function loadCustomers(
    query = ""
  ) {

    try {

      setLoading(
        true
      );

      setError(
        null
      );


      const data =
        await getCustomers(
          query
        );


      setCustomers(
        data
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        "Unable to load customers."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadCustomers();

    },
    []
  );


  /* ==============================================================
     EDIT CUSTOMER
  ============================================================== */

  function openEditForm(
    customer: Customer
  ) {

    setEditingCustomer(
      customer
    );


    setForm({

      company_name:
        customer.company_name
        ??
        "",

      contact_person:
        customer.contact_person
        ??
        "",

      email:
        customer.email
        ??
        "",

      phone:
        customer.phone
        ??
        "",

      address:
        customer.address
        ??
        "",

      city:
        customer.city
        ??
        "",

      state:
        customer.state
        ??
        "",

      pincode:
        customer.pincode
        ??
        "",
    });


    setShowForm(
      true
    );

  }


  function closeForm() {

    if (
      saving
    ) {
      return;
    }


    setShowForm(
      false
    );


    setEditingCustomer(
      null
    );


    setForm(
      EMPTY_FORM
    );

  }


  function updateField(
    field:
      keyof CustomerUpdatePayload,
    value: string
  ) {

    setForm(
      current => ({
        ...current,

        [field]:
          value,
      })
    );

  }


  async function handleSubmit(
    event:
      React.FormEvent
  ) {

    event.preventDefault();


    if (
      !editingCustomer
    ) {
      return;
    }


    try {

      setSaving(
        true
      );

      setError(
        null
      );


      await updateCustomer(
        editingCustomer.id,
        form
      );


      setShowForm(
        false
      );


      setEditingCustomer(
        null
      );


      setForm(
        EMPTY_FORM
      );


      await loadCustomers(
        search
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        "Unable to update customer."
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     SEARCH
  ============================================================== */

  async function handleSearch(
    event:
      React.FormEvent
  ) {

    event.preventDefault();


    await loadCustomers(
      search
    );

  }


  async function handleClearSearch() {

    setSearch(
      ""
    );


    await loadCustomers(
      ""
    );

  }


  /* ==============================================================
     UI
  ============================================================== */

  return (
    <div className="customer-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="customer-page-header">

        <div>

          <div className="customer-eyebrow">
            CUSTOMER MASTER
          </div>


          <h1 className="customer-title">
            Customers
          </h1>


          <p className="customer-subtitle">
            Customer records are created and
            reused automatically from Enquiries
            using GSTIN.
          </p>

        </div>

      </div>


      {
        error
        && (
          <div className="customer-error">
            {error}
          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="customer-kpi-grid">

        <div className="customer-kpi-card">

          <div>

            <div className="customer-kpi-label">
              Total Customers
            </div>


            <div className="customer-kpi-value">

              {
                customers.length
              }

            </div>


            <div
              style={{
                marginTop:
                  "6px",

                fontSize:
                  "11px",

                color:
                  "#8290a8",
              }}
            >
              Automatically maintained from Enquiries
            </div>

          </div>


          <div className="customer-kpi-icon blue">

            <Building2
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="customer-toolbar">

        <form
          className="customer-search"
          onSubmit={
            handleSearch
          }
        >

          <Search
            size={17}
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
            placeholder="Search customer code, company, GSTIN, contact or phone..."
          />


          {
            search
            && (
              <button
                type="button"
                className="customer-search-clear"
                onClick={
                  handleClearSearch
                }
              >

                <X
                  size={15}
                />

              </button>
            )
          }


          <button
            type="submit"
            className="customer-secondary-button"
          >
            Search
          </button>

        </form>

      </div>


      {/* ======================================================
          DIRECTORY
      ====================================================== */}

      <div className="customer-panel">

        <div className="customer-panel-header">

          <div>

            <div className="customer-panel-title">
              Customer Directory
            </div>


            <div className="customer-panel-subtitle">
              Customer Master records created
              automatically from sales Enquiries.
            </div>

          </div>


          <div className="customer-panel-badge">

            {
              customers.length
            }
            {" records"}

          </div>

        </div>


        {
          loading
          ? (
            <div className="customer-loading-state">

              <Loader2
                size={23}
                className="customer-spin"
              />

              Loading customers...

            </div>
          )
          :
          customers.length
          === 0
          ? (
            <div className="customer-empty-state">

              <Building2
                size={25}
              />

              <div>
                No customers found.
              </div>

            </div>
          )
          : (
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

                    <th className="align-right">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {
                    customers.map(
                      customer => (
                        <tr
                          key={
                            customer.id
                          }
                        >

                          <td>

                            <div className="customer-company">

                              {
                                customer
                                  .company_name
                              }

                            </div>


                            <div className="customer-code">

                              {
                                customer
                                  .customer_code
                              }

                            </div>

                          </td>


                          <td>

                            <div className="customer-inline">

                              <UserRound
                                size={13}
                              />

                              {
                                customer
                                  .contact_person
                                ||
                                "-"
                              }

                            </div>

                          </td>


                          <td>

                            <div className="customer-inline">

                              <Mail
                                size={13}
                              />

                              {
                                customer.email
                                ||
                                "-"
                              }

                            </div>

                          </td>


                          <td>

                            <div className="customer-inline">

                              <Phone
                                size={13}
                              />

                              {
                                customer.phone
                                ||
                                "-"
                              }

                            </div>

                          </td>


                          <td>

                            <span className="customer-gstin">

                              {
                                customer.gst_number
                                ||
                                "-"
                              }

                            </span>

                          </td>


                          <td>

                            <div className="customer-inline">

                              <MapPin
                                size={13}
                              />

                              {
                                customer.city
                                ||
                                "-"
                              }

                              {
                                customer.state
                                ? (
                                  <>
                                    {", "}
                                    {
                                      customer.state
                                    }
                                  </>
                                )
                                : null
                              }

                            </div>

                          </td>


                          <td className="align-right">

                            <button
                              type="button"
                              className="customer-icon-button"
                              onClick={() =>
                                openEditForm(
                                  customer
                                )
                              }
                              title="Edit customer details"
                            >

                              <Edit3
                                size={15}
                              />

                            </button>

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

      </div>


      {/* ======================================================
          EDIT MODAL
      ====================================================== */}

      {
        showForm
        &&
        editingCustomer
        && (
          <div className="customer-modal-backdrop">

            <div className="customer-modal">

              <div className="customer-modal-header">

                <div>

                  <div className="customer-modal-title">
                    Edit Customer
                  </div>


                  <div className="customer-modal-subtitle">
                    Contact and address information
                    can be corrected here.
                  </div>

                </div>


                <button
                  type="button"
                  className="customer-modal-close"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <form
                className="customer-form"
                onSubmit={
                  handleSubmit
                }
              >

                {/* ==================================================
                    LOCKED CUSTOMER IDENTITY

                    These are text DISPLAY BLOCKS, not inputs.
                    They cannot be typed into or edited.
                ================================================== */}

                <div className="customer-form-grid">

                  <div className="customer-field">

                    <span>
                      Customer Code
                    </span>


                    <div
                      style={{
                        minHeight:
                          "42px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",

                        padding:
                          "0 13px",

                        border:
                          "1px solid #dbe5f2",

                        borderRadius:
                          "8px",

                        background:
                          "#f3f6fa",

                        color:
                          "#53647f",

                        fontWeight:
                          700,

                        userSelect:
                          "text",
                      }}
                    >

                      <span>

                        {
                          editingCustomer
                            .customer_code
                        }

                      </span>


                      <LockKeyhole
                        size={15}
                        style={{
                          color:
                            "#8290a8",

                          flexShrink:
                            0,
                        }}
                      />

                    </div>

                  </div>


                  <div className="customer-field">

                    <span>
                      GST Number
                    </span>


                    <div
                      style={{
                        minHeight:
                          "42px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",

                        padding:
                          "0 13px",

                        border:
                          "1px solid #dbe5f2",

                        borderRadius:
                          "8px",

                        background:
                          "#f3f6fa",

                        color:
                          "#53647f",

                        fontWeight:
                          700,

                        userSelect:
                          "text",
                      }}
                    >

                      <span>

                        {
                          editingCustomer
                            .gst_number
                          ||
                          "-"
                        }

                      </span>


                      <LockKeyhole
                        size={15}
                        style={{
                          color:
                            "#8290a8",

                          flexShrink:
                            0,
                        }}
                      />

                    </div>

                  </div>


                  {/* ==========================================
                      COMPANY NAME
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      Company Name *
                    </span>


                    <input
                      required
                      value={
                        form.company_name
                      }
                      onChange={
                        event =>
                          updateField(
                            "company_name",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  {/* ==========================================
                      CONTACT PERSON
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      Contact Person
                    </span>


                    <input
                      value={
                        form.contact_person
                      }
                      onChange={
                        event =>
                          updateField(
                            "contact_person",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  {/* ==========================================
                      EMAIL
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      Email
                    </span>


                    <input
                      type="email"
                      value={
                        form.email
                      }
                      onChange={
                        event =>
                          updateField(
                            "email",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  {/* ==========================================
                      PHONE
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      Phone
                    </span>


                    <input
                      value={
                        form.phone
                      }
                      onChange={
                        event =>
                          updateField(
                            "phone",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  {/* ==========================================
                      CITY
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      City
                    </span>


                    <input
                      value={
                        form.city
                      }
                      onChange={
                        event =>
                          updateField(
                            "city",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  {/* ==========================================
                      STATE
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      State
                    </span>


                    <input
                      value={
                        form.state
                      }
                      onChange={
                        event =>
                          updateField(
                            "state",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  {/* ==========================================
                      PINCODE
                  ========================================== */}

                  <label className="customer-field">

                    <span>
                      Pincode
                    </span>


                    <input
                      value={
                        form.pincode
                      }
                      onChange={
                        event =>
                          updateField(
                            "pincode",
                            event.target.value
                          )
                      }
                    />

                  </label>

                </div>


                {/* ============================================
                    ADDRESS
                ============================================ */}

                <label className="customer-field customer-field-full">

                  <span>
                    Address
                  </span>


                  <textarea
                    rows={3}
                    value={
                      form.address
                    }
                    onChange={
                      event =>
                        updateField(
                          "address",
                          event.target.value
                        )
                    }
                  />

                </label>


                {/* ============================================
                    IDENTITY NOTICE
                ============================================ */}

                <div
                  style={{
                    margin:
                      "0 0 18px",

                    padding:
                      "12px 14px",

                    border:
                      "1px solid #dbe5f2",

                    borderRadius:
                      "9px",

                    background:
                      "#f8fafc",

                    color:
                      "#677791",

                    fontSize:
                      "11px",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "8px",
                  }}
                >

                  <LockKeyhole
                    size={15}
                  />

                  Customer Code and GSTIN are
                  locked customer identity fields.
                  GSTIN corrections must be made
                  through the Enquiry workflow.

                </div>


                {/* ============================================
                    ACTIONS
                ============================================ */}

                <div className="customer-form-actions">

                  <button
                    type="button"
                    className="customer-ghost-button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="customer-primary-button"
                    disabled={
                      saving
                    }
                  >

                    {
                      saving
                      && (
                        <Loader2
                          size={16}
                          className="customer-spin"
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

            </div>

          </div>
        )
      }

    </div>
  );
}