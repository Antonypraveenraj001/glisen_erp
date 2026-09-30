import axios from "axios";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

import "./RolePermissionMatrix.css";

import {
  getRolePermissionMatrix,
  updateRolePermissions,
} from "../../services/rolePermissionService";

import {
  useAuth,
} from "../../context/AuthContext";

import type {
  PermissionMatrixItem,
  PermissionMatrixRole,
  RolePermissionAssignment,
} from "../../types/rolePermissions";


interface Notice {
  type:
    | "success"
    | "error";

  text: string;
}


interface ModuleGroup {
  name: string;

  permissions:
    PermissionMatrixItem[];
}


/* ================================================================
   MODULE DISPLAY ORDER
================================================================ */

const MODULE_ORDER = [
  "Dashboard",
  "Enquiries",
  "Proformas",
  "Purchase Bills",
  "Products",
  "Suppliers",
  "Customers",
  "Stock",
  "Production",
  "Finished Products",
  "Final Billing",
  "GST",
  "Expenses",
  "Staff",
  "Financial",
  "Settings",
];


const MODULE_DESCRIPTIONS:
Record<string, string> = {

  Dashboard:
    "ERP dashboard and business overview.",

  Enquiries:
    "Customer enquiry records and enquiry workflow.",

  Proformas:
    "Create and manage Proformas and order confirmation.",

  "Purchase Bills":
    "Supplier bills, AI scanning and supplier payments.",

  Products:
    "Purchased products and raw-material master.",

  Suppliers:
    "Supplier master and supplier information.",

  Customers:
    "Customer master generated from Enquiries.",

  Stock:
    "Store inventory, stock movements and material issue.",

  Production:
    "Production orders, operations and completion.",

  "Finished Products":
    "Completed manufactured products and receipts.",

  "Final Billing":
    "Invoices, revisions, credit notes and customer payments.",

  GST:
    "GST reports and report downloads.",

  Expenses:
    "Company expense records.",

  Staff:
    "Staff and salary records.",

  Financial:
    "Financial Analyzer and financial reports.",

  Settings:
    "Company settings, document settings and user administration.",
};


/* ================================================================
   HELPERS
================================================================ */

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
      detail.length
      >
      0
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
    error
    instanceof Error
    &&
    error.message
  ) {

    return error.message;

  }


  return fallback;
}


/* ================================================================
   UI MODULE NAME

   Settings-related permissions are presented as ONE Settings
   module to the user.

   Internally the backend still keeps granular permissions:
   - Settings
   - Users & Access
   - Numbering
   - Backup & Recovery
   - Financial Year

   Boss-only permissions are never granted to another role.
================================================================ */

function getUiModuleName(
  backendModule:
    string
) {

  if (
    [
      "Settings",
      "Users & Access",
      "Numbering",
      "Backup & Recovery",
      "Financial Year",
    ].includes(
      backendModule
    )
  ) {

    return "Settings";

  }


  if (
    backendModule
    ===
    "Financial Analyzer"
  ) {

    return "Financial";

  }


  return backendModule;
}


/* ================================================================
   COMPONENT
================================================================ */

export default function RolePermissionMatrix() {

  const {
    user,
  } =
    useAuth();


  const isBoss =
    user?.role
    ===
    "Boss";


  const [
    roles,
    setRoles,
  ] =
    useState<
      PermissionMatrixRole[]
    >(
      []
    );


  const [
    permissions,
    setPermissions,
  ] =
    useState<
      PermissionMatrixItem[]
    >(
      []
    );


  const [
    assignments,
    setAssignments,
  ] =
    useState<
      RolePermissionAssignment[]
    >(
      []
    );


  const [
    selectedRoleId,
    setSelectedRoleId,
  ] =
    useState<
      number
      |
      null
    >(
      null
    );


  const [
    selectedModules,
    setSelectedModules,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );


  const [
    originalModules,
    setOriginalModules,
  ] =
    useState<
      Set<string>
    >(
      new Set()
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
    notice,
    setNotice,
  ] =
    useState<
      Notice
      |
      null
    >(
      null
    );


  /* ==============================================================
     SELECTED ROLE
  ============================================================== */

  const selectedRole =
    useMemo(
      () =>
        roles.find(
          role =>
            role.id
            ===
            selectedRoleId
        )
        ??
        null,
      [
        roles,
        selectedRoleId,
      ]
    );


  /* ==============================================================
     MODULE GROUPS

     Granular backend permissions are grouped into simple
     user-facing modules.
  ============================================================== */

  const moduleGroups =
    useMemo<
      ModuleGroup[]
    >(
      () => {

        const grouped =
          new Map<
            string,
            PermissionMatrixItem[]
          >();


        for (
          const permission
          of permissions
        ) {

          const moduleName =
            getUiModuleName(
              permission.module
            );


          if (
            !grouped.has(
              moduleName
            )
          ) {

            grouped.set(
              moduleName,
              []
            );

          }


          grouped
            .get(
              moduleName
            )
            ?.push(
              permission
            );

        }


        const result =
          Array.from(
            grouped.entries()
          )
            .map(
              (
                [
                  name,
                  modulePermissions,
                ]
              ) => ({
                name,

                permissions:
                  modulePermissions,
              })
            )
            .filter(
              group => {

                /*
                 * Boss can see every module.
                 *
                 * Other roles only need modules containing at
                 * least one normal assignable permission.
                 */
                if (
                  selectedRole?.protected
                ) {

                  return true;

                }


                return group.permissions.some(
                  permission =>
                    !permission.boss_only
                );

              }
            );


        result.sort(
          (
            first,
            second
          ) => {

            const firstIndex =
              MODULE_ORDER.indexOf(
                first.name
              );


            const secondIndex =
              MODULE_ORDER.indexOf(
                second.name
              );


            const normalizedFirst =
              firstIndex
              ===
              -1
                ? 999
                : firstIndex;


            const normalizedSecond =
              secondIndex
              ===
              -1
                ? 999
                : secondIndex;


            if (
              normalizedFirst
              !==
              normalizedSecond
            ) {

              return (
                normalizedFirst
                -
                normalizedSecond
              );

            }


            return first.name.localeCompare(
              second.name
            );

          }
        );


        return result;

      },
      [
        permissions,
        selectedRole,
      ]
    );


  /* ==============================================================
     CHANGE DETECTION
  ============================================================== */

  const hasUnsavedChanges =
    useMemo(
      () => {

        if (
          selectedModules.size
          !==
          originalModules.size
        ) {

          return true;

        }


        for (
          const moduleName
          of selectedModules
        ) {

          if (
            !originalModules.has(
              moduleName
            )
          ) {

            return true;

          }

        }


        return false;

      },
      [
        selectedModules,
        originalModules,
      ]
    );


  /* ==============================================================
     ASSIGNMENT -> MODULES

     Existing granular permissions are converted to module access.

     If a role currently has ANY normal permission from a module,
     that module is treated as enabled.

     When Save is clicked, the module is normalized to full normal
     access for that module.
  ============================================================== */

  function getModulesForRole(
    roleId:
      number,

    sourceAssignments:
      RolePermissionAssignment[],

    sourcePermissions:
      PermissionMatrixItem[],

    sourceRoles:
      PermissionMatrixRole[]
  ) {

    const role =
      sourceRoles.find(
        item =>
          item.id
          ===
          roleId
      );


    const modules =
      new Set<string>();


    if (
      role?.protected
    ) {

      for (
        const permission
        of sourcePermissions
      ) {

        modules.add(
          getUiModuleName(
            permission.module
          )
        );

      }


      return modules;

    }


    const assignment =
      sourceAssignments.find(
        item =>
          item.role_id
          ===
          roleId
      );


    const assignedIds =
      new Set(
        assignment
          ?.permission_ids
        ??
        []
      );


    for (
      const permission
      of sourcePermissions
    ) {

      if (
        permission.boss_only
      ) {

        continue;

      }


      if (
        assignedIds.has(
          permission.id
        )
      ) {

        modules.add(
          getUiModuleName(
            permission.module
          )
        );

      }

    }


    return modules;
  }


  /* ==============================================================
     APPLY ROLE SELECTION
  ============================================================== */

  function applyRoleSelection(
    roleId:
      number,

    sourceAssignments:
      RolePermissionAssignment[] =
        assignments,

    sourcePermissions:
      PermissionMatrixItem[] =
        permissions,

    sourceRoles:
      PermissionMatrixRole[] =
        roles
  ) {

    const modules =
      getModulesForRole(
        roleId,
        sourceAssignments,
        sourcePermissions,
        sourceRoles
      );


    setSelectedRoleId(
      roleId
    );


    setSelectedModules(
      new Set(
        modules
      )
    );


    setOriginalModules(
      new Set(
        modules
      )
    );


    setNotice(
      null
    );

  }


  /* ==============================================================
     LOAD MATRIX
  ============================================================== */

  async function loadMatrix(
    preferredRoleId:
      number
      |
      null =
        null
  ) {

    if (
      !isBoss
    ) {

      setLoading(
        false
      );


      return;

    }


    try {

      setLoading(
        true
      );


      setNotice(
        null
      );


      const data =
        await getRolePermissionMatrix();


      setRoles(
        data.roles
      );


      setPermissions(
        data.permissions
      );


      setAssignments(
        data.assignments
      );


      const preferredRole =
        preferredRoleId
          ? data.roles.find(
              role =>
                role.id
                ===
                preferredRoleId
            )
          : null;


      const adminRole =
        data.roles.find(
          role =>
            role.name
            ===
            "Admin"
        );


      const firstEditableRole =
        data.roles.find(
          role =>
            !role.protected
            &&
            role.is_active
        );


      const nextRole =
        preferredRole
        ??
        adminRole
        ??
        firstEditableRole
        ??
        data.roles[0]
        ??
        null;


      if (
        nextRole
      ) {

        applyRoleSelection(
          nextRole.id,
          data.assignments,
          data.permissions,
          data.roles
        );

      } else {

        setSelectedRoleId(
          null
        );


        setSelectedModules(
          new Set()
        );


        setOriginalModules(
          new Set()
        );

      }

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
            "Unable to load module access."
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

      void loadMatrix();

    },
    [
      isBoss,
    ]
  );


  /* ==============================================================
     ROLE CHANGE
  ============================================================== */

  function handleRoleChange(
    roleId:
      number
  ) {

    if (
      hasUnsavedChanges
    ) {

      const confirmed =
        window.confirm(
          "You have unsaved module access changes. Discard them and change role?"
        );


      if (
        !confirmed
      ) {

        return;

      }

    }


    applyRoleSelection(
      roleId
    );

  }


  /* ==============================================================
     MODULE TOGGLE
  ============================================================== */

  function toggleModule(
    moduleName:
      string
  ) {

    if (
      selectedRole
        ?.protected
    ) {

      return;

    }


    setSelectedModules(
      current => {

        const next =
          new Set(
            current
          );


        if (
          next.has(
            moduleName
          )
        ) {

          next.delete(
            moduleName
          );

        } else {

          next.add(
            moduleName
          );

        }


        return next;

      }
    );


    setNotice(
      null
    );

  }


  /* ==============================================================
     RESET
  ============================================================== */

  function resetUnsavedChanges() {

    setSelectedModules(
      new Set(
        originalModules
      )
    );


    setNotice(
      null
    );

  }


  /* ==============================================================
     BUILD BACKEND PERMISSION PAYLOAD

     Selected module:
         -> grant every normal permission inside that module.

     Boss-only permissions are always excluded from non-Boss roles.

     This lets the backend keep detailed security checks while
     Settings remains simple for the user.
  ============================================================== */

  function buildPermissionPayload() {

    const ids =
      new Set<number>();


    for (
      const permission
      of permissions
    ) {

      if (
        permission.boss_only
      ) {

        continue;

      }


      const moduleName =
        getUiModuleName(
          permission.module
        );


      if (
        selectedModules.has(
          moduleName
        )
      ) {

        ids.add(
          permission.id
        );

      }

    }


    return Array.from(
      ids
    )
      .sort(
        (
          first,
          second
        ) =>
          first
          -
          second
      );
  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function saveModules() {

    if (
      !selectedRole
      ||
      selectedRole.protected
    ) {

      return;

    }


    try {

      setSaving(
        true
      );


      setNotice(
        null
      );


      const permissionIds =
        buildPermissionPayload();


      const response =
        await updateRolePermissions(
          selectedRole.id,
          {
            permission_ids:
              permissionIds,
          }
        );


      const nextAssignments =
        assignments.map(
          assignment =>
            assignment.role_id
            ===
            selectedRole.id
              ? {
                  ...assignment,

                  permission_ids:
                    response.permission_ids,
                }
              : assignment
        );


      /*
       * In case a role did not yet exist in the assignments list,
       * add it after a successful save.
       */
      const assignmentExists =
        nextAssignments.some(
          assignment =>
            assignment.role_id
            ===
            selectedRole.id
        );


      if (
        !assignmentExists
      ) {

        nextAssignments.push({
          role_id:
            selectedRole.id,

          permission_ids:
            response.permission_ids,
        });

      }


      setAssignments(
        nextAssignments
      );


      const normalizedModules =
        getModulesForRole(
          selectedRole.id,
          nextAssignments,
          permissions,
          roles
        );


      setSelectedModules(
        new Set(
          normalizedModules
        )
      );


      setOriginalModules(
        new Set(
          normalizedModules
        )
      );


      setNotice({
        type:
          "success",

        text:
          `${response.role_name} module access saved successfully.`,
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
            "Unable to save module access."
          ),
      });

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     NON-BOSS

     Only Boss configures role-module access.
  ============================================================== */

  if (
    !isBoss
  ) {

    return null;

  }


  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {

    return (
      <section className="role-permission-card">

        <div className="role-permission-loading">

          <Loader2
            size={18}
            className="role-permission-spin"
          />

          Loading module access...

        </div>

      </section>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <section className="role-permission-card">

      {/* =========================================================
          HEADER
      ========================================================== */}

      <div className="role-permission-header">

        <div className="role-permission-heading">

          <div className="role-permission-icon">

            <ShieldCheck
              size={19}
            />

          </div>


          <div>

            <h3>
              Role Module Access
            </h3>


            <p>
              Select which ERP modules each role is allowed to use.
            </p>

          </div>

        </div>


        <button
          type="button"
          className="role-permission-refresh"
          disabled={
            saving
          }
          onClick={
            () =>
              void loadMatrix(
                selectedRoleId
              )
          }
        >

          <RefreshCw
            size={14}
          />

          Refresh

        </button>

      </div>


      {/* =========================================================
          INFORMATION
      ========================================================== */}

      <div className="role-permission-warning">

        <ShieldCheck
          size={15}
        />


        <span>
          Selecting a module gives the role normal access to all
          actions inside that module. Sensitive controls such as
          Backup & Restore, Financial Year Close, Number Skip,
          Business Numbering and Role Permissions remain Boss-only.
        </span>

      </div>


      {
        notice
        &&
        (
          <div
            className={
              `role-permission-notice ${notice.type}`
            }
          >

            {
              notice.type
              ===
              "success"
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

            {notice.text}

          </div>
        )
      }


      {/* =========================================================
          ROLE PICKER
      ========================================================== */}

      <div className="role-permission-role-picker">

        <label>

          <span>
            Configure Role
          </span>


          <div className="role-permission-select-wrap">

            <select
              value={
                selectedRoleId
                ??
                ""
              }
              disabled={
                saving
              }
              onChange={
                event =>
                  handleRoleChange(
                    Number(
                      event
                        .target
                        .value
                    )
                  )
              }
            >

              {
                roles.map(
                  role => (
                    <option
                      key={
                        role.id
                      }
                      value={
                        role.id
                      }
                    >

                      {
                        role.protected
                          ? `${role.name} — Protected`
                          : role.name
                      }

                    </option>
                  )
                )
              }

            </select>


            <ChevronDown
              size={14}
            />

          </div>

        </label>


        <div className="role-permission-role-summary">

          <span>
            Selected Role
          </span>


          <strong>

            {
              selectedRole
                ?.name
              ??
              "—"
            }

          </strong>


          {
            selectedRole
              ?.protected
            &&
            (
              <small>
                Full ERP access
              </small>
            )
          }

        </div>


        <div className="role-permission-role-summary">

          <span>
            Modules Enabled
          </span>


          <strong>
            {
              selectedModules.size
            }
          </strong>


          <small>
            of {moduleGroups.length} modules
          </small>

        </div>

      </div>


      {/* =========================================================
          BOSS PROTECTION
      ========================================================== */}

      {
        selectedRole
          ?.protected
        &&
        (
          <div className="role-permission-protected">

            <LockKeyhole
              size={16}
            />


            <div>

              <strong>
                Boss access is protected
              </strong>


              <span>
                Boss always has full ERP access and cannot be
                restricted from this screen.
              </span>

            </div>

          </div>
        )
      }


      {/* =========================================================
          MODULE CHECKBOXES
      ========================================================== */}

      <div className="role-permission-modules">

        {
          moduleGroups.map(
            group => {

              const selected =
                selectedRole
                  ?.protected
                ||
                selectedModules.has(
                  group.name
                );


              return (
                <div
                  key={
                    group.name
                  }
                  className="role-permission-module"
                >

                  <div className="role-permission-module-header">

                    <div>

                      <strong>
                        {group.name}
                      </strong>


                      <span>

                        {
                          MODULE_DESCRIPTIONS[
                            group.name
                          ]
                          ??
                          `Access to the ${group.name} module.`
                        }

                      </span>

                    </div>


                    <label className="role-permission-module-toggle">

                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        disabled={
                          saving
                          ||
                          Boolean(
                            selectedRole
                              ?.protected
                          )
                        }
                        onChange={
                          () =>
                            toggleModule(
                              group.name
                            )
                        }
                      />


                      {
                        selected
                          ? "Allowed"
                          : "No Access"
                      }

                    </label>

                  </div>

                </div>
              );

            }
          )
        }

      </div>


      {/* =========================================================
          SAVE
      ========================================================== */}

      {
        !selectedRole
          ?.protected
        &&
        (
          <div className="role-permission-save-bar">

            <div>

              <strong>

                {
                  hasUnsavedChanges
                    ? "Unsaved module access changes"
                    : "Module access is up to date"
                }

              </strong>


              <span>
                Changes apply to all users assigned to this role.
              </span>

            </div>


            <div className="role-permission-save-actions">

              <button
                type="button"
                className="role-permission-reset"
                disabled={
                  saving
                  ||
                  !hasUnsavedChanges
                }
                onClick={
                  resetUnsavedChanges
                }
              >

                Reset

              </button>


              <button
                type="button"
                className="role-permission-save"
                disabled={
                  saving
                  ||
                  !hasUnsavedChanges
                }
                onClick={
                  () =>
                    void saveModules()
                }
              >

                {
                  saving
                    ? (
                        <Loader2
                          size={14}
                          className="role-permission-spin"
                        />
                      )
                    : (
                        <Save
                          size={14}
                        />
                      )
                }


                {
                  saving
                    ? "Saving..."
                    : "Save Module Access"
                }

              </button>

            </div>

          </div>
        )
      }

    </section>
  );
}