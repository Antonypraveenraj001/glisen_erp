import axios from "axios";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  CheckCircle2,
  Edit3,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import "./UserSecuritySettings.css";

import {
  createManagedUser,
  getManagedRoles,
  getManagedUsers,
  resetManagedUserPassword,
  setManagedUserStatus,
  updateManagedUser,
} from "../../services/userManagementService";

import {
  useAuth,
} from "../../context/AuthContext";

import type {
  CreateManagedUserPayload,
  ManagedRole,
  ManagedUser,
  UpdateManagedUserPayload,
} from "../../types/userManagement";


interface UserFormState {
  full_name: string;
  username: string;
  email: string;
  role_id: string;
  password: string;
  confirm_password: string;
}


interface ResetPasswordState {
  new_password: string;
  confirm_password: string;
}


interface Notice {
  type:
    | "success"
    | "error";

  text: string;
}


/* ================================================================
   EMPTY FORMS
================================================================ */

function createEmptyUserForm():
UserFormState {

  return {
    full_name: "",
    username: "",
    email: "",
    role_id: "",
    password: "",
    confirm_password: "",
  };
}


function createEmptyResetPassword():
ResetPasswordState {

  return {
    new_password: "",
    confirm_password: "",
  };
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


function formatDateTime(
  value:
    string | null | undefined
) {

  if (!value) {
    return "Never";
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
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


function validatePassword(
  password: string
):
string | null {

  if (
    password.length < 8
  ) {
    return (
      "Password must contain at least 8 characters."
    );
  }


  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return (
      "Password must contain at least one lowercase letter."
    );
  }


  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return (
      "Password must contain at least one uppercase letter."
    );
  }


  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return (
      "Password must contain at least one number."
    );
  }


  return null;
}


/* ================================================================
   PAGE
================================================================ */

export default function UsersAccessSettings() {

  const {
    user:
      currentUser,
  } =
    useAuth();


  const isBoss =
    currentUser
      ?.role
    === "Boss";


  const isAdmin =
    currentUser
      ?.role
    === "Admin";


  const canManageUsers =
    isBoss
    ||
    isAdmin;


  const [
    users,
    setUsers,
  ] =
    useState<
      ManagedUser[]
    >(
      []
    );


  const [
    roles,
    setRoles,
  ] =
    useState<
      ManagedRole[]
    >(
      []
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
     USER MODAL
  ============================================================== */

  const [
    userModalOpen,
    setUserModalOpen,
  ] =
    useState(
      false
    );


  const [
    editingUser,
    setEditingUser,
  ] =
    useState<
      ManagedUser | null
    >(
      null
    );


  const [
    userForm,
    setUserForm,
  ] =
    useState<
      UserFormState
    >(
      createEmptyUserForm()
    );


  const [
    userSaving,
    setUserSaving,
  ] =
    useState(
      false
    );


  const [
    userFormError,
    setUserFormError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     RESET PASSWORD MODAL
  ============================================================== */

  const [
    resetUser,
    setResetUser,
  ] =
    useState<
      ManagedUser | null
    >(
      null
    );


  const [
    resetPasswordForm,
    setResetPasswordForm,
  ] =
    useState<
      ResetPasswordState
    >(
      createEmptyResetPassword()
    );


  const [
    resettingPassword,
    setResettingPassword,
  ] =
    useState(
      false
    );


  const [
    resetPasswordError,
    setResetPasswordError,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    changingStatusUserId,
    setChangingStatusUserId,
  ] =
    useState<
      number | null
    >(
      null
    );


  /* ==============================================================
     ROLE VISIBILITY
  ============================================================== */

  const selectableRoles =
    useMemo(
      () => {

        if (
          isBoss
        ) {
          return roles;
        }


        return (
          roles.filter(
            role =>
              role.name
              !== "Boss"
          )
        );

      },
      [
        roles,
        isBoss,
      ]
    );


  const activeUsers =
    useMemo(
      () =>
        users.filter(
          item =>
            item.is_active
        ),
      [
        users,
      ]
    );


  const inactiveUsers =
    useMemo(
      () =>
        users.filter(
          item =>
            !item.is_active
        ),
      [
        users,
      ]
    );


  /* ==============================================================
     LOAD
  ============================================================== */

  async function loadData() {

    if (
      !canManageUsers
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


      const [
        userData,
        roleData,
      ] =
        await Promise.all([
          getManagedUsers(),
          getManagedRoles(),
        ]);


      setUsers(
        userData
      );


      setRoles(
        roleData
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
            "Unable to load users and roles."
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

      void loadData();

    },
    []
  );


  /* ==============================================================
     MODAL
  ============================================================== */

  function openCreateUser() {

    const firstRole =
      selectableRoles[
        0
      ];


    setEditingUser(
      null
    );


    setUserForm({
      ...createEmptyUserForm(),

      role_id:
        firstRole
          ? String(
              firstRole.id
            )
          : "",
    });


    setUserFormError(
      null
    );


    setUserModalOpen(
      true
    );

  }


  function openEditUser(
    managedUser:
      ManagedUser
  ) {

    setEditingUser(
      managedUser
    );


    setUserForm({
      full_name:
        managedUser.full_name,

      username:
        managedUser.username,

      email:
        managedUser.email,

      role_id:
        String(
          managedUser.role_id
        ),

      password:
        "",

      confirm_password:
        "",
    });


    setUserFormError(
      null
    );


    setUserModalOpen(
      true
    );

  }


  function closeUserModal() {

    if (
      userSaving
    ) {
      return;
    }


    setUserModalOpen(
      false
    );


    setEditingUser(
      null
    );


    setUserForm(
      createEmptyUserForm()
    );


    setUserFormError(
      null
    );

  }


  function updateUserField(
    field:
      keyof UserFormState,
    value: string
  ) {

    setUserForm(
      current => ({
        ...current,

        [field]:
          value,
      })
    );

  }


  /* ==============================================================
     SAVE USER
  ============================================================== */

  async function handleSaveUser(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !canManageUsers
    ) {
      return;
    }


    setUserFormError(
      null
    );


    if (
      !userForm
        .full_name
        .trim()
    ) {

      setUserFormError(
        "Full Name is required."
      );

      return;
    }


    if (
      !userForm
        .username
        .trim()
    ) {

      setUserFormError(
        "Username is required."
      );

      return;
    }


    if (
      !userForm
        .email
        .trim()
    ) {

      setUserFormError(
        "Email is required."
      );

      return;
    }


    const roleId =
      Number(
        userForm.role_id
      );


    if (
      !Number.isInteger(
        roleId
      )
    ) {

      setUserFormError(
        "Select a valid role."
      );

      return;
    }


    try {

      setUserSaving(
        true
      );


      if (
        editingUser
      ) {

        const payload:
          UpdateManagedUserPayload =
          {
            full_name:
              userForm
                .full_name
                .trim(),

            username:
              userForm
                .username
                .trim()
                .toLowerCase(),

            email:
              userForm
                .email
                .trim()
                .toLowerCase(),

            role_id:
              roleId,
          };


        await updateManagedUser(
          editingUser.id,
          payload
        );


        setNotice({
          type:
            "success",

          text:
            "User updated successfully.",
        });

      } else {

        const passwordError =
          validatePassword(
            userForm.password
          );


        if (
          passwordError
        ) {

          setUserFormError(
            passwordError
          );

          return;
        }


        if (
          userForm.password
          !==
          userForm.confirm_password
        ) {

          setUserFormError(
            "Passwords do not match."
          );

          return;
        }


        const payload:
          CreateManagedUserPayload =
          {
            full_name:
              userForm
                .full_name
                .trim(),

            username:
              userForm
                .username
                .trim()
                .toLowerCase(),

            email:
              userForm
                .email
                .trim()
                .toLowerCase(),

            password:
              userForm.password,

            role_id:
              roleId,
          };


        await createManagedUser(
          payload
        );


        setNotice({
          type:
            "success",

          text:
            "User created successfully.",
        });

      }


      closeUserModal();


      await loadData();

    } catch (
      error
    ) {

      console.error(
        error
      );


      setUserFormError(
        getApiErrorMessage(
          error,
          editingUser
            ? "Unable to update user."
            : "Unable to create user."
        )
      );

    } finally {

      setUserSaving(
        false
      );

    }

  }


  /* ==============================================================
     STATUS
  ============================================================== */

  async function toggleUserStatus(
    managedUser:
      ManagedUser
  ) {

    const nextStatus =
      !managedUser.is_active;


    const action =
      nextStatus
        ? "activate"
        : "deactivate";


    const confirmed =
      window.confirm(
        `${action === "activate" ? "Activate" : "Deactivate"} `
        + `${managedUser.full_name}?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setChangingStatusUserId(
        managedUser.id
      );


      setNotice(
        null
      );


      await setManagedUserStatus(
        managedUser.id,
        nextStatus
      );


      await loadData();


      setNotice({
        type:
          "success",

        text:
          `User ${action}d successfully.`,
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
            `Unable to ${action} user.`
          ),
      });

    } finally {

      setChangingStatusUserId(
        null
      );

    }

  }


  /* ==============================================================
     RESET PASSWORD
  ============================================================== */

  function openResetPassword(
    managedUser:
      ManagedUser
  ) {

    setResetUser(
      managedUser
    );


    setResetPasswordForm(
      createEmptyResetPassword()
    );


    setResetPasswordError(
      null
    );

  }


  function closeResetPassword() {

    if (
      resettingPassword
    ) {
      return;
    }


    setResetUser(
      null
    );


    setResetPasswordForm(
      createEmptyResetPassword()
    );


    setResetPasswordError(
      null
    );

  }


  async function handleResetPassword(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !resetUser
    ) {
      return;
    }


    const passwordError =
      validatePassword(
        resetPasswordForm
          .new_password
      );


    if (
      passwordError
    ) {

      setResetPasswordError(
        passwordError
      );

      return;
    }


    if (
      resetPasswordForm
        .new_password
      !==
      resetPasswordForm
        .confirm_password
    ) {

      setResetPasswordError(
        "Passwords do not match."
      );

      return;
    }


    try {

      setResettingPassword(
        true
      );


      setResetPasswordError(
        null
      );


      await resetManagedUserPassword(
        resetUser.id,
        {
          new_password:
            resetPasswordForm
              .new_password,
        }
      );


      closeResetPassword();


      setNotice({
        type:
          "success",

        text:
          `Password reset for ${resetUser.full_name}.`,
      });

    } catch (
      error
    ) {

      console.error(
        error
      );


      setResetPasswordError(
        getApiErrorMessage(
          error,
          "Unable to reset password."
        )
      );

    } finally {

      setResettingPassword(
        false
      );

    }

  }


  /* ==============================================================
     MANAGEABILITY
  ============================================================== */

  function canManageTarget(
    target:
      ManagedUser
  ) {

    if (
      isBoss
    ) {
      return true;
    }


    return (
      target.role
      !== "Boss"
    );

  }


  /* ==============================================================
     ACCESS BLOCK
  ============================================================== */

  if (
    !canManageUsers
  ) {

    return (
      <div className="settings-security-no-access">

        <ShieldCheck
          size={24}
        />

        <div>

          <h2>
            Users & Access
          </h2>

          <p>
            Only Boss and Admin users can manage ERP user accounts.
          </p>

        </div>

      </div>
    );

  }


  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {

    return (
      <div className="settings-security-loading">

        <Loader2
          size={20}
          className="settings-security-spin"
        />

        Loading users and roles...

      </div>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <>

      <div className="settings-security-heading">

        <div>

          <h2>
            Users & Access
          </h2>

          <p>
            Create ERP users, assign roles and control whether
            individual accounts can sign in.
          </p>

        </div>


        <div className="settings-security-heading-actions">

          <button
            type="button"
            className="settings-security-secondary"
            onClick={
              () =>
                void loadData()
            }
          >

            <RefreshCw
              size={15}
            />

            Refresh

          </button>


          <button
            type="button"
            className="settings-security-primary"
            onClick={
              openCreateUser
            }
          >

            <UserPlus
              size={15}
            />

            Add User

          </button>

        </div>

      </div>


      {
        notice
        &&
        (
          <div
            className={
              `settings-security-notice ${notice.type}`
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
          KPI
      ========================================================== */}

      <div className="settings-user-kpis">

        <div>

          <span>
            Total Users
          </span>

          <strong>
            {users.length}
          </strong>

          <small>
            All ERP accounts
          </small>

        </div>


        <div>

          <span>
            Active
          </span>

          <strong>
            {activeUsers.length}
          </strong>

          <small>
            Can sign in
          </small>

        </div>


        <div>

          <span>
            Inactive
          </span>

          <strong>
            {inactiveUsers.length}
          </strong>

          <small>
            Sign-in blocked
          </small>

        </div>


        <div>

          <span>
            Roles
          </span>

          <strong>
            {roles.length}
          </strong>

          <small>
            Active system roles
          </small>

        </div>

      </div>


      {/* =========================================================
          USERS TABLE
      ========================================================== */}

      <section className="settings-security-card">

        <div className="settings-security-card-header">

          <div className="settings-security-card-icon">

            <Users
              size={18}
            />

          </div>


          <div>

            <h3>
              User Accounts
            </h3>

            <p>
              Boss accounts are protected from Admin modification.
            </p>

          </div>

        </div>


        <div className="settings-user-table-wrap">

          <table className="settings-user-table">

            <thead>

              <tr>

                <th>
                  USER
                </th>

                <th>
                  LOGIN
                </th>

                <th>
                  ROLE
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  LAST LOGIN
                </th>

                <th>
                  ACTION
                </th>

              </tr>

            </thead>


            <tbody>

              {
                users.map(
                  managedUser => {

                    const isCurrent =
                      managedUser.id
                      === currentUser?.id;


                    const manageable =
                      canManageTarget(
                        managedUser
                      );


                    return (
                      <tr
                        key={
                          managedUser.id
                        }
                      >

                        <td>

                          <div className="settings-user-name-cell">

                            <div className="settings-user-avatar-small">
                              {
                                managedUser.full_name
                                  .trim()
                                  .slice(
                                    0,
                                    1
                                  )
                                  .toUpperCase()
                              }
                            </div>


                            <div>

                              <strong>
                                {managedUser.full_name}
                              </strong>

                              <span>
                                {
                                  isCurrent
                                    ? "Current user"
                                    : `Created ${formatDateTime(
                                        managedUser.created_at
                                      )}`
                                }
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>

                          <div className="settings-user-login-cell">

                            <strong>
                              {managedUser.username}
                            </strong>

                            <span>
                              {managedUser.email}
                            </span>

                          </div>

                        </td>


                        <td>

                          <span
                            className={
                              `settings-role-badge ${
                                managedUser.role
                                  .toLowerCase()
                                  .replaceAll(
                                    " ",
                                    "-"
                                  )
                              }`
                            }
                          >

                            {managedUser.role}

                          </span>

                        </td>


                        <td>

                          <span
                            className={
                              managedUser.is_active
                                ? "settings-user-status active"
                                : "settings-user-status inactive"
                            }
                          >

                            {
                              managedUser.is_active
                                ? "Active"
                                : "Inactive"
                            }

                          </span>

                        </td>


                        <td>
                          {
                            formatDateTime(
                              managedUser.last_login
                            )
                          }
                        </td>


                        <td>

                          <div className="settings-user-actions">

                            <button
                              type="button"
                              title="Edit user"
                              disabled={
                                !manageable
                              }
                              onClick={
                                () =>
                                  openEditUser(
                                    managedUser
                                  )
                              }
                            >

                              <Edit3
                                size={14}
                              />

                            </button>


                            <button
                              type="button"
                              title="Reset password"
                              disabled={
                                !manageable
                                ||
                                isCurrent
                              }
                              onClick={
                                () =>
                                  openResetPassword(
                                    managedUser
                                  )
                              }
                            >

                              <KeyRound
                                size={14}
                              />

                            </button>


                            <button
                              type="button"
                              title={
                                managedUser.is_active
                                  ? "Deactivate user"
                                  : "Activate user"
                              }
                              disabled={
                                !manageable
                                ||
                                isCurrent
                                ||
                                changingStatusUserId
                                === managedUser.id
                              }
                              onClick={
                                () =>
                                  void toggleUserStatus(
                                    managedUser
                                  )
                              }
                            >

                              {
                                changingStatusUserId
                                === managedUser.id
                                  ? (
                                      <Loader2
                                        size={14}
                                        className="settings-security-spin"
                                      />
                                    )
                                  : managedUser.is_active
                                    ? (
                                        <Power
                                          size={14}
                                        />
                                      )
                                    : (
                                        <UserCheck
                                          size={14}
                                        />
                                      )
                              }

                            </button>

                          </div>

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


      {/* =========================================================
          ROLE INFORMATION
      ========================================================== */}

      <section className="settings-security-card">

        <div className="settings-security-card-header">

          <div className="settings-security-card-icon lavender">

            <ShieldCheck
              size={18}
            />

          </div>


          <div>

            <h3>
              System Roles
            </h3>

            <p>
              Existing Glisen ERP roles are preserved.
            </p>

          </div>

        </div>


        <div className="settings-role-grid">

          {
            roles.map(
              role => (
                <div
                  key={
                    role.id
                  }
                  className="settings-role-card"
                >

                  <strong>
                    {role.name}
                  </strong>

                  <span>
                    {
                      role.description
                      ||
                      `${role.name} Role`
                    }
                  </span>

                  {
                    role.name
                    === "Boss"
                    &&
                    (
                      <small>
                        Full access · protected
                      </small>
                    )
                  }

                </div>
              )
            )
          }

        </div>


        <div className="settings-security-info-box">

          <strong>
            Permission Matrix
          </strong>

          <span>
            The roles and user accounts are now managed here.
            The next access-control stage will connect the existing
            permission table to every ERP module before exposing
            editable role permissions. We will not display a fake
            permission matrix that only controls part of the app.
          </span>

        </div>

      </section>


      {/* =========================================================
          USER CREATE / EDIT MODAL
      ========================================================== */}

      {
        userModalOpen
        &&
        (
          <div className="settings-security-modal-backdrop">

            <div className="settings-security-modal">

              <div className="settings-security-modal-header">

                <div>

                  <span>
                    USER MANAGEMENT
                  </span>

                  <h3>
                    {
                      editingUser
                        ? "Edit User"
                        : "Create User"
                    }
                  </h3>

                  <p>
                    {
                      editingUser
                        ? "Update account identity and assigned role."
                        : "Create a new account for Glisen ERP."
                    }
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    userSaving
                  }
                  onClick={
                    closeUserModal
                  }
                >

                  <X
                    size={17}
                  />

                </button>

              </div>


              <form
                className="settings-security-form"
                onSubmit={
                  handleSaveUser
                }
              >

                {
                  userFormError
                  &&
                  (
                    <div className="settings-security-form-error">
                      {userFormError}
                    </div>
                  )
                }


                <div className="settings-security-form-grid">

                  <label>

                    <span>
                      Full Name *
                    </span>

                    <input
                      value={
                        userForm.full_name
                      }
                      onChange={
                        event =>
                          updateUserField(
                            "full_name",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Username *
                    </span>

                    <input
                      value={
                        userForm.username
                      }
                      onChange={
                        event =>
                          updateUserField(
                            "username",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Email *
                    </span>

                    <input
                      type="email"
                      value={
                        userForm.email
                      }
                      onChange={
                        event =>
                          updateUserField(
                            "email",
                            event.target.value
                          )
                      }
                    />

                    <small>
                      This email is currently used for ERP login.
                    </small>

                  </label>


                  <label>

                    <span>
                      Role *
                    </span>

                    <select
                      value={
                        userForm.role_id
                      }
                      disabled={
                        editingUser
                          ?.id
                        === currentUser?.id
                      }
                      onChange={
                        event =>
                          updateUserField(
                            "role_id",
                            event.target.value
                          )
                      }
                    >

                      <option value="">
                        Select Role
                      </option>

                      {
                        selectableRoles.map(
                          role => (
                            <option
                              key={
                                role.id
                              }
                              value={
                                role.id
                              }
                            >
                              {role.name}
                            </option>
                          )
                        )
                      }

                    </select>


                    {
                      editingUser
                        ?.id
                      === currentUser?.id
                      &&
                      (
                        <small>
                          You cannot change your own role.
                        </small>
                      )
                    }

                  </label>


                  {
                    !editingUser
                    &&
                    (
                      <>

                        <label>

                          <span>
                            Password *
                          </span>

                          <input
                            type="password"
                            value={
                              userForm.password
                            }
                            onChange={
                              event =>
                                updateUserField(
                                  "password",
                                  event.target.value
                                )
                            }
                          />

                        </label>


                        <label>

                          <span>
                            Confirm Password *
                          </span>

                          <input
                            type="password"
                            value={
                              userForm.confirm_password
                            }
                            onChange={
                              event =>
                                updateUserField(
                                  "confirm_password",
                                  event.target.value
                                )
                            }
                          />

                        </label>

                      </>
                    )
                  }

                </div>


                {
                  !editingUser
                  &&
                  (
                    <div className="settings-password-rule-box">

                      Password must contain at least 8 characters,
                      one uppercase letter, one lowercase letter
                      and one number.

                    </div>
                  )
                }


                <div className="settings-security-form-actions">

                  <button
                    type="button"
                    className="settings-security-secondary"
                    disabled={
                      userSaving
                    }
                    onClick={
                      closeUserModal
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="settings-security-primary"
                    disabled={
                      userSaving
                    }
                  >

                    {
                      userSaving
                        ? (
                            <Loader2
                              size={15}
                              className="settings-security-spin"
                            />
                          )
                        : (
                            <Plus
                              size={15}
                            />
                          )
                    }

                    {
                      editingUser
                        ? "Save User"
                        : "Create User"
                    }

                  </button>

                </div>

              </form>

            </div>

          </div>
        )
      }


      {/* =========================================================
          RESET PASSWORD MODAL
      ========================================================== */}

      {
        resetUser
        &&
        (
          <div className="settings-security-modal-backdrop">

            <div className="settings-security-modal settings-password-modal">

              <div className="settings-security-modal-header">

                <div>

                  <span>
                    SECURITY
                  </span>

                  <h3>
                    Reset Password
                  </h3>

                  <p>
                    {
                      `Set a new password for ${resetUser.full_name}.`
                    }
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    resettingPassword
                  }
                  onClick={
                    closeResetPassword
                  }
                >

                  <X
                    size={17}
                  />

                </button>

              </div>


              <form
                className="settings-security-form"
                onSubmit={
                  handleResetPassword
                }
              >

                {
                  resetPasswordError
                  &&
                  (
                    <div className="settings-security-form-error">
                      {resetPasswordError}
                    </div>
                  )
                }


                <div className="settings-security-form-grid">

                  <label>

                    <span>
                      New Password
                    </span>

                    <input
                      type="password"
                      value={
                        resetPasswordForm
                          .new_password
                      }
                      onChange={
                        event =>
                          setResetPasswordForm(
                            current => ({
                              ...current,

                              new_password:
                                event.target.value,
                            })
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Confirm Password
                    </span>

                    <input
                      type="password"
                      value={
                        resetPasswordForm
                          .confirm_password
                      }
                      onChange={
                        event =>
                          setResetPasswordForm(
                            current => ({
                              ...current,

                              confirm_password:
                                event.target.value,
                            })
                          )
                      }
                    />

                  </label>

                </div>


                <div className="settings-password-rule-box">

                  The user can immediately sign in with the new password
                  after the reset succeeds.

                </div>


                <div className="settings-security-form-actions">

                  <button
                    type="button"
                    className="settings-security-secondary"
                    disabled={
                      resettingPassword
                    }
                    onClick={
                      closeResetPassword
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="settings-security-primary"
                    disabled={
                      resettingPassword
                    }
                  >

                    {
                      resettingPassword
                        ? (
                            <Loader2
                              size={15}
                              className="settings-security-spin"
                            />
                          )
                        : (
                            <KeyRound
                              size={15}
                            />
                          )
                    }

                    Reset Password

                  </button>

                </div>

              </form>

            </div>

          </div>
        )
      }

    </>
  );
}