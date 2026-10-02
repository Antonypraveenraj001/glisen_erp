import axios from "axios";

import UsersAccessSettings
  from "./UsersAccessSettings";

import SecuritySettings
  from "./SecuritySettings";

import BackupRecoverySettings
  from "./BackupRecoverySettings";

import FinancialYearSettings
  from "./FinancialYearSettings";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  Image,
  Landmark,
  Loader2,
  LockKeyhole,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import "./SettingsPage.css";

import {
  createCompanySettings,
  deleteCompanyLogo,
  getBusinessSettings,
  getCompanyLogoBlob,
  getCompanySettings,
  getDocumentSettings,
  updateBusinessSettings,
  updateCompanySettings,
  updateDocumentSettings,
  uploadCompanyLogo,
} from "../../services/settingsService";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  usePermissions,
} from "../../hooks/usePermissions";


import type {
  BusinessSettings,
  BusinessSettingsPayload,
  CompanySettings,
  CompanySettingsPayload,
  DocumentSettings,
  DocumentSettingsPayload,
  PrintMode,
} from "../../types/settings";


type SettingsTab =
  | "company"
  | "documents"
  | "business"
  | "users"
  | "security"
  | "backup"
  | "financial-year";


interface Notice {
  type:
    | "success"
    | "error";

  text: string;
}


interface CompanyForm {
  company_name: string;
  gst_number: string;
  pan_number: string;

  state_name: string;
  state_code: string;

  address: string;
  phone: string;
  email: string;
  website: string;

  bank_account_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_branch: string;
  upi_id: string;
}


interface DocumentForm {
  default_print_mode:
    PrintMode;

  letterhead_top_space_mm:
    string;

  show_logo: boolean;
  show_gst_number: boolean;
  show_contact_details: boolean;

  show_bank_details_on_proforma:
    boolean;

  show_bank_details_on_final_bill:
    boolean;

  show_authorized_signature:
    boolean;

  authorized_signatory_name:
    string;

  authorized_signatory_designation:
    string;

  footer_text:
    string;

  proforma_validity_days:
    string;

  proforma_payment_terms:
    string;

  proforma_delivery_terms:
    string;

  proforma_terms_and_conditions:
    string;
}


interface BusinessForm {
  currency_code: string;
  timezone: string;

  default_gst_percent:
    string;

  default_page_size:
    string;

  enquiry_prefix: string;
  proforma_prefix: string;
  production_prefix: string;

  finished_goods_receipt_prefix:
    string;

  invoice_prefix: string;
  credit_note_prefix: string;

  sequence_digits:
    string;
}


/* ================================================================
   EMPTY FORMS
================================================================ */

function createEmptyCompanyForm():
CompanyForm {

  return {
    company_name: "",
    gst_number: "",
    pan_number: "",

    state_name: "",
    state_code: "",

    address: "",
    phone: "",
    email: "",
    website: "",

    bank_account_name: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_branch: "",
    upi_id: "",
  };
}


function createDefaultDocumentForm():
DocumentForm {

  return {
    default_print_mode:
      "company_header",

    letterhead_top_space_mm:
      "40.00",

    show_logo: true,
    show_gst_number: true,
    show_contact_details: true,

    show_bank_details_on_proforma:
      false,

    show_bank_details_on_final_bill:
      true,

    show_authorized_signature:
      true,

    authorized_signatory_name:
      "",

    authorized_signatory_designation:
      "",

    footer_text:
      "",

    proforma_validity_days:
      "30",

    proforma_payment_terms:
      "",

    proforma_delivery_terms:
      "",

    proforma_terms_and_conditions:
      "",
  };
}


function createDefaultBusinessForm():
BusinessForm {

  return {
    currency_code:
      "INR",

    timezone:
      "Asia/Kolkata",

    default_gst_percent:
      "18.00",

    default_page_size:
      "10",

    enquiry_prefix:
      "ENQ",

    proforma_prefix:
      "PRO",

    production_prefix:
      "PROD",

    finished_goods_receipt_prefix:
      "FGR",

    invoice_prefix:
      "INV",

    credit_note_prefix:
      "CN",

    sequence_digits:
      "4",
  };
}


/* ================================================================
   HELPERS
================================================================ */

function nullableString(
  value: string
) {

  const cleaned =
    value.trim();


  return (
    cleaned
      ? cleaned
      : null
  );
}


function getApiErrorMessage(
  error: unknown,
  fallback: string
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


    if (
      Array.isArray(
        detail
      )
      &&
      detail.length > 0
    ) {

      const first =
        detail[0];


      if (
        first
        &&
        typeof first.msg
        === "string"
      ) {
        return first.msg;
      }

    }

  }


  if (
    error instanceof Error
    &&
    error.message
  ) {
    return error.message;
  }


  return fallback;
}


function mapCompanyToForm(
  data: CompanySettings
):
CompanyForm {

  return {
    company_name:
      data.company_name
      || "",

    gst_number:
      data.gst_number
      || "",

    pan_number:
      data.pan_number
      || "",

    state_name:
      data.state_name
      || "",

    state_code:
      data.state_code
      || "",

    address:
      data.address
      || "",

    phone:
      data.phone
      || "",

    email:
      data.email
      || "",

    website:
      data.website
      || "",

    bank_account_name:
      data.bank_account_name
      || "",

    bank_name:
      data.bank_name
      || "",

    bank_account_number:
      data.bank_account_number
      || "",

    bank_ifsc_code:
      data.bank_ifsc_code
      || "",

    bank_branch:
      data.bank_branch
      || "",

    upi_id:
      data.upi_id
      || "",
  };
}


function mapDocumentToForm(
  data: DocumentSettings
):
DocumentForm {

  return {
    default_print_mode:
      data.default_print_mode,

    letterhead_top_space_mm:
      String(
        data.letterhead_top_space_mm
      ),

    show_logo:
      data.show_logo,

    show_gst_number:
      data.show_gst_number,

    show_contact_details:
      data.show_contact_details,

    show_bank_details_on_proforma:
      data.show_bank_details_on_proforma,

    show_bank_details_on_final_bill:
      data.show_bank_details_on_final_bill,

    show_authorized_signature:
      data.show_authorized_signature,

    authorized_signatory_name:
      data.authorized_signatory_name
      || "",

    authorized_signatory_designation:
      data.authorized_signatory_designation
      || "",

    footer_text:
      data.footer_text
      || "",

    proforma_validity_days:
      String(
        data.proforma_validity_days
      ),

    proforma_payment_terms:
      data.proforma_payment_terms
      || "",

    proforma_delivery_terms:
      data.proforma_delivery_terms
      || "",

    proforma_terms_and_conditions:
      data.proforma_terms_and_conditions
      || "",
  };
}


function mapBusinessToForm(
  data: BusinessSettings
):
BusinessForm {

  return {
    currency_code:
      data.currency_code,

    timezone:
      data.timezone,

    default_gst_percent:
      String(
        data.default_gst_percent
      ),

    default_page_size:
      String(
        data.default_page_size
      ),

    enquiry_prefix:
      data.enquiry_prefix,

    proforma_prefix:
      data.proforma_prefix,

    production_prefix:
      data.production_prefix,

    finished_goods_receipt_prefix:
      data.finished_goods_receipt_prefix,

    invoice_prefix:
      data.invoice_prefix,

    credit_note_prefix:
      data.credit_note_prefix,

    sequence_digits:
      String(
        data.sequence_digits
      ),
  };
}


/* ================================================================
   PAGE
================================================================ */

export default function SettingsPage() {

  const {
    user,
  } =
    useAuth();


  const [
    activeTab,
    setActiveTab,
  ] =
    useState<SettingsTab>(
      "company"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    notice,
    setNotice,
  ] =
    useState<
      Notice | null
    >(
      null
    );


  /* ==============================================================
     COMPANY
  ============================================================== */

  const [
    companyExists,
    setCompanyExists,
  ] =
    useState(
      false
    );


  const [
    companyForm,
    setCompanyForm,
  ] =
    useState<CompanyForm>(
      createEmptyCompanyForm()
    );


  const [
    companySaving,
    setCompanySaving,
  ] =
    useState(
      false
    );


  /* ==============================================================
     LOGO
  ============================================================== */

  const [
    logoUrl,
    setLogoUrl,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    logoLoading,
    setLogoLoading,
  ] =
    useState(
      false
    );


  const logoInputRef =
    useRef<
      HTMLInputElement | null
    >(
      null
    );


  /* ==============================================================
     DOCUMENTS
  ============================================================== */

  const [
    documentForm,
    setDocumentForm,
  ] =
    useState<DocumentForm>(
      createDefaultDocumentForm()
    );


  const [
    documentSaving,
    setDocumentSaving,
  ] =
    useState(
      false
    );


  /* ==============================================================
     BUSINESS
  ============================================================== */

  const [
    businessForm,
    setBusinessForm,
  ] =
    useState<BusinessForm>(
      createDefaultBusinessForm()
    );


  const [
    businessSaving,
    setBusinessSaving,
  ] =
    useState(
      false
    );


  const [
    businessSettings,
    setBusinessSettings,
  ] =
    useState<
      BusinessSettings | null
    >(
      null
    );


  /* ==============================================================
     PERMISSIONS
  ============================================================== */

  const {
    hasPermission,
  } =
    usePermissions();


  const canManageCompany =
    hasPermission(
      "settings.company.manage"
    );


  const canManageDocuments =
    hasPermission(
      "settings.documents.manage"
    );


  const canManageBusiness =
    hasPermission(
      "settings.business.manage"
    );


  const canViewUsers =
    hasPermission(
      "users.view"
    );


  const canViewBackup =
    hasPermission(
      "backup.view"
    );


  const canViewFinancialYear =
    hasPermission(
      "financial_year.view"
    );

  /* ==============================================================
     LOGO REFRESH
  ============================================================== */

  async function refreshLogo(
    shouldExist: boolean
  ) {

    if (
      !shouldExist
    ) {

      setLogoUrl(
        current => {

          if (current) {
            URL.revokeObjectURL(
              current
            );
          }

          return null;
        }
      );

      return;
    }


    try {

      const blob =
        await getCompanyLogoBlob();


      const nextUrl =
        URL.createObjectURL(
          blob
        );


      setLogoUrl(
        current => {

          if (current) {
            URL.revokeObjectURL(
              current
            );
          }

          return nextUrl;
        }
      );

    } catch {

      setLogoUrl(
        current => {

          if (current) {
            URL.revokeObjectURL(
              current
            );
          }

          return null;
        }
      );

    }

  }


  /* ==============================================================
     LOAD SETTINGS
  ============================================================== */

  async function loadSettings() {

    try {

      setLoading(
        true
      );

      setNotice(
        null
      );


      let company:
        CompanySettings | null =
        null;


      try {

        company =
          await getCompanySettings();

      } catch (
        error
      ) {

        if (
          axios.isAxiosError(
            error
          )
          &&
          error.response
            ?.status
          === 404
        ) {

          company =
            null;

        } else {

          throw error;

        }

      }


      const [
        documents,
        business,
      ] =
        await Promise.all([
          getDocumentSettings(),
          getBusinessSettings(),
        ]);


      if (
        company
      ) {

        setCompanyExists(
          true
        );

        setCompanyForm(
          mapCompanyToForm(
            company
          )
        );

        await refreshLogo(
          Boolean(
            company.logo_path
          )
        );

      } else {

        setCompanyExists(
          false
        );

        setCompanyForm(
          createEmptyCompanyForm()
        );

        await refreshLogo(
          false
        );

      }


      setDocumentForm(
        mapDocumentToForm(
          documents
        )
      );


      setBusinessSettings(
        business
      );


      setBusinessForm(
        mapBusinessToForm(
          business
        )
      );

    } catch (
      error
    ) {

      console.error(
        error
      );


      setNotice({
        type:
          "error",

        text:
          getApiErrorMessage(
            error,
            "Unable to load Settings."
          ),
      });

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadSettings();


      return () => {

        setLogoUrl(
          current => {

            if (
              current
            ) {
              URL.revokeObjectURL(
                current
              );
            }

            return null;
          }
        );

      };

    },
    []
  );


  /* ==============================================================
     COMPANY FORM
  ============================================================== */

  function updateCompanyField(
    field:
      keyof CompanyForm,
    value: string
  ) {

    setCompanyForm(
      current => ({
        ...current,

        [field]:
          value,
      })
    );

  }


  async function handleSaveCompany() {

    if (
      !canManageCompany
    ) {
      return;
    }


    if (
      !companyForm
        .company_name
        .trim()
    ) {

      setNotice({
        type:
          "error",

        text:
          "Company Name is required.",
      });

      return;
    }


    if (
      !companyForm
        .gst_number
        .trim()
    ) {

      setNotice({
        type:
          "error",

        text:
          "GST Number is required.",
      });

      return;
    }


    if (
      !companyForm
        .state_name
        .trim()
      ||
      !companyForm
        .state_code
        .trim()
    ) {

      setNotice({
        type:
          "error",

        text:
          "Company State and State Code are required.",
      });

      return;
    }


    const payload:
      CompanySettingsPayload =
      {
        company_name:
          companyForm
            .company_name
            .trim(),

        gst_number:
          companyForm
            .gst_number
            .trim()
            .toUpperCase(),

        pan_number:
          nullableString(
            companyForm
              .pan_number
              .toUpperCase()
          ),

        state_name:
          companyForm
            .state_name
            .trim(),

        state_code:
          companyForm
            .state_code
            .trim(),

        address:
          nullableString(
            companyForm
              .address
          ),

        phone:
          nullableString(
            companyForm
              .phone
          ),

        email:
          nullableString(
            companyForm
              .email
          ),

        website:
          nullableString(
            companyForm
              .website
          ),

        bank_account_name:
          nullableString(
            companyForm
              .bank_account_name
          ),

        bank_name:
          nullableString(
            companyForm
              .bank_name
          ),

        bank_account_number:
          nullableString(
            companyForm
              .bank_account_number
          ),

        bank_ifsc_code:
          nullableString(
            companyForm
              .bank_ifsc_code
              .toUpperCase()
          ),

        bank_branch:
          nullableString(
            companyForm
              .bank_branch
          ),

        upi_id:
          nullableString(
            companyForm
              .upi_id
          ),
      };


    try {

      setCompanySaving(
        true
      );

      setNotice(
        null
      );


      const saved =
        companyExists
          ? await updateCompanySettings(
              payload
            )
          : await createCompanySettings(
              payload
            );


      setCompanyExists(
        true
      );


      setCompanyForm(
        mapCompanyToForm(
          saved
        )
      );


      setNotice({
        type:
          "success",

        text:
          companyExists
            ? "Company settings updated successfully."
            : "Company settings created successfully.",
      });

    } catch (
      error
    ) {

      console.error(
        error
      );


      setNotice({
        type:
          "error",

        text:
          getApiErrorMessage(
            error,
            "Unable to save Company Settings."
          ),
      });

    } finally {

      setCompanySaving(
        false
      );

    }

  }


  /* ==============================================================
     LOGO
  ============================================================== */

  async function handleLogoSelected(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target
        .files?.[0];


    event.target.value =
      "";


    if (
      !file
    ) {
      return;
    }


    if (
      !companyExists
    ) {

      setNotice({
        type:
          "error",

        text:
          "Save Company Settings before uploading a logo.",
      });

      return;
    }


    try {

      setLogoLoading(
        true
      );

      setNotice(
        null
      );


      const updated =
        await uploadCompanyLogo(
          file
        );


      await refreshLogo(
        Boolean(
          updated.logo_path
        )
      );


      setNotice({
        type:
          "success",

        text:
          "Company logo uploaded successfully.",
      });

    } catch (
      error
    ) {

      console.error(
        error
      );


      setNotice({
        type:
          "error",

        text:
          getApiErrorMessage(
            error,
            "Unable to upload company logo."
          ),
      });

    } finally {

      setLogoLoading(
        false
      );

    }

  }


  async function handleDeleteLogo() {

    if (
      !companyExists
      ||
      !logoUrl
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Remove the current company logo?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setLogoLoading(
        true
      );

      setNotice(
        null
      );


      await deleteCompanyLogo();


      await refreshLogo(
        false
      );


      setNotice({
        type:
          "success",

        text:
          "Company logo removed.",
      });

    } catch (
      error
    ) {

      console.error(
        error
      );


      setNotice({
        type:
          "error",

        text:
          getApiErrorMessage(
            error,
            "Unable to remove company logo."
          ),
      });

    } finally {

      setLogoLoading(
        false
      );

    }

  }


  /* ==============================================================
     DOCUMENT SETTINGS
  ============================================================== */

  function updateDocumentField<
    K extends keyof DocumentForm
  >(
    field: K,
    value:
      DocumentForm[K]
  ) {

    setDocumentForm(
      current => ({
        ...current,

        [field]:
          value,
      })
    );

  }


  async function handleSaveDocuments() {

    if (
      !canManageDocuments
    ) {
      return;
    }


    const validity =
      Number(
        documentForm
          .proforma_validity_days
      );


    const topSpace =
      Number(
        documentForm
          .letterhead_top_space_mm
      );


    if (
      !Number.isFinite(
        validity
      )
      ||
      validity < 1
    ) {

      setNotice({
        type:
          "error",

        text:
          "Proforma validity must be at least 1 day.",
      });

      return;
    }


    if (
      !Number.isFinite(
        topSpace
      )
      ||
      topSpace < 0
      ||
      topSpace > 100
    ) {

      setNotice({
        type:
          "error",

        text:
          "Letterhead top space must be between 0 and 100 mm.",
      });

      return;
    }


    const payload:
      DocumentSettingsPayload =
      {
        default_print_mode:
          documentForm
            .default_print_mode,

        letterhead_top_space_mm:
          topSpace.toFixed(
            2
          ),

        show_logo:
          documentForm
            .show_logo,

        show_gst_number:
          documentForm
            .show_gst_number,

        show_contact_details:
          documentForm
            .show_contact_details,

        show_bank_details_on_proforma:
          documentForm
            .show_bank_details_on_proforma,

        show_bank_details_on_final_bill:
          documentForm
            .show_bank_details_on_final_bill,

        show_authorized_signature:
          documentForm
            .show_authorized_signature,

        authorized_signatory_name:
          nullableString(
            documentForm
              .authorized_signatory_name
          ),

        authorized_signatory_designation:
          nullableString(
            documentForm
              .authorized_signatory_designation
          ),

        footer_text:
          nullableString(
            documentForm
              .footer_text
          ),

        proforma_validity_days:
          Math.round(
            validity
          ),

        proforma_payment_terms:
          nullableString(
            documentForm
              .proforma_payment_terms
          ),

        proforma_delivery_terms:
          nullableString(
            documentForm
              .proforma_delivery_terms
          ),

        proforma_terms_and_conditions:
          nullableString(
            documentForm
              .proforma_terms_and_conditions
          ),
      };


    try {

      setDocumentSaving(
        true
      );

      setNotice(
        null
      );


      const saved =
        await updateDocumentSettings(
          payload
        );


      setDocumentForm(
        mapDocumentToForm(
          saved
        )
      );


      setNotice({
        type:
          "success",

        text:
          "Document settings updated successfully.",
      });

    } catch (
      error
    ) {

      console.error(
        error
      );


      setNotice({
        type:
          "error",

        text:
          getApiErrorMessage(
            error,
            "Unable to save Document Settings."
          ),
      });

    } finally {

      setDocumentSaving(
        false
      );

    }

  }


  /* ==============================================================
     BUSINESS SETTINGS
  ============================================================== */

  function updateBusinessField(
    field:
      keyof BusinessForm,
    value: string
  ) {

    setBusinessForm(
      current => ({
        ...current,

        [field]:
          value,
      })
    );

  }


  async function handleSaveBusiness() {

    if (
      !canManageBusiness
    ) {
      return;
    }


    const gst =
      Number(
        businessForm
          .default_gst_percent
      );


    const pageSize =
      Number(
        businessForm
          .default_page_size
      );


    const digits =
      Number(
        businessForm
          .sequence_digits
      );


    if (
      !Number.isFinite(
        gst
      )
      ||
      gst < 0
      ||
      gst > 100
    ) {

      setNotice({
        type:
          "error",

        text:
          "Default GST must be between 0 and 100.",
      });

      return;
    }


    if (
      !Number.isInteger(
        pageSize
      )
      ||
      pageSize < 5
      ||
      pageSize > 100
    ) {

      setNotice({
        type:
          "error",

        text:
          "Default records per page must be between 5 and 100.",
      });

      return;
    }


    if (
      !Number.isInteger(
        digits
      )
      ||
      digits < 3
      ||
      digits > 6
    ) {

      setNotice({
        type:
          "error",

        text:
          "Document sequence digits must be between 3 and 6.",
      });

      return;
    }


    const payload:
      BusinessSettingsPayload =
      {
        currency_code:
          businessForm
            .currency_code
            .trim()
            .toUpperCase(),

        timezone:
          businessForm
            .timezone
            .trim(),

        default_gst_percent:
          gst.toFixed(
            2
          ),

        default_page_size:
          pageSize,

        enquiry_prefix:
          businessForm
            .enquiry_prefix
            .trim()
            .toUpperCase(),

        proforma_prefix:
          businessForm
            .proforma_prefix
            .trim()
            .toUpperCase(),

        production_prefix:
          businessForm
            .production_prefix
            .trim()
            .toUpperCase(),

        finished_goods_receipt_prefix:
          businessForm
            .finished_goods_receipt_prefix
            .trim()
            .toUpperCase(),

        invoice_prefix:
          businessForm
            .invoice_prefix
            .trim()
            .toUpperCase(),

        credit_note_prefix:
          businessForm
            .credit_note_prefix
            .trim()
            .toUpperCase(),

        sequence_digits:
          digits,
      };


    try {

      setBusinessSaving(
        true
      );

      setNotice(
        null
      );


      const saved =
        await updateBusinessSettings(
          payload
        );


      setBusinessSettings(
        saved
      );


      setBusinessForm(
        mapBusinessToForm(
          saved
        )
      );


      setNotice({
        type:
          "success",

        text:
          "Business and numbering settings updated successfully.",
      });

    } catch (
      error
    ) {

      console.error(
        error
      );


      setNotice({
        type:
          "error",

        text:
          getApiErrorMessage(
            error,
            "Unable to save Business Settings."
          ),
      });

    } finally {

      setBusinessSaving(
        false
      );

    }

  }


  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {

    return (
      <div className="settings-loading">

        <Loader2
          size={20}
          className="settings-spin"
        />

        Loading Settings...

      </div>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="settings-page">

      {/* =========================================================
          HEADER
      ========================================================== */}

      <section className="settings-header">

        <div>

          <div className="settings-eyebrow">
            SYSTEM CONFIGURATION
          </div>

          <h1 className="settings-title">
            Settings
          </h1>

          <p className="settings-subtitle">
            Company identity, documents, business rules,
            users, security, backup and financial-year
            management for Glisen ERP.
          </p>

        </div>


        <div className="settings-user-badge">

          <ShieldCheck
            size={17}
          />

          <div>

            <span>
              Signed in as
            </span>

            <strong>
              {
                user?.full_name
                ||
                user?.username
                ||
                "User"
              }
            </strong>

            <small>
              {
                user?.role
                ||
                "Unknown Role"
              }
            </small>

          </div>

        </div>

      </section>


      {/* =========================================================
          NOTICE
      ========================================================== */}

      {
        notice
        &&
        (
          <div
            className={
              `settings-notice ${notice.type}`
            }
          >

            {
              notice.type
              === "success"
                ? (
                    <CheckCircle2
                      size={16}
                    />
                  )
                : (
                    <ShieldCheck
                      size={16}
                    />
                  )
            }

            <span>
              {notice.text}
            </span>

          </div>
        )
      }


      {/* =========================================================
          WORKSPACE
      ========================================================== */}

      <section className="settings-workspace">

        {/* =======================================================
            NAVIGATION
        ======================================================== */}

        <aside className="settings-nav">

          <button
            type="button"
            className={
              activeTab
              === "company"
                ? "active"
                : ""
            }
            onClick={
              () =>
                setActiveTab(
                  "company"
                )
            }
          >

            <Building2
              size={17}
            />

            <span>
              Company
            </span>

          </button>


          <button
            type="button"
            className={
              activeTab
              === "documents"
                ? "active"
                : ""
            }
            onClick={
              () =>
                setActiveTab(
                  "documents"
                )
            }
          >

            <FileText
              size={17}
            />

            <span>
              Documents
            </span>

          </button>


          {
            canManageBusiness
            &&
            (
              <button
                type="button"
                className={
                  activeTab
                  === "business"
                    ? "active"
                    : ""
                }
                onClick={
                  () =>
                    setActiveTab(
                      "business"
                    )
                }
              >

                <SlidersHorizontal
                  size={17}
                />

                <span>
                  Business & Numbering
                </span>

              </button>
            )
          }


          <div className="settings-nav-divider" />


          {
            canViewUsers
            &&
            (
              <button
                type="button"
                className={
                  activeTab
                  === "users"
                    ? "active"
                    : ""
                }
                onClick={
                  () =>
                    setActiveTab(
                      "users"
                    )
                }
              >

                <Users
                  size={17}
                />

                <span>
                  Users & Access
                </span>

              </button>
            )
          }


          <button
            type="button"
            className={
              activeTab
              === "security"
                ? "active"
                : ""
            }
            onClick={
              () =>
                setActiveTab(
                  "security"
                )
            }
          >

            <LockKeyhole
              size={17}
            />

            <span>
              Security
            </span>

          </button>


          {
            canViewBackup
            &&
            (
              <button
                type="button"
                className={
                  activeTab
                  === "backup"
                    ? "active"
                    : ""
                }
                onClick={
                  () =>
                    setActiveTab(
                      "backup"
                    )
                }
              >

                <Database
                  size={17}
                />

                <span>
                  Backup & Recovery
                </span>

              </button>
            )
          }


          {
            canViewFinancialYear
            &&
            (
              <button
                type="button"
                className={
                  activeTab
                  === "financial-year"
                    ? "active"
                    : ""
                }
                onClick={
                  () =>
                    setActiveTab(
                      "financial-year"
                    )
                }
              >

                <CalendarDays
                  size={17}
                />

                <span>
                  Financial Year
                </span>

              </button>
            )
          }

        </aside> 


        {/* =======================================================
            CONTENT
        ======================================================== */}

        <div className="settings-content">

          {/* =====================================================
              COMPANY
          ====================================================== */}

          {
            activeTab
            === "company"
            &&
            (
              <>

                <div className="settings-section-heading">

                  <div>

                    <h2>
                      Company Profile
                    </h2>

                    <p>
                      These details become the source of truth
                      for Proforma and Final Bill company headers.
                    </p>

                  </div>


                  {
                    !canManageCompany
                    &&
                    (
                      <span className="settings-readonly-badge">
                        Read only
                      </span>
                    )
                  }

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon blue">

                      <Building2
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Company Identity
                      </h3>

                      <p>
                        Legal and GST registration details.
                      </p>

                    </div>

                  </div>


                  <div className="settings-form-grid">

                    <label className="settings-field">

                      <span>
                        Company Name *
                      </span>

                      <input
                        value={
                          companyForm.company_name
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "company_name",
                              event.target.value
                            )
                        }
                        placeholder="Company name"
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        GST Number *
                      </span>

                      <input
                        value={
                          companyForm.gst_number
                        }
                        disabled={
                          !canManageCompany
                        }
                        maxLength={15}
                        onChange={
                          event =>
                            updateCompanyField(
                              "gst_number",
                              event.target.value
                                .toUpperCase()
                            )
                        }
                        placeholder="33ABCDE1234F1Z5"
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        PAN Number
                      </span>

                      <input
                        value={
                          companyForm.pan_number
                        }
                        disabled={
                          !canManageCompany
                        }
                        maxLength={10}
                        onChange={
                          event =>
                            updateCompanyField(
                              "pan_number",
                              event.target.value
                                .toUpperCase()
                            )
                        }
                        placeholder="ABCDE1234F"
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        State *
                      </span>

                      <input
                        value={
                          companyForm.state_name
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "state_name",
                              event.target.value
                            )
                        }
                        placeholder="Tamil Nadu"
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        GST State Code *
                      </span>

                      <input
                        value={
                          companyForm.state_code
                        }
                        disabled={
                          !canManageCompany
                        }
                        maxLength={2}
                        onChange={
                          event =>
                            updateCompanyField(
                              "state_code",
                              event.target.value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                            )
                        }
                        placeholder="33"
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Phone
                      </span>

                      <input
                        value={
                          companyForm.phone
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "phone",
                              event.target.value
                            )
                        }
                        placeholder="+91 ..."
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Email
                      </span>

                      <input
                        type="email"
                        value={
                          companyForm.email
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "email",
                              event.target.value
                            )
                        }
                        placeholder="accounts@company.com"
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Website
                      </span>

                      <input
                        value={
                          companyForm.website
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "website",
                              event.target.value
                            )
                        }
                        placeholder="https://..."
                      />

                    </label>


                    <label className="settings-field settings-field-wide">

                      <span>
                        Registered Address
                      </span>

                      <textarea
                        value={
                          companyForm.address
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "address",
                              event.target.value
                            )
                        }
                        placeholder="Company address"
                      />

                    </label>

                  </div>

                </div>


                {/* LOGO */}

                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon lavender">

                      <Image
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Company Logo
                      </h3>

                      <p>
                        Used when documents are printed with the company header.
                      </p>

                    </div>

                  </div>


                  <div className="settings-logo-row">

                    <div className="settings-logo-preview">

                      {
                        logoUrl
                          ? (
                              <img
                                src={logoUrl}
                                alt="Company logo"
                              />
                            )
                          : (
                              <div className="settings-logo-empty">

                                <Image
                                  size={28}
                                />

                                <span>
                                  No logo
                                </span>

                              </div>
                            )
                      }

                    </div>


                    <div className="settings-logo-info">

                      <strong>
                        PNG, JPG or WEBP
                      </strong>

                      <p>
                        Maximum file size 5 MB. The logo file is stored
                        in the ERP upload folder and will later be included
                        in Glisen backups.
                      </p>


                      {
                        canManageCompany
                        &&
                        (
                          <div className="settings-inline-actions">

                            <input
                              ref={
                                logoInputRef
                              }
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              hidden
                              onChange={
                                handleLogoSelected
                              }
                            />


                            <button
                              type="button"
                              className="settings-secondary-button"
                              disabled={
                                logoLoading
                                ||
                                !companyExists
                              }
                              onClick={
                                () =>
                                  logoInputRef
                                    .current
                                    ?.click()
                              }
                            >

                              {
                                logoLoading
                                  ? (
                                      <Loader2
                                        size={15}
                                        className="settings-spin"
                                      />
                                    )
                                  : (
                                      <Upload
                                        size={15}
                                      />
                                    )
                              }

                              Upload Logo

                            </button>


                            {
                              logoUrl
                              &&
                              (
                                <button
                                  type="button"
                                  className="settings-danger-button"
                                  disabled={
                                    logoLoading
                                  }
                                  onClick={
                                    handleDeleteLogo
                                  }
                                >

                                  <Trash2
                                    size={15}
                                  />

                                  Remove

                                </button>
                              )
                            }

                          </div>
                        )
                      }


                      {
                        !companyExists
                        &&
                        (
                          <div className="settings-helper-warning">
                            Save Company Settings before uploading the logo.
                          </div>
                        )
                      }

                    </div>

                  </div>

                </div>


                {/* BANK */}

                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon green">

                      <Landmark
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Bank & Payment Details
                      </h3>

                      <p>
                        Can be displayed on Proformas and Final Bills
                        according to Document Settings.
                      </p>

                    </div>

                  </div>


                  <div className="settings-form-grid">

                    <label className="settings-field">

                      <span>
                        Account Name
                      </span>

                      <input
                        value={
                          companyForm.bank_account_name
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "bank_account_name",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Bank Name
                      </span>

                      <input
                        value={
                          companyForm.bank_name
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "bank_name",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Account Number
                      </span>

                      <input
                        value={
                          companyForm.bank_account_number
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "bank_account_number",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        IFSC Code
                      </span>

                      <input
                        value={
                          companyForm.bank_ifsc_code
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "bank_ifsc_code",
                              event.target.value
                                .toUpperCase()
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Branch
                      </span>

                      <input
                        value={
                          companyForm.bank_branch
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "bank_branch",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        UPI ID
                      </span>

                      <input
                        value={
                          companyForm.upi_id
                        }
                        disabled={
                          !canManageCompany
                        }
                        onChange={
                          event =>
                            updateCompanyField(
                              "upi_id",
                              event.target.value
                            )
                        }
                      />

                    </label>

                  </div>

                </div>


                {
                  canManageCompany
                  &&
                  (
                    <div className="settings-save-bar">

                      <div>

                        <strong>
                          Company Profile
                        </strong>

                        <span>
                          {
                            companyExists
                              ? "Update the stored company information."
                              : "Company Settings have not been created yet."
                          }
                        </span>

                      </div>


                      <button
                        type="button"
                        className="settings-primary-button"
                        disabled={
                          companySaving
                        }
                        onClick={
                          handleSaveCompany
                        }
                      >

                        {
                          companySaving
                            ? (
                                <Loader2
                                  size={16}
                                  className="settings-spin"
                                />
                              )
                            : (
                                <Save
                                  size={16}
                                />
                              )
                        }

                        {
                          companyExists
                            ? "Save Changes"
                            : "Create Company Settings"
                        }

                      </button>

                    </div>
                  )
                }

              </>
            )
          }


          {/* =====================================================
              DOCUMENTS
          ====================================================== */}

          {
            activeTab
            === "documents"
            &&
            (
              <>

                <div className="settings-section-heading">

                  <div>

                    <h2>
                      Document & Print Settings
                    </h2>

                    <p>
                      Shared rules used by Proforma and Final Bill
                      printing and downloads.
                    </p>

                  </div>


                  {
                    !canManageDocuments
                    &&
                    (
                      <span className="settings-readonly-badge">
                        Read only
                      </span>
                    )
                  }

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon blue">

                      <FileText
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Print Layout
                      </h3>

                      <p>
                        Choose the default mode. Each document can still
                        offer both options when printing or downloading.
                      </p>

                    </div>

                  </div>


                  <div className="settings-choice-grid">

                    <label
                      className={
                        `settings-choice ${
                          documentForm.default_print_mode
                          === "company_header"
                            ? "selected"
                            : ""
                        }`
                      }
                    >

                      <input
                        type="radio"
                        name="print-mode"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.default_print_mode
                          === "company_header"
                        }
                        onChange={
                          () =>
                            updateDocumentField(
                              "default_print_mode",
                              "company_header"
                            )
                        }
                      />

                      <Building2
                        size={20}
                      />

                      <strong>
                        Company Header
                      </strong>

                      <span>
                        Print company name, logo and selected
                        company details on the document.
                      </span>

                    </label>


                    <label
                      className={
                        `settings-choice ${
                          documentForm.default_print_mode
                          === "letterhead"
                            ? "selected"
                            : ""
                        }`
                      }
                    >

                      <input
                        type="radio"
                        name="print-mode"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.default_print_mode
                          === "letterhead"
                        }
                        onChange={
                          () =>
                            updateDocumentField(
                              "default_print_mode",
                              "letterhead"
                            )
                        }
                      />

                      <FileText
                        size={20}
                      />

                      <strong>
                        Company Letterhead
                      </strong>

                      <span>
                        Leave clean space at the top for pre-printed
                        company letter pad.
                      </span>

                    </label>

                  </div>


                  <div className="settings-form-grid settings-top-gap">

                    <label className="settings-field">

                      <span>
                        Letterhead Top Space (mm)
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        disabled={
                          !canManageDocuments
                        }
                        value={
                          documentForm.letterhead_top_space_mm
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "letterhead_top_space_mm",
                              event.target.value
                            )
                        }
                      />

                      <small>
                        Recommended starting value: 40 mm.
                      </small>

                    </label>

                  </div>

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon lavender">

                      <Settings
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Header & Footer Content
                      </h3>

                      <p>
                        Control which details appear on generated documents.
                      </p>

                    </div>

                  </div>


                  <div className="settings-toggle-list">

                    <label className="settings-toggle-row">

                      <div>

                        <strong>
                          Show Company Logo
                        </strong>

                        <span>
                          Display the uploaded logo in company-header mode.
                        </span>

                      </div>

                      <input
                        type="checkbox"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.show_logo
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "show_logo",
                              event.target.checked
                            )
                        }
                      />

                    </label>


                    <label className="settings-toggle-row">

                      <div>

                        <strong>
                          Show GST Number
                        </strong>

                        <span>
                          Display the company GSTIN in the document header.
                        </span>

                      </div>

                      <input
                        type="checkbox"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.show_gst_number
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "show_gst_number",
                              event.target.checked
                            )
                        }
                      />

                    </label>


                    <label className="settings-toggle-row">

                      <div>

                        <strong>
                          Show Contact Details
                        </strong>

                        <span>
                          Include phone, email, address and website.
                        </span>

                      </div>

                      <input
                        type="checkbox"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.show_contact_details
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "show_contact_details",
                              event.target.checked
                            )
                        }
                      />

                    </label>


                    <label className="settings-toggle-row">

                      <div>

                        <strong>
                          Bank Details on Proforma
                        </strong>

                        <span>
                          Show company banking information on Proformas.
                        </span>

                      </div>

                      <input
                        type="checkbox"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.show_bank_details_on_proforma
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "show_bank_details_on_proforma",
                              event.target.checked
                            )
                        }
                      />

                    </label>


                    <label className="settings-toggle-row">

                      <div>

                        <strong>
                          Bank Details on Final Bill
                        </strong>

                        <span>
                          Show payment/bank information on Final Bills.
                        </span>

                      </div>

                      <input
                        type="checkbox"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.show_bank_details_on_final_bill
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "show_bank_details_on_final_bill",
                              event.target.checked
                            )
                        }
                      />

                    </label>


                    <label className="settings-toggle-row">

                      <div>

                        <strong>
                          Authorized Signature Area
                        </strong>

                        <span>
                          Reserve a signature area at the bottom of documents.
                        </span>

                      </div>

                      <input
                        type="checkbox"
                        disabled={
                          !canManageDocuments
                        }
                        checked={
                          documentForm.show_authorized_signature
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "show_authorized_signature",
                              event.target.checked
                            )
                        }
                      />

                    </label>

                  </div>


                  <div className="settings-form-grid settings-top-gap">

                    <label className="settings-field">

                      <span>
                        Authorized Signatory Name
                      </span>

                      <input
                        disabled={
                          !canManageDocuments
                          ||
                          !documentForm.show_authorized_signature
                        }
                        value={
                          documentForm.authorized_signatory_name
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "authorized_signatory_name",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Designation
                      </span>

                      <input
                        disabled={
                          !canManageDocuments
                          ||
                          !documentForm.show_authorized_signature
                        }
                        value={
                          documentForm.authorized_signatory_designation
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "authorized_signatory_designation",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field settings-field-wide">

                      <span>
                        Document Footer
                      </span>

                      <textarea
                        disabled={
                          !canManageDocuments
                        }
                        value={
                          documentForm.footer_text
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "footer_text",
                              event.target.value
                            )
                        }
                        placeholder="Optional footer text"
                      />

                    </label>

                  </div>

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon green">

                      <FileText
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Proforma Defaults
                      </h3>

                      <p>
                        These become defaults for new Proformas.
                        Individual Proformas can still be edited.
                      </p>

                    </div>

                  </div>


                  <div className="settings-form-grid">

                    <label className="settings-field">

                      <span>
                        Default Validity (Days)
                      </span>

                      <input
                        type="number"
                        min="1"
                        disabled={
                          !canManageDocuments
                        }
                        value={
                          documentForm.proforma_validity_days
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "proforma_validity_days",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field settings-field-wide">

                      <span>
                        Default Payment Terms
                      </span>

                      <textarea
                        disabled={
                          !canManageDocuments
                        }
                        value={
                          documentForm.proforma_payment_terms
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "proforma_payment_terms",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field settings-field-wide">

                      <span>
                        Default Delivery Terms
                      </span>

                      <textarea
                        disabled={
                          !canManageDocuments
                        }
                        value={
                          documentForm.proforma_delivery_terms
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "proforma_delivery_terms",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field settings-field-wide">

                      <span>
                        Default Terms & Conditions
                      </span>

                      <textarea
                        className="settings-large-textarea"
                        disabled={
                          !canManageDocuments
                        }
                        value={
                          documentForm.proforma_terms_and_conditions
                        }
                        onChange={
                          event =>
                            updateDocumentField(
                              "proforma_terms_and_conditions",
                              event.target.value
                            )
                        }
                      />

                    </label>

                  </div>

                </div>


                {
                  canManageDocuments
                  &&
                  (
                    <div className="settings-save-bar">

                      <div>

                        <strong>
                          Document Settings
                        </strong>

                        <span>
                          These settings will later drive Proforma
                          and Final Bill Print/DOCX output.
                        </span>

                      </div>


                      <button
                        type="button"
                        className="settings-primary-button"
                        disabled={
                          documentSaving
                        }
                        onClick={
                          handleSaveDocuments
                        }
                      >

                        {
                          documentSaving
                            ? (
                                <Loader2
                                  size={16}
                                  className="settings-spin"
                                />
                              )
                            : (
                                <Save
                                  size={16}
                                />
                              )
                        }

                        Save Document Settings

                      </button>

                    </div>
                  )
                }

              </>
            )
          }


          {/* =====================================================
              BUSINESS
          ====================================================== */}

          {
            activeTab
            === "business"
            &&
            canManageBusiness
            &&
            (
              <>

                <div className="settings-section-heading">

                  <div>

                    <h2>
                      Business & Numbering
                    </h2>

                    <p>
                      Company-wide defaults and document-number prefixes.
                    </p>

                  </div>


                  

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon green">

                      <BadgeIndianRupee
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Business Defaults
                      </h3>

                      <p>
                        Default financial and display behaviour.
                      </p>

                    </div>

                  </div>


                  <div className="settings-form-grid">

                    <label className="settings-field">

                      <span>
                        Currency
                      </span>

                      <input
                        value={
                          businessForm.currency_code
                        }
                        disabled={
                          !canManageBusiness
                        }
                        maxLength={3}
                        onChange={
                          event =>
                            updateBusinessField(
                              "currency_code",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Timezone
                      </span>

                      <input
                        value={
                          businessForm.timezone
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "timezone",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Default GST %
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={
                          businessForm.default_gst_percent
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "default_gst_percent",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Default Records Per Page
                      </span>

                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={
                          businessForm.default_page_size
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "default_page_size",
                              event.target.value
                            )
                        }
                      />

                    </label>

                  </div>

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon lavender">

                      <CalendarDays
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Financial Year Rule
                      </h3>

                      <p>
                        Fixed for this ERP to the Indian April–March financial year.
                      </p>

                    </div>

                  </div>


                  <div className="settings-fy-summary">

                    <div>

                      <span>
                        Starts
                      </span>

                      <strong>
                        01 April
                      </strong>

                    </div>


                    <div>

                      <span>
                        Ends
                      </span>

                      <strong>
                        31 March
                      </strong>

                    </div>


                    <div>

                      <span>
                        Current Rule
                      </span>

                      <strong>
                        FY start year controls document year
                      </strong>

                    </div>

                  </div>


                  <div className="settings-info-box">

                    Example: A Proforma created in January 2027
                    while FY 2026–2027 is active will use
                    <strong> PRO-2026-xxxx</strong>, not PRO-2027-xxxx.

                  </div>

                </div>


                <div className="settings-card">

                  <div className="settings-card-header">

                    <div className="settings-card-icon blue">

                      <SlidersHorizontal
                        size={18}
                      />

                    </div>

                    <div>

                      <h3>
                        Document Number Prefixes
                      </h3>

                      <p>
                        Number generation remains inside each ERP module.
                        Only prefixes and display digits are configured here.
                      </p>

                    </div>

                  </div>


                  <div className="settings-form-grid">

                    <label className="settings-field">

                      <span>
                        Enquiry Prefix
                      </span>

                      <input
                        value={
                          businessForm.enquiry_prefix
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "enquiry_prefix",
                              event.target.value
                            )
                        }
                      />

                      <small>
                        Example:
                        {" "}
                        {businessForm.enquiry_prefix || "ENQ"}-2026-0001
                      </small>

                    </label>


                    <label className="settings-field">

                      <span>
                        Proforma Prefix
                      </span>

                      <input
                        value={
                          businessForm.proforma_prefix
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "proforma_prefix",
                              event.target.value
                            )
                        }
                      />

                      <small>
                        Example:
                        {" "}
                        {businessForm.proforma_prefix || "PRO"}-2026-0001
                      </small>

                    </label>


                    <label className="settings-field">

                      <span>
                        Production Prefix
                      </span>

                      <input
                        value={
                          businessForm.production_prefix
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "production_prefix",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Finished Goods Receipt Prefix
                      </span>

                      <input
                        value={
                          businessForm.finished_goods_receipt_prefix
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "finished_goods_receipt_prefix",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Invoice Prefix
                      </span>

                      <input
                        value={
                          businessForm.invoice_prefix
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "invoice_prefix",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Credit Note Prefix
                      </span>

                      <input
                        value={
                          businessForm.credit_note_prefix
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "credit_note_prefix",
                              event.target.value
                            )
                        }
                      />

                    </label>


                    <label className="settings-field">

                      <span>
                        Sequence Digits
                      </span>

                      <input
                        type="number"
                        min="3"
                        max="6"
                        value={
                          businessForm.sequence_digits
                        }
                        disabled={
                          !canManageBusiness
                        }
                        onChange={
                          event =>
                            updateBusinessField(
                              "sequence_digits",
                              event.target.value
                            )
                        }
                      />

                      <small>
                        4 digits gives 0001, 0002, 0003...
                      </small>

                    </label>

                  </div>


                  <div className="settings-info-box settings-top-gap">

                    The Boss-only <strong>Skip / Reserve Number</strong>
                    controls and permanent <strong>Number Audit Log</strong>
                    will be added to this same section in the numbering stage.
                    No centralized numbering table will be introduced.

                  </div>

                </div>


                {
                  canManageBusiness
                  &&
                  (
                    <div className="settings-save-bar">

                      <div>

                        <strong>
                          Business Settings
                        </strong>

                        <span>
                          Financial-year start remains fixed at 01 April.
                        </span>

                      </div>


                      <button
                        type="button"
                        className="settings-primary-button"
                        disabled={
                          businessSaving
                        }
                        onClick={
                          handleSaveBusiness
                        }
                      >

                        {
                          businessSaving
                            ? (
                                <Loader2
                                  size={16}
                                  className="settings-spin"
                                />
                              )
                            : (
                                <Save
                                  size={16}
                                />
                              )
                        }

                        Save Business Settings

                      </button>

                    </div>
                  )
                }


                {
                  businessSettings
                  &&
                  (
                    <div className="settings-record-meta">
                      Configuration loaded successfully.
                    </div>
                  )
                }

              </>
            )
          }


                    {/* =====================================================
              SETTINGS SUB-SECTIONS
          ====================================================== */}

{
            activeTab
            === "users"
            &&
            canViewUsers
            &&
            (
              <UsersAccessSettings />
            )
          }


          {
            activeTab
            === "security"
            &&
            (
              <SecuritySettings />
            )
          }


          {
            activeTab
            === "backup"
            &&
            canViewBackup
            &&
            (
              <BackupRecoverySettings />
            )
          }


          {
            activeTab
            === "financial-year"
            &&
            canViewFinancialYear
            &&
            (
              <FinancialYearSettings />
            )
          }

        </div>

      </section>

    </div>
  );
}
