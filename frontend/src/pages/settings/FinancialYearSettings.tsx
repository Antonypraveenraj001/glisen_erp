import axios from "axios";

import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Database,
  Factory,
  FileText,
  Loader2,
  LockKeyhole,
  Package,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import "./FinancialYearSettings.css";

import {
  getFinancialYearOverview,
  transitionFinancialYear,
} from "../../services/financialYearService";

import {
  usePermissions,
} from "../../hooks/usePermissions";

import type {
  FinancialYearOverview,
} from "../../types/financialYear";


function getErrorMessage(
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


function formatDate(
  value: string
) {
  const parsed =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleString(
    "en-IN"
  );
}


function shortFy(
  startDate: string,
  endDate: string
) {
  return (
    `FY ${startDate.slice(0, 4)}–${endDate.slice(2, 4)}`
  );
}


export default function FinancialYearSettings() {
  const {
    hasPermission,
  } =
    usePermissions();

  const canManageTransition =
    hasPermission(
      "financial_year.manage"
    );

  const [
    data,
    setData,
  ] =
    useState<
      FinancialYearOverview | null
    >(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

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
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    confirmation,
    setConfirmation,
  ] =
    useState(
      ""
    );

  const [
    transitioning,
    setTransitioning,
  ] =
    useState(
      false
    );


  async function loadOverview() {
    try {
      setLoading(
        true
      );

      setError(
        null
      );

      const result =
        await getFinancialYearOverview();

      setData(
        result
      );

    } catch (
      loadError
    ) {
      console.error(
        loadError
      );

      setError(
        getErrorMessage(
          loadError,
          "Unable to load Financial Year information."
        )
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  async function handleTransition() {
    if (!data) {
      return;
    }

    const required =
      data.validation
        .required_confirmation;

    if (
      confirmation
      !==
      required
    ) {
      setError(
        `Type exactly: ${required}`
      );
      return;
    }

    const accepted =
      window.confirm(
        (
          "This will create a permanent FY_FINAL backup, "
          +
          "snapshot opening stock and WIP, close the current "
          +
          "Financial Year and open the next one. Continue?"
        )
      );

    if (!accepted) {
      return;
    }

    try {
      setTransitioning(
        true
      );

      setError(
        null
      );

      setSuccess(
        null
      );

      const result =
        await transitionFinancialYear(
          confirmation
        );

      setSuccess(
        (
          `${result.message} `
          +
          `FY_FINAL: ${result.backup_filename}. `
          +
          `Opening stock: ${result.opening_stock_items} item(s), `
          +
          `opening WIP: ${result.opening_wip_orders} order(s).`
        )
      );

      setConfirmation(
        ""
      );

      await loadOverview();

    } catch (
      transitionError
    ) {
      console.error(
        transitionError
      );

      setError(
        getErrorMessage(
          transitionError,
          "Financial Year transition failed."
        )
      );

    } finally {
      setTransitioning(
        false
      );
    }
  }


  useEffect(
    () => {
      void loadOverview();
    },
    []
  );


  if (
    loading
    &&
    !data
  ) {
    return (
      <div className="settings-loading">
        <Loader2
          size={18}
          className="settings-spin"
        />
        Loading Financial Year...
      </div>
    );
  }


  if (
    !data
  ) {
    return (
      <div className="settings-notice error">
        <AlertTriangle
          size={15}
        />
        {
          error
          ||
          "Financial Year information is unavailable."
        }
      </div>
    );
  }


  const validation =
    data.validation;

  const current =
    validation
      .current_financial_year;

  const transitionDisabled =
    (
      !canManageTransition
      ||
      !validation.can_start_transition
      ||
      confirmation
      !==
      validation.required_confirmation
      ||
      transitioning
    );


  return (
    <>
      {
        error
        &&
        (
          <div className="settings-notice error">
            <AlertTriangle size={15} />
            {error}
          </div>
        )
      }

      {
        success
        &&
        (
          <div className="settings-notice success">
            <CheckCircle2 size={15} />
            {success}
          </div>
        )
      }

      <div className="settings-section-heading">
        <div>
          <h2>
            Financial Year & Transition
          </h2>
          <p>
            Review the active April–March Financial Year,
            transition timing, backup readiness, stock and
            live-production carry-forward requirements.
          </p>
        </div>

        <button
          type="button"
          className="settings-secondary-button"
          disabled={
            loading
          }
          onClick={() =>
            void loadOverview()
          }
        >
          {
            loading
              ? (
                  <Loader2
                    size={14}
                    className="settings-spin"
                  />
                )
              : (
                  <RefreshCw
                    size={14}
                  />
                )
          }
          Run Validation
        </button>
      </div>

      <div className="fy-current-card">
        <div className="fy-current-icon">
          <CalendarDays size={24} />
        </div>

        <div className="fy-current-main">
          <span>
            ACTIVE FINANCIAL YEAR
          </span>
          <strong>
            {
              shortFy(
                current.start_date,
                current.end_date
              )
            }
          </strong>
          <small>
            {formatDate(current.start_date)}
            {" to "}
            {formatDate(current.end_date)}
          </small>
        </div>

        <div className="fy-current-status">
          <span
            className={
              `fy-pill ${current.status.toLowerCase()}`
            }
          >
            {current.status}
          </span>
          <small>
            Transition available from{" "}
            {
              formatDate(
                validation
                  .transition_available_from
              )
            }
          </small>
        </div>
      </div>

      <div className="fy-readiness-grid">
        <div className="fy-readiness-card">
          <CalendarDays size={18} />
          <span>Calendar</span>
          <strong
            className={
              validation.calendar_ready
                ? "fy-good"
                : "fy-warning"
            }
          >
            {
              validation.calendar_ready
                ? "Ready to close"
                : "Financial Year still open"
            }
          </strong>
          <small>
            Today: {formatDate(validation.today)}
          </small>
        </div>

        <div className="fy-readiness-card">
          <ShieldCheck size={18} />
          <span>Backup Infrastructure</span>
          <strong
            className={
              validation.backup_infrastructure_ready
                ? "fy-good"
                : "fy-bad"
            }
          >
            {
              validation.backup_infrastructure_ready
                ? "Ready"
                : "Needs attention"
            }
          </strong>
          <small>
            Last verified:{" "}
            {
              validation.latest_verified_backup_at
                ? formatDateTime(
                    validation
                      .latest_verified_backup_at
                  )
                : "No verified backup yet"
            }
          </small>
        </div>

        <div className="fy-readiness-card">
          <Package size={18} />
          <span>Opening Stock Carry Forward</span>
          <strong>
            {validation.stock_items_to_carry} product(s)
          </strong>
          <small>
            Total quantity:{" "}
            {validation.total_stock_quantity.toFixed(2)}
          </small>
        </div>

        <div className="fy-readiness-card">
          <Factory size={18} />
          <span>Live Production / WIP</span>
          <strong>
            {validation.live_production_orders} order(s)
          </strong>
          <small>
            These are carried forward, not deleted.
          </small>
        </div>

        <div className="fy-readiness-card">
          <Database size={18} />
          <span>Purchase Bills This FY</span>
          <strong>
            {validation.current_fy_purchase_bills}
          </strong>
          <small>
            Historical bills stay in their original year.
          </small>
        </div>

        <div className="fy-readiness-card">
          <FileText size={18} />
          <span>Issued Invoices This FY</span>
          <strong>
            {validation.current_fy_issued_invoices}
          </strong>
          <small>
            Historical invoices and payments remain available.
          </small>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon blue">
            <ArrowRight size={18} />
          </div>
          <div>
            <h3>
              Year-End Preparation
            </h3>
            <p>
              Preview exactly what will move into the next
              Financial Year before any close action is enabled.
            </p>
          </div>
        </div>

        <div className="fy-preparation-grid">
          <div>
            <span>Closing Year</span>
            <strong>
              {
                shortFy(
                  current.start_date,
                  current.end_date
                )
              }
            </strong>
            <small>
              Ends {formatDate(current.end_date)}
            </small>
          </div>

          <div className="fy-preparation-arrow">
            <ArrowRight size={19} />
          </div>

          <div>
            <span>Next Financial Year</span>
            <strong>
              {
                shortFy(
                  validation.next_financial_year_start_date,
                  validation.next_financial_year_end_date
                )
              }
            </strong>
            <small>
              {
                formatDate(
                  validation.next_financial_year_start_date
                )
              }
              {" to "}
              {
                formatDate(
                  validation.next_financial_year_end_date
                )
              }
            </small>
          </div>
        </div>

        <div className="fy-final-backup-box">
          <div>
            <ShieldCheck size={18} />
          </div>

          <div>
            <span>
              Mandatory FY_FINAL Backup
            </span>

            <strong
              className={
                validation.fy_final_backup_verified
                  ? "fy-good"
                  : "fy-warning"
              }
            >
              {
                validation.fy_final_backup_verified
                  ? "Previous verified FY_FINAL backup exists"
                  : "Fresh FY_FINAL will be created during transition"
              }
            </strong>

            <small>
              {
                validation.fy_final_backup_verified
                  ? (
                      `${validation.fy_final_backup_filename || "FY_FINAL"} • `
                      +
                      `${formatDateTime(
                        validation
                          .fy_final_backup_verified_at
                      )}. A fresh final backup will still be created when transition runs.`
                    )
                  : (
                      "The transition will not change year data "
                      +
                      "until a fresh permanent backup is successfully verified."
                    )
              }
            </small>
          </div>
        </div>

        <div className="settings-info-box">
          The next Financial Year is not opened merely because
          the calendar reaches 01 April. The current ACTIVE year
          remains active until the protected transition completes.
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon lavender">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <h3>
              Transition Validation
            </h3>
            <p>
              Blockers must be clear before the protected
              year-close workflow can start.
            </p>
          </div>
        </div>

        {
          validation.blockers.length
          === 0
            ? (
                <div className="fy-ready-box">
                  <CheckCircle2 size={17} />
                  Validation passed. The protected transition
                  workflow can be started.
                </div>
              )
            : (
                <div className="fy-blocker-list">
                  {
                    validation.blockers.map(
                      (
                        blocker,
                        index
                      ) => (
                        <div
                          key={
                            `${blocker}-${index}`
                          }
                        >
                          <AlertTriangle size={15} />
                          <span>{blocker}</span>
                        </div>
                      )
                    )
                  }
                </div>
              )
        }

        <div className="fy-carry-list">
          <strong>
            Carry-forward review
          </strong>

          {
            validation
              .carry_forward_notes
              .map(
                (
                  note,
                  index
                ) => (
                  <div
                    key={
                      `${note}-${index}`
                    }
                  >
                    <Archive size={13} />
                    <span>{note}</span>
                  </div>
                )
              )
          }
        </div>
      </div>

      <div className="settings-card fy-protected-card">
        <div className="settings-card-header">
          <div className="settings-card-icon red">
            <LockKeyhole size={18} />
          </div>

          <div>
            <h3>
              Protected Financial Year Transition
            </h3>
            <p>
              Boss-only. This action becomes available only
              after the current Financial Year has ended and
              all validation blockers are clear.
            </p>
          </div>

          <span className="fy-boss-badge">
            Boss only
          </span>
        </div>

        {
          canManageTransition
            ? (
                <>
                  <label className="settings-field">
                    <span>
                      Type confirmation exactly
                    </span>

                    <input
                      value={
                        confirmation
                      }
                      disabled={
                        !validation.can_start_transition
                        ||
                        transitioning
                      }
                      placeholder={
                        validation.required_confirmation
                      }
                      onChange={
                        event =>
                          setConfirmation(
                            event.target.value
                          )
                      }
                    />

                    <small>
                      Required:{" "}
                      <strong>
                        {validation.required_confirmation}
                      </strong>
                    </small>
                  </label>

                  <div className="fy-transition-action">
                    <div>
                      {
                        validation.can_start_transition
                          ? (
                              <span className="fy-good">
                                All validation checks are clear.
                              </span>
                            )
                          : (
                              <span className="fy-warning">
                                Transition is locked until the
                                validation blockers above are clear.
                              </span>
                            )
                      }
                    </div>

                    <button
                      type="button"
                      className="fy-danger-button"
                      disabled={
                        transitionDisabled
                      }
                      onClick={() =>
                        void handleTransition()
                      }
                    >
                      {
                        transitioning
                          ? (
                              <Loader2
                                size={15}
                                className="settings-spin"
                              />
                            )
                          : (
                              <LockKeyhole
                                size={15}
                              />
                            )
                      }

                      {
                        transitioning
                          ? "Transitioning..."
                          : "Close Year & Open Next FY"
                      }
                    </button>
                  </div>
                </>
              )
            : (
                <div className="settings-info-box">
                  Only the Boss can execute a Financial Year
                  transition.
                </div>
              )
        }
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon blue">
            <Archive size={18} />
          </div>

          <div>
            <h3>
              Financial Year History
            </h3>
            <p>
              Financial Year master records remain permanently
              available after transition.
            </p>
          </div>
        </div>

        <div className="fy-history-table-wrap">
          <table className="fy-history-table">
            <thead>
              <tr>
                <th>Financial Year</th>
                <th>Period</th>
                <th>Status</th>
                <th>Closed At</th>
              </tr>
            </thead>

            <tbody>
              {
                data.history.map(
                  year => (
                    <tr key={year.id}>
                      <td>{year.name}</td>
                      <td>
                        {formatDate(year.start_date)}
                        {" – "}
                        {formatDate(year.end_date)}
                      </td>
                      <td>
                        <span
                          className={
                            `fy-pill ${year.status.toLowerCase()}`
                          }
                        >
                          {year.status}
                        </span>
                      </td>
                      <td>
                        {
                          year.closed_at
                            ? formatDateTime(
                                year.closed_at
                              )
                            : "—"
                        }
                      </td>
                    </tr>
                  )
                )
              }
            </tbody>
          </table>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon lavender">
            <ShieldCheck size={18} />
          </div>

          <div>
            <h3>
              Transition History
            </h3>
            <p>
              Permanent audit history for completed or failed
              Financial Year transition attempts.
            </p>
          </div>
        </div>

        {
          data.transition_history.length
          === 0
            ? (
                <div className="settings-info-box">
                  No Financial Year transition has been attempted yet.
                </div>
              )
            : (
                <div className="fy-history-table-wrap">
                  <table className="fy-history-table">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>FY_FINAL Backup</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Completed</th>
                      </tr>
                    </thead>

                    <tbody>
                      {
                        data.transition_history.map(
                          item => (
                            <tr key={item.id}>
                              <td>
                                {item.from_financial_year}
                              </td>
                              <td>
                                {
                                  item.to_financial_year
                                  ||
                                  "—"
                                }
                              </td>
                              <td>
                                {
                                  item.backup_filename
                                  ||
                                  "—"
                                }
                              </td>
                              <td>
                                <span
                                  className={
                                    `fy-pill ${item.status.toLowerCase()}`
                                  }
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                {formatDateTime(item.started_at)}
                              </td>
                              <td>
                                {formatDateTime(item.completed_at)}
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
    </>
  );
}
