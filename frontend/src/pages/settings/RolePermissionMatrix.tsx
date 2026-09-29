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
    === "Boss";


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
      number | null
    >(
      null
    );


  const [
    selectedPermissionIds,
    setSelectedPermissionIds,
  ] =
    useState<
      Set<number>
    >(
      new Set()
    );


  const [
    originalPermissionIds,
    setOriginalPermissionIds,
  ] =
    useState<
      Set<number>
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
      Notice | null
    >(
      null
    );


  /* ==============================================================
     LOOKUPS
  ============================================================== */

  const permissionByName =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            PermissionMatrixItem
          >();


        for (
          const permission
          of permissions
        ) {

          map.set(
            permission.name,
            permission
          );

        }


        return map;

      },
      [
        permissions,
      ]
    );


  const selectedRole =
    useMemo(
      () =>
        roles.find(
          role =>
            role.id
            === selectedRoleId
        )
        ??
        null,
      [
        roles,
        selectedRoleId,
      ]
    );


  const modules =
    useMemo(
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

          if (
            !grouped.has(
              permission.module
            )
          ) {

            grouped.set(
              permission.module,
              []
            );

          }


          grouped
            .get(
              permission.module
            )
            ?.push(
              permission
            );

        }


        return Array.from(
          grouped.entries()
        );

      },
      [
        permissions,
      ]
    );


  const hasUnsavedChanges =
    useMemo(
      () => {

        if (
          selectedPermissionIds.size
          !==
          originalPermissionIds.size
        ) {
          return true;
        }


        for (
          const permissionId
          of selectedPermissionIds
        ) {

          if (
            !originalPermissionIds.has(
              permissionId
            )
          ) {
            return true;
          }

        }


        return false;

      },
      [
        selectedPermissionIds,
        originalPermissionIds,
      ]
    );


  /* ==============================================================
     LOAD
  ============================================================== */

  async function loadMatrix(
    preferredRoleId:
      number | null = null
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
                === preferredRoleId
            )
          : null;


      const adminRole =
        data.roles.find(
          role =>
            role.name
            === "Admin"
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
          data.assignments
        );

      } else {

        setSelectedRoleId(
          null
        );


        setSelectedPermissionIds(
          new Set()
        );


        setOriginalPermissionIds(
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
            "Unable to load Role Permission Matrix."
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
     ROLE SELECTION
  ============================================================== */

  function applyRoleSelection(
    roleId: number,
    sourceAssignments:
      RolePermissionAssignment[] =
        assignments
  ) {

    const assignment =
      sourceAssignments.find(
        item =>
          item.role_id
          === roleId
      );


    const ids =
      new Set(
        assignment
          ?.permission_ids
        ??
        []
      );


    setSelectedRoleId(
      roleId
    );


    setSelectedPermissionIds(
      new Set(
        ids
      )
    );


    setOriginalPermissionIds(
      new Set(
        ids
      )
    );


    setNotice(
      null
    );

  }


  function handleRoleChange(
    roleId: number
  ) {

    if (
      hasUnsavedChanges
    ) {

      const confirmed =
        window.confirm(
          "You have unsaved permission changes. Discard them and change role?"
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
     CHECKBOX RULES
  ============================================================== */

  function isPermissionSelected(
    permissionId: number
  ) {

    return (
      selectedPermissionIds.has(
        permissionId
      )
    );

  }


  function isParentMissing(
    permission:
      PermissionMatrixItem
  ) {

    if (
      !permission.depends_on
    ) {
      return false;
    }


    const parent =
      permissionByName.get(
        permission.depends_on
      );


    if (
      !parent
    ) {
      return false;
    }


    return (
      !selectedPermissionIds.has(
        parent.id
      )
    );

  }


  function removePermissionAndChildren(
    permission:
      PermissionMatrixItem,
    source:
      Set<number>
  ) {

    const next =
      new Set(
        source
      );


    const removedNames =
      new Set<string>([
        permission.name,
      ]);


    next.delete(
      permission.id
    );


    let foundChild =
      true;


    while (
      foundChild
    ) {

      foundChild =
        false;


      for (
        const candidate
        of permissions
      ) {

        if (
          candidate.depends_on
          &&
          removedNames.has(
            candidate.depends_on
          )
          &&
          !removedNames.has(
            candidate.name
          )
        ) {

          removedNames.add(
            candidate.name
          );


          next.delete(
            candidate.id
          );


          foundChild =
            true;

        }

      }

    }


    return next;

  }


  function addPermissionWithParents(
    permission:
      PermissionMatrixItem,
    source:
      Set<number>
  ) {

    const next =
      new Set(
        source
      );


    let current:
      PermissionMatrixItem | undefined =
        permission;


    while (
      current
    ) {

      if (
        !current.boss_only
      ) {

        next.add(
          current.id
        );

      }


      if (
        !current.depends_on
      ) {
        break;
      }


      current =
        permissionByName.get(
          current.depends_on
        );

    }


    return next;

  }


  function togglePermission(
    permission:
      PermissionMatrixItem
  ) {

    if (
      selectedRole?.protected
      ||
      permission.boss_only
    ) {
      return;
    }


    if (
      selectedPermissionIds.has(
        permission.id
      )
    ) {

      setSelectedPermissionIds(
        removePermissionAndChildren(
          permission,
          selectedPermissionIds
        )
      );

      return;
    }


    setSelectedPermissionIds(
      addPermissionWithParents(
        permission,
        selectedPermissionIds
      )
    );

  }


  /* ==============================================================
     MODULE SELECT ALL
  ============================================================== */

  function getEditableModulePermissions(
    modulePermissions:
      PermissionMatrixItem[]
  ) {

    return (
      modulePermissions.filter(
        permission =>
          !permission.boss_only
      )
    );

  }


  function isModuleFullySelected(
    modulePermissions:
      PermissionMatrixItem[]
  ) {

    const editable =
      getEditableModulePermissions(
        modulePermissions
      );


    if (
      editable.length
      === 0
    ) {
      return false;
    }


    return (
      editable.every(
        permission =>
          selectedPermissionIds.has(
            permission.id
          )
      )
    );

  }


  function toggleModule(
    modulePermissions:
      PermissionMatrixItem[]
  ) {

    if (
      selectedRole?.protected
    ) {
      return;
    }


    const editable =
      getEditableModulePermissions(
        modulePermissions
      );


    if (
      editable.length
      === 0
    ) {
      return;
    }


    if (
      isModuleFullySelected(
        editable
      )
    ) {

      let next =
        new Set(
          selectedPermissionIds
        );


      for (
        const permission
        of editable
      ) {

        next =
          removePermissionAndChildren(
            permission,
            next
          );

      }


      setSelectedPermissionIds(
        next
      );

      return;
    }


    let next =
      new Set(
        selectedPermissionIds
      );


    for (
      const permission
      of editable
    ) {

      next =
        addPermissionWithParents(
          permission,
          next
        );

    }


    setSelectedPermissionIds(
      next
    );

  }


  /* ==============================================================
     RESET
  ============================================================== */

  function resetUnsavedChanges() {

    setSelectedPermissionIds(
      new Set(
        originalPermissionIds
      )
    );


    setNotice(
      null
    );

  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function savePermissions() {

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


      const payloadIds =
        permissions
          .filter(
            permission =>
              !permission.boss_only
              &&
              selectedPermissionIds.has(
                permission.id
              )
          )
          .map(
            permission =>
              permission.id
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


      const response =
        await updateRolePermissions(
          selectedRole.id,
          {
            permission_ids:
              payloadIds,
          }
        );


      const nextAssignments =
        assignments.map(
          assignment =>
            assignment.role_id
            === selectedRole.id
              ? {
                  ...assignment,

                  permission_ids:
                    response.permission_ids,
                }
              : assignment
        );


      setAssignments(
        nextAssignments
      );


      setSelectedPermissionIds(
        new Set(
          response.permission_ids
        )
      );


      setOriginalPermissionIds(
        new Set(
          response.permission_ids
        )
      );


      setNotice({
        type:
          "success",

        text:
          `${response.role_name} permissions saved successfully.`,
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
            "Unable to save role permissions."
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

          Loading permission matrix...

        </div>

      </section>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <section className="role-permission-card">

      <div className="role-permission-header">

        <div className="role-permission-heading">

          <div className="role-permission-icon">

            <ShieldCheck
              size={19}
            />

          </div>


          <div>

            <h3>
              Role Permission Matrix
            </h3>

            <p>
              Assign exactly what each ERP role can view
              and what actions it may perform.
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


      <div className="role-permission-warning">

        <ShieldCheck
          size={15}
        />

        <span>
          Permission configuration is being built safely in stages.
          These selections are stored in MySQL now, but existing ERP
          modules are still using their current access rules until
          permission enforcement is connected in the next stage.
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
                      event.target.value
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
            Selected
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
                Full access · cannot be changed
              </small>
            )
          }

        </div>


        <div className="role-permission-role-summary">

          <span>
            Permissions Enabled
          </span>

          <strong>
            {
              selectedPermissionIds.size
            }
          </strong>

          <small>
            {
              hasUnsavedChanges
                ? "Unsaved changes"
                : "Saved"
            }
          </small>

        </div>

      </div>


      {/* =========================================================
          BOSS MESSAGE
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
                Boss has permanent full access.
              </strong>

              <span>
                Boss permissions cannot be removed or edited,
                preventing accidental lockout of the ERP.
              </span>

            </div>

          </div>
        )
      }


      {/* =========================================================
          MODULES
      ========================================================== */}

      <div className="role-permission-modules">

        {
          modules.map(
            (
              [
                moduleName,
                modulePermissions,
              ]
            ) => {

              const moduleSelected =
                isModuleFullySelected(
                  modulePermissions
                );


              const onlyBossPermissions =
                modulePermissions.every(
                  permission =>
                    permission.boss_only
                );


              return (
                <div
                  key={
                    moduleName
                  }
                  className="role-permission-module"
                >

                  <div className="role-permission-module-header">

                    <div>

                      <strong>
                        {moduleName}
                      </strong>

                      <span>
                        {
                          modulePermissions.length
                        }
                        {
                          modulePermissions.length
                          === 1
                            ? " permission"
                            : " permissions"
                        }
                      </span>

                    </div>


                    <label className="role-permission-module-toggle">

                      <input
                        type="checkbox"
                        checked={
                          selectedRole
                            ?.protected
                            ? true
                            : moduleSelected
                        }
                        disabled={
                          Boolean(
                            selectedRole
                              ?.protected
                          )
                          ||
                          onlyBossPermissions
                          ||
                          saving
                        }
                        onChange={
                          () =>
                            toggleModule(
                              modulePermissions
                            )
                        }
                      />

                      <span>
                        Select Module
                      </span>

                    </label>

                  </div>


                  <div className="role-permission-items">

                    {
                      modulePermissions.map(
                        permission => {

                          const checked =
                            selectedRole
                              ?.protected
                              ? true
                              : isPermissionSelected(
                                  permission.id
                                );


                          const parentMissing =
                            isParentMissing(
                              permission
                            );


                          const disabled =
                            Boolean(
                              selectedRole
                                ?.protected
                            )
                            ||
                            permission.boss_only
                            ||
                            parentMissing
                            ||
                            saving;


                          return (
                            <label
                              key={
                                permission.id
                              }
                              className={
                                [
                                  "role-permission-item",

                                  checked
                                    ? "selected"
                                    : "",

                                  disabled
                                    ? "disabled"
                                    : "",

                                  permission.boss_only
                                    ? "boss-only"
                                    : "",
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  )
                              }
                            >

                              <div className="role-permission-checkbox">

                                <input
                                  type="checkbox"
                                  checked={
                                    checked
                                  }
                                  disabled={
                                    disabled
                                  }
                                  onChange={
                                    () =>
                                      togglePermission(
                                        permission
                                      )
                                  }
                                />

                              </div>


                              <div className="role-permission-item-content">

                                <div className="role-permission-item-title">

                                  <strong>
                                    {permission.label}
                                  </strong>


                                  {
                                    permission.boss_only
                                    &&
                                    (
                                      <span className="role-permission-lock-badge">

                                        <LockKeyhole
                                          size={10}
                                        />

                                        Boss Only

                                      </span>
                                    )
                                  }

                                </div>


                                <p>
                                  {
                                    permission.description
                                  }
                                </p>


                                {
                                  permission.depends_on
                                  &&
                                  (
                                    <small>

                                      Requires:
                                      {" "}
                                      {
                                        permissionByName
                                          .get(
                                            permission.depends_on
                                          )
                                          ?.label
                                        ??
                                        permission.depends_on
                                      }

                                    </small>
                                  )
                                }

                              </div>

                            </label>
                          );

                        }
                      )
                    }

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
        selectedRole
        &&
        !selectedRole.protected
        &&
        (
          <div className="role-permission-save-bar">

            <div>

              <strong>
                {
                  selectedRole.name
                }
                {" "}
                Permissions
              </strong>

              <span>
                {
                  hasUnsavedChanges
                    ? "You have unsaved permission changes."
                    : "All changes are saved."
                }
              </span>

            </div>


            <div className="role-permission-save-actions">

              <button
                type="button"
                className="role-permission-reset"
                disabled={
                  !hasUnsavedChanges
                  ||
                  saving
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
                  !hasUnsavedChanges
                  ||
                  saving
                }
                onClick={
                  () =>
                    void savePermissions()
                }
              >

                {
                  saving
                    ? (
                        <Loader2
                          size={15}
                          className="role-permission-spin"
                        />
                      )
                    : (
                        <Save
                          size={15}
                        />
                      )
                }

                Save Permissions

              </button>

            </div>

          </div>
        )
      }

    </section>
  );
}