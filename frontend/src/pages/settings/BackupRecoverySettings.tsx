import axios from "axios";

import {
  CheckCircle2,
  Clock,
  Copy,
  Database,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./BackupRecoverySettings.css";

import {
  createManualBackup,
  runAutomaticBackupNow,
  runRetentionCleanup,
  getBackupHistory,
  getBackupSettings,
  getBackupSystemStatus,
  updateBackupSettings,
  verifyBackup,
  restoreBackup,
} from "../../services/backupService";

import {
  getBusinessSettings,
} from "../../services/settingsService";

import {
  usePermissions,
} from "../../hooks/usePermissions";

import type {
  BackupLog,
  BackupSettings,
  BackupSettingsPayload,
  BackupSystemStatus,
} from "../../types/backup";


interface BackupForm {
  automatic_backup_enabled: boolean;
  backup_time: string;
  primary_backup_path: string;
  secondary_backup_enabled: boolean;
  secondary_backup_path: string;
  retention_days: string;
  verify_after_backup: boolean;
}


function emptyForm(): BackupForm {
  return {
    automatic_backup_enabled: false,
    backup_time: "22:00",
    primary_backup_path: "",
    secondary_backup_enabled: false,
    secondary_backup_path: "",
    retention_days: "30",
    verify_after_backup: true,
  };
}


function mapSettings(
  data: BackupSettings
): BackupForm {
  return {
    automatic_backup_enabled:
      data.automatic_backup_enabled,

    backup_time:
      (
        data.backup_time
        ||
        "22:00"
      ).slice(
        0,
        5
      ),

    primary_backup_path:
      data.primary_backup_path
      || "",
    secondary_backup_enabled:
      data.secondary_backup_enabled,
    secondary_backup_path:
      data.secondary_backup_path
      || "",
    retention_days:
      String(data.retention_days),
    verify_after_backup:
      data.verify_after_backup,
  };
}


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

        const location =
          Array.isArray(
            first.loc
          )
            ? first.loc
                .filter(
                  (item: unknown) =>
                    item !== "body"
                )
                .join(".")
            : "";


        return (
          location
            ? `${location}: ${first.msg}`
            : first.msg
        );

      }

    }


    const status =
      error.response
        ?.status;


    if (status) {

      return (
        `${fallback} (HTTP ${status})`
      );

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


function formatBytes(
  bytes: number | null
) {
  if (
    bytes === null
    ||
    bytes < 0
  ) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = [
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  let value =
    bytes / 1024;

  let index = 0;

  while (
    value >= 1024
    &&
    index
    <
    units.length
    -
    1
  ) {
    value /= 1024;
    index += 1;
  }

  return (
    `${value.toFixed(2)} ${units[index]}`
  );
}


function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return (
    parsed.toLocaleString(
      "en-IN"
    )
  );
}


function statusClass(
  status: string
) {
  const normalized =
    status
      .trim()
      .toLowerCase();

  if (
    normalized
    === "verified"
    ||
    normalized
    === "success"
  ) {
    return "success";
  }

  if (
    normalized
    === "partial"
    ||
    normalized
    === "retention_partial"
  ) {
    return "warning";
  }

  if (
    normalized
    === "purged"
  ) {
    return "neutral";
  }

  if (
    normalized
    === "failed"
  ) {
    return "danger";
  }

  return "neutral";
}


export default function BackupRecoverySettings() {
  const {
    hasPermission,
  } =
    usePermissions();

  const canManageBackup =
    hasPermission(
      "backup.manage"
    );

  const [
    form,
    setForm,
  ] =
    useState<BackupForm>(
      emptyForm()
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      BackupSystemStatus | null
    >(
      null
    );

  const [
    history,
    setHistory,
  ] =
    useState<
      BackupLog[]
    >(
      []
    );

  const [
    totalHistory,
    setTotalHistory,
  ] =
    useState(0);

  const [
    pageSize,
    setPageSize,
  ] =
    useState(10);

  const [
    page,
    setPage,
  ] =
    useState(1);

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
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    runningAutomatic,
    setRunningAutomatic,
  ] =
    useState(false);

  const [
    cleaningRetention,
    setCleaningRetention,
  ] =
    useState(false);

  const [
    verifyingId,
    setVerifyingId,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    restoringId,
    setRestoringId,
  ] =
    useState<number | null>(
      null
    );


  const [
    message,
    setMessage,
  ] =
    useState<
      {
        type:
          "success"
          |
          "error";

        text:
          string;
      }
      | null
    >(
      null
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        history.length
        /
        pageSize
      )
    );

  const safePage =
    Math.min(
      page,
      totalPages
    );

  const paginatedHistory =
    useMemo(
      () => {
        const start =
          (
            safePage
            -
            1
          )
          *
          pageSize;

        return (
          history.slice(
            start,
            start
            +
            pageSize
          )
        );
      },
      [
        history,
        safePage,
        pageSize,
      ]
    );

  async function loadAll() {
    try {
      setLoading(true);
      setMessage(null);

      const [
        backupSettings,
        systemStatus,
        backupHistory,
        business,
      ] =
        await Promise.all([
          getBackupSettings(),
          getBackupSystemStatus(),
          getBackupHistory(500),
          getBusinessSettings(),
        ]);

      setForm(
        mapSettings(
          backupSettings
        )
      );

      setStatus(
        systemStatus
      );

      setHistory(
        backupHistory.items
      );

      setTotalHistory(
        backupHistory.total
      );

      if (
        business.default_page_size
        > 0
      ) {
        setPageSize(
          business.default_page_size
        );
      }
    } catch (
      error
    ) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          getErrorMessage(
            error,
            "Unable to load Backup & Recovery."
          ),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    () => {
      void loadAll();
    },
    []
  );

  useEffect(
    () => {
      if (
        page
        >
        totalPages
      ) {
        setPage(
          totalPages
        );
      }
    },
    [
      page,
      totalPages,
    ]
  );

  function updateField(
    field: keyof BackupForm,
    value: string | boolean
  ) {
    setForm(
      current => ({
        ...current,
        [field]: value,
      })
    );
  }

  async function handleSave() {
    if (!canManageBackup) {
      return;
    }

    const retentionDays =
      Number(
        form.retention_days
      );

    if (
      !Number.isInteger(
        retentionDays
      )
      ||
      retentionDays < 1
      ||
      retentionDays > 3650
    ) {
      setMessage({
        type: "error",
        text:
          "Retention days must be between 1 and 3650.",
      });

      return;
    }

    const payload:
      BackupSettingsPayload =
      {
        automatic_backup_enabled:
          form.automatic_backup_enabled,

        backup_time:
          form.backup_time,

        primary_backup_path:
          form.primary_backup_path
            .trim(),

        secondary_backup_enabled:
          form.secondary_backup_enabled,

        secondary_backup_path:
          form.secondary_backup_enabled
            ? (
                form.secondary_backup_path
                  .trim()
                ||
                null
              )
            : null,

        retention_days:
          retentionDays,

        include_uploads:
          false,

        verify_after_backup:
          form.verify_after_backup,
      };

    try {
      setSaving(true);
      setMessage(null);

      const saved =
        await updateBackupSettings(
          payload
        );

      setForm(
        mapSettings(saved)
      );

      setMessage({
        type: "success",
        text:
          "Backup settings saved successfully.",
      });
    } catch (
      error
    ) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          getErrorMessage(
            error,
            "Unable to save Backup settings."
          ),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateBackup() {
    if (!canManageBackup) {
      return;
    }

    const confirmed =
      window.confirm(
        "Create a full Glisen ERP backup now?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setCreating(true);
      setMessage(null);

      const created =
        await createManualBackup();

      setMessage({
        type:
          created.status
          === "PARTIAL"
            ? "error"
            : "success",

        text:
          created.status
          === "PARTIAL"
            ? (
                "Primary backup succeeded, but the secondary "
                +
                "copy needs attention. Check Backup History."
              )
            : "Backup created successfully.",
      });

      const backupHistory =
        await getBackupHistory(500);

      setHistory(
        backupHistory.items
      );

      setTotalHistory(
        backupHistory.total
      );

      setPage(1);
    } catch (
      error
    ) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          getErrorMessage(
            error,
            "Unable to create backup."
          ),
      });

      try {
        const backupHistory =
          await getBackupHistory(500);

        setHistory(
          backupHistory.items
        );

        setTotalHistory(
          backupHistory.total
        );
      } catch {
        // Preserve the original backup error.
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleAutomaticTest() {
    if (!canManageBackup) {
      return;
    }

    const confirmed =
      window.confirm(
        "Create one AUTOMATIC-type backup now to test "
        +
        "the automatic backup + retention workflow?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setRunningAutomatic(
        true
      );

      setMessage(
        null
      );

      const created =
        await runAutomaticBackupNow();

      const backupHistory =
        await getBackupHistory(
          500
        );

      setHistory(
        backupHistory.items
      );

      setTotalHistory(
        backupHistory.total
      );

      setPage(
        1
      );

      setMessage({
        type:
          created.status
          === "PARTIAL"
            ? "error"
            : "success",

        text:
          created.status
          === "PARTIAL"
            ? (
                "Automatic test backup created on Primary, "
                +
                "but Secondary needs attention."
              )
            : (
                "Automatic test backup created successfully. "
                +
                "Retention cleanup also ran."
              ),
      });

    } catch (error) {
      console.error(
        error
      );

      setMessage({
        type:
          "error",

        text:
          getErrorMessage(
            error,
            "Unable to run automatic backup test."
          ),
      });

    } finally {
      setRunningAutomatic(
        false
      );
    }
  }


  async function handleRetentionCleanup() {
    if (!canManageBackup) {
      return;
    }

    try {
      setCleaningRetention(
        true
      );

      setMessage(
        null
      );

      const result =
        await runRetentionCleanup();

      const backupHistory =
        await getBackupHistory(
          500
        );

      setHistory(
        backupHistory.items
      );

      setTotalHistory(
        backupHistory.total
      );

      setMessage({
        type:
          result.partial
          > 0
            ? "error"
            : "success",

        text:
          (
            `Retention cleanup finished: ${result.purged} `
            +
            `AUTOMATIC backup(s) cleaned, ${result.partial} `
            +
            `partial. Protected MANUAL / PRE_RESTORE / `
            +
            `FY_FINAL backups were not touched.`
          ),
      });

    } catch (error) {
      console.error(
        error
      );

      setMessage({
        type:
          "error",

        text:
          getErrorMessage(
            error,
            "Unable to run retention cleanup."
          ),
      });

    } finally {
      setCleaningRetention(
        false
      );
    }
  }


  async function handleVerify(
    backupId: number
  ) {
    if (!canManageBackup) {
      return;
    }

    try {
      setVerifyingId(
        backupId
      );

      setMessage(null);

      const verified =
        await verifyBackup(
          backupId
        );

      setHistory(
        current =>
          current.map(
            item =>
              item.id
              === verified.id
                ? verified
                : item
          )
      );

      setMessage({
        type:
          verified.status
          === "VERIFIED"
            ? "success"
            : "error",

        text:
          verified.status
          === "VERIFIED"
            ? (
                "Backup checksum verified successfully."
              )
            : (
                verified.error_message
                ||
                "Backup verification requires attention."
              ),
      });
    } catch (
      error
    ) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          getErrorMessage(
            error,
            "Unable to verify backup."
          ),
      });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleRestore(
    item: BackupLog
  ) {
    if (!canManageBackup) {
      return;
    }

    const requiredText =
      `RESTORE ${item.filename}`;

    const entered =
      window.prompt(
        "DATABASE RESTORE WARNING\n\n"
        +
        "This replaces the current ERP database with the selected backup.\n\n"
        +
        "Glisen will first create and verify a PRE_RESTORE safety backup.\n\n"
        +
        "Uploaded files will NOT be changed in this checkpoint.\n\n"
        +
        "Type exactly:\n"
        +
        requiredText
      );

    if (entered === null) {
      return;
    }

    if (
      entered.trim()
      !==
      requiredText
    ) {
      setMessage({
        type: "error",
        text:
          "Restore cancelled because the confirmation text did not match.",
      });
      return;
    }

    try {
      setRestoringId(
        item.id
      );
      setMessage(null);

      const result =
        await restoreBackup(
          item.id,
          entered.trim()
        );

      await loadAll();

      setMessage({
        type: "success",
        text:
          `${result.message} Safety backup: ${result.pre_restore_filename}`,
      });

      setPage(1);

    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          getErrorMessage(
            error,
            "Unable to restore backup."
          ),
      });

    } finally {
      setRestoringId(null);
    }
  }


  if (loading) {
    return (
      <div className="settings-loading">
        <Loader2
          size={18}
          className="settings-spin"
        />
        Loading Backup & Recovery...
      </div>
    );
  }

  return (
    <>
      <div className="settings-section-heading">
        <div>
          <h2>
            Backup & Recovery
          </h2>

          <p>
            Create verified database backups, keep a second
            physical copy, restore safely, and schedule one automatic
            database backup per day with protected retention rules.
          </p>
        </div>

        <span className="settings-stage-badge">
          Boss-only protected section
        </span>
      </div>

      {
        message
        && (
          <div
            className={
              `settings-notice ${message.type}`
            }
          >
            {
              message.type
              === "success"
                ? (
                    <CheckCircle2
                      size={15}
                    />
                  )
                : (
                    <ShieldCheck
                      size={15}
                    />
                  )
            }

            {message.text}
          </div>
        )
      }

      <div className="backup-status-grid">
        <div className="backup-status-card">
          <Database size={19} />

          <div>
            <span>
              Database
            </span>

            <strong>
              {
                status
                  ?.database_name
                ||
                "—"
              }
            </strong>
          </div>
        </div>

        <div className="backup-status-card">
          <ShieldCheck size={19} />

          <div>
            <span>
              MySQL Dump Utility
            </span>

            <strong
              className={
                status
                  ?.dump_utility_available
                  ? "backup-good"
                  : "backup-bad"
              }
            >
              {
                status
                  ?.dump_utility_available
                  ? "Ready"
                  : "Not Found"
              }
            </strong>

            <small>
              {
                status
                  ?.dump_utility_name
                ||
                "—"
              }
            </small>
          </div>
        </div>

        <div className="backup-status-card">
          <Clock size={19} />

          <div>
            <span>
              Automatic Backup
            </span>

            <strong
              className={
                form.automatic_backup_enabled
                  ? "backup-good"
                  : "backup-muted"
              }
            >
              {
                form.automatic_backup_enabled
                  ? "Enabled"
                  : "Disabled"
              }
            </strong>

            <small>
              {
                form.automatic_backup_enabled
                  ? `Daily at ${form.backup_time}`
                  : "No scheduled backup"
              }
            </small>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon blue">
            <HardDrive size={18} />
          </div>

          <div>
            <h3>
              Backup Storage
            </h3>

            <p>
              Use separate physical drives for Primary and
              Secondary locations whenever possible.
            </p>
          </div>
        </div>

        <div className="settings-form-grid">
          <label className="settings-field settings-field-wide">
            <span>
              Primary Backup Folder *
            </span>

            <input
              type="text"
              value={
                form.primary_backup_path
              }
              disabled={
                !canManageBackup
              }
              onChange={
                event =>
                  updateField(
                    "primary_backup_path",
                    event.target.value
                  )
              }
              placeholder={
                String.raw`D:\GlisenBackups\Primary`
              }
            />

            <small>
              This path is on the computer running the ERP backend.
              The folder will be created automatically if possible.
            </small>
          </label>

          <label className="backup-check-row">
            <input
              type="checkbox"
              checked={
                form.secondary_backup_enabled
              }
              disabled={
                !canManageBackup
              }
              onChange={
                event =>
                  updateField(
                    "secondary_backup_enabled",
                    event.target.checked
                  )
              }
            />

            <div>
              <strong>
                Enable Secondary Backup Copy
              </strong>

              <span>
                Recommended on a different hard disk or mounted drive.
              </span>
            </div>
          </label>

          <label className="settings-field">
            <span>
              Secondary Backup Folder
            </span>

            <input
              type="text"
              value={
                form.secondary_backup_path
              }
              disabled={
                !canManageBackup
                ||
                !form.secondary_backup_enabled
              }
              onChange={
                event =>
                  updateField(
                    "secondary_backup_path",
                    event.target.value
                  )
              }
              placeholder={
                String.raw`E:\GlisenBackups\Secondary`
              }
            />
          </label>

          <label className="settings-field">
            <span>
              Automatic Backup Time
            </span>

            <input
              type="time"
              value={
                form.backup_time
              }
              disabled={
                !canManageBackup
                ||
                !form.automatic_backup_enabled
              }
              onChange={
                event =>
                  updateField(
                    "backup_time",
                    event.target.value
                  )
              }
            />

            <small>
              Daily local server time. If the backend starts later
              that same day, it catches up once after the scheduled time.
            </small>
          </label>

          <label className="settings-field">
            <span>
              Automatic Backup Retention Days
            </span>

            <input
              type="number"
              min="1"
              max="3650"
              value={
                form.retention_days
              }
              disabled={
                !canManageBackup
              }
              onChange={
                event =>
                  updateField(
                    "retention_days",
                    event.target.value
                  )
              }
            />

            <small>
              Only old AUTOMATIC backup files are cleaned.
              MANUAL, PRE_RESTORE and FY_FINAL backups are protected.
            </small>
          </label>
        </div>

        <div className="backup-options">
          <label className="backup-check-row">
            <input
              type="checkbox"
              checked={
                form.automatic_backup_enabled
              }
              disabled={
                !canManageBackup
              }
              onChange={
                event =>
                  updateField(
                    "automatic_backup_enabled",
                    event.target.checked
                  )
              }
            />

            <div>
              <strong>
                Enable Daily Automatic Backup
              </strong>

              <span>
                Creates at most one scheduled AUTOMATIC backup per day
                while the ERP backend is running.
              </span>
            </div>
          </label>

          <label className="backup-check-row">
            <input
              type="checkbox"
              checked={
                form.verify_after_backup
              }
              disabled={
                !canManageBackup
              }
              onChange={
                event =>
                  updateField(
                    "verify_after_backup",
                    event.target.checked
                  )
              }
            />

            <div>
              <strong>
                Verify After Backup
              </strong>

              <span>
                Recalculates SHA-256 after writing each backup copy.
              </span>
            </div>
          </label>
        </div>

        {
          canManageBackup
          && (
            <div className="backup-actions backup-actions-wrap">
              <button
                type="button"
                className="settings-secondary-button"
                disabled={
                  saving
                  ||
                  creating
                  ||
                  runningAutomatic
                  ||
                  cleaningRetention
                }
                onClick={() =>
                  void handleSave()
                }
              >
                {
                  saving
                    ? (
                        <Loader2
                          size={15}
                          className="settings-spin"
                        />
                      )
                    : (
                        <Save size={15} />
                      )
                }

                Save Backup Settings
              </button>

              <button
                type="button"
                className="settings-secondary-button"
                disabled={
                  saving
                  ||
                  creating
                  ||
                  runningAutomatic
                  ||
                  cleaningRetention
                  ||
                  !form.primary_backup_path
                    .trim()
                  ||
                  !status
                    ?.dump_utility_available
                }
                onClick={() =>
                  void handleAutomaticTest()
                }
              >
                {
                  runningAutomatic
                    ? (
                        <Loader2
                          size={15}
                          className="settings-spin"
                        />
                      )
                    : (
                        <Play size={15} />
                      )
                }

                Run Automatic Test Now
              </button>

              <button
                type="button"
                className="settings-secondary-button"
                disabled={
                  saving
                  ||
                  creating
                  ||
                  runningAutomatic
                  ||
                  cleaningRetention
                }
                onClick={() =>
                  void handleRetentionCleanup()
                }
              >
                {
                  cleaningRetention
                    ? (
                        <Loader2
                          size={15}
                          className="settings-spin"
                        />
                      )
                    : (
                        <RefreshCw size={15} />
                      )
                }

                Run Retention Cleanup
              </button>

              <button
                type="button"
                className="settings-primary-button"
                disabled={
                  saving
                  ||
                  creating
                  ||
                  runningAutomatic
                  ||
                  cleaningRetention
                  ||
                  !form.primary_backup_path
                    .trim()
                  ||
                  !status
                    ?.dump_utility_available
                }
                onClick={() =>
                  void handleCreateBackup()
                }
              >
                {
                  creating
                    ? (
                        <Loader2
                          size={15}
                          className="settings-spin"
                        />
                      )
                    : (
                        <Database size={15} />
                      )
                }

                Create Manual Backup
              </button>
            </div>
          )
        }
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon green">
            <ShieldCheck size={18} />
          </div>

          <div>
            <h3>
              Backup History
            </h3>

            <p>
              Every attempted backup is retained as an audit record,
              including failures and checksum verification.
            </p>
          </div>
        </div>

        {
          history.length
          === 0
            ? (
                <div className="backup-empty">
                  No backup has been created yet.
                </div>
              )
            : (
                <>
                  <div className="backup-table-wrap">
                    <table className="backup-table">
                      <thead>
                        <tr>
                          <th>Created</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>File</th>
                          <th>Size</th>
                          <th>Verification</th>
                          <th>Storage</th>
                          <th className="backup-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {
                          paginatedHistory.map(
                            item => (
                              <tr key={item.id}>
                                <td>
                                  {
                                    formatDateTime(
                                      item.started_at
                                    )
                                  }
                                </td>

                                <td>
                                  {item.backup_type}
                                </td>

                                <td>
                                  <span
                                    className={
                                      `backup-status-badge ${
                                        statusClass(
                                          item.status
                                        )
                                      }`
                                    }
                                  >
                                    {item.status}
                                  </span>
                                </td>

                                <td>
                                  <div className="backup-file-cell">
                                    <strong>
                                      {item.filename}
                                    </strong>

                                    <span>
                                      {
                                        item.schema_revision
                                        ||
                                        "Schema revision unavailable"
                                      }
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  {
                                    formatBytes(
                                      item.file_size_bytes
                                    )
                                  }
                                </td>

                                <td>
                                  {
                                    item.verified_at
                                      ? (
                                          <span className="backup-verified">
                                            <CheckCircle2 size={13} />
                                            {
                                              formatDateTime(
                                                item.verified_at
                                              )
                                            }
                                          </span>
                                        )
                                      : "Not verified"
                                  }
                                </td>

                                <td>
                                  <div className="backup-storage-cell">
                                    <span
                                      title={
                                        item.primary_path
                                        || ""
                                      }
                                    >
                                      Primary
                                    </span>

                                    {
                                      item.secondary_path
                                      && (
                                        <span
                                          title={
                                            item.secondary_path
                                          }
                                        >
                                          <Copy size={11} />
                                          Secondary
                                        </span>
                                      )
                                    }

                                    {
                                      item.status
                                      === "PURGED"
                                      && (
                                        <span>
                                          Files cleaned by retention
                                        </span>
                                      )
                                    }

                                    {
                                      item.error_message
                                      && (
                                        <small>
                                          {item.error_message}
                                        </small>
                                      )
                                    }
                                  </div>
                                </td>

                                <td className="backup-right">
                                  {
                                    canManageBackup
                                    && (
                                      <div className="backup-row-actions">
                                        <button
                                          type="button"
                                          className="backup-verify-button"
                                          disabled={
                                            verifyingId
                                            === item.id
                                            ||
                                            restoringId
                                            !== null
                                            ||
                                            !item.checksum_sha256
                                            ||
                                            item.status
                                            === "PURGED"
                                          }
                                          onClick={() =>
                                            void handleVerify(
                                              item.id
                                            )
                                          }
                                        >
                                          {
                                            verifyingId
                                            === item.id
                                              ? (
                                                  <Loader2
                                                    size={13}
                                                    className="settings-spin"
                                                  />
                                                )
                                              : (
                                                  <RefreshCw size={13} />
                                                )
                                          }

                                          Verify
                                        </button>

                                        {
                                          item.status
                                          === "VERIFIED"
                                          &&
                                          item.backup_type
                                          !== "RESTORE"
                                          &&
                                          (
                                            <button
                                              type="button"
                                              className="backup-restore-button"
                                              disabled={
                                                restoringId
                                                !== null
                                              }
                                              onClick={() =>
                                                void handleRestore(
                                                  item
                                                )
                                              }
                                            >
                                              {
                                                restoringId
                                                === item.id
                                                  ? (
                                                      <Loader2
                                                        size={13}
                                                        className="settings-spin"
                                                      />
                                                    )
                                                  : (
                                                      <RotateCcw size={13} />
                                                    )
                                              }

                                              Restore
                                            </button>
                                          )
                                        }
                                      </div>
                                    )
                                  }
                                </td>
                              </tr>
                            )
                          )
                        }
                      </tbody>
                    </table>
                  </div>

                  <div className="backup-pagination">
                    <span>
                      Showing
                      {" "}
                      {
                        (
                          (
                            safePage
                            -
                            1
                          )
                          *
                          pageSize
                        )
                        +
                        1
                      }
                      {"–"}
                      {
                        Math.min(
                          safePage
                          *
                          pageSize,
                          history.length
                        )
                      }
                      {" "}
                      of
                      {" "}
                      {history.length}
                      {
                        totalHistory
                        >
                        history.length
                          ? (
                              ` (${totalHistory} total records)`
                            )
                          : ""
                      }
                    </span>

                    <div>
                      <button
                        type="button"
                        disabled={
                          safePage
                          <= 1
                        }
                        onClick={() =>
                          setPage(
                            safePage
                            -
                            1
                          )
                        }
                      >
                        Previous
                      </button>

                      <strong>
                        Page {safePage} of {totalPages}
                      </strong>

                      <button
                        type="button"
                        disabled={
                          safePage
                          >= totalPages
                        }
                        onClick={() =>
                          setPage(
                            safePage
                            +
                            1
                          )
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )
        }
      </div>

      <div className="settings-info-box">
        <strong>
          Recovery safety:
        </strong>
        {" "}
        Database restore is protected by checksum validation,
        exact typed confirmation, a mandatory verified PRE_RESTORE backup,
        maintenance blocking and automatic rollback if the target database
        restore fails. Automatic retention deletes only old AUTOMATIC backup
        files; MANUAL, PRE_RESTORE and FY_FINAL backups are never removed
        by the retention job.
      </div>
    </>
  );
}
