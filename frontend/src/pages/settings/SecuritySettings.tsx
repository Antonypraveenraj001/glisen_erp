import axios from "axios";

import {
  useState,
  type FormEvent,
} from "react";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import "./UserSecuritySettings.css";

import {
  changeMyPassword,
} from "../../services/userManagementService";

import {
  useAuth,
} from "../../context/AuthContext";


interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}


interface Notice {
  type:
    | "success"
    | "error";

  text: string;
}


function createEmptyForm():
PasswordForm {

  return {
    current_password: "",
    new_password: "",
    confirm_password: "",
  };
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


export default function SecuritySettings() {

  const {
    user,
  } =
    useAuth();


  const [
    form,
    setForm,
  ] =
    useState<
      PasswordForm
    >(
      createEmptyForm()
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


  function updateField(
    field:
      keyof PasswordForm,
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
      FormEvent
  ) {

    event.preventDefault();


    setNotice(
      null
    );


    if (
      !form.current_password
    ) {

      setNotice({
        type:
          "error",

        text:
          "Enter your current password.",
      });

      return;
    }


    const passwordError =
      validatePassword(
        form.new_password
      );


    if (
      passwordError
    ) {

      setNotice({
        type:
          "error",

        text:
          passwordError,
      });

      return;
    }


    if (
      form.new_password
      !==
      form.confirm_password
    ) {

      setNotice({
        type:
          "error",

        text:
          "New passwords do not match.",
      });

      return;
    }


    if (
      form.current_password
      ===
      form.new_password
    ) {

      setNotice({
        type:
          "error",

        text:
          "New password must be different from the current password.",
      });

      return;
    }


    try {

      setSaving(
        true
      );


      const response =
        await changeMyPassword({
          current_password:
            form.current_password,

          new_password:
            form.new_password,
        });


      setForm(
        createEmptyForm()
      );


      setNotice({
        type:
          "success",

        text:
          response.message,
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
            "Unable to change password."
          ),
      });

    } finally {

      setSaving(
        false
      );

    }

  }


  return (
    <>

      <div className="settings-security-heading">

        <div>

          <h2>
            Security
          </h2>

          <p>
            Manage your own password and review account-security rules.
          </p>

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


      <section className="settings-security-card">

        <div className="settings-security-card-header">

          <div className="settings-security-card-icon">

            <LockKeyhole
              size={18}
            />

          </div>


          <div>

            <h3>
              Change My Password
            </h3>

            <p>
              Signed in as {user?.full_name || user?.username}.
            </p>

          </div>

        </div>


        <form
          className="settings-password-form"
          onSubmit={
            handleSubmit
          }
        >

          <label>

            <span>
              Current Password
            </span>

            <input
              type="password"
              autoComplete="current-password"
              value={
                form.current_password
              }
              onChange={
                event =>
                  updateField(
                    "current_password",
                    event.target.value
                  )
              }
            />

          </label>


          <label>

            <span>
              New Password
            </span>

            <input
              type="password"
              autoComplete="new-password"
              value={
                form.new_password
              }
              onChange={
                event =>
                  updateField(
                    "new_password",
                    event.target.value
                  )
              }
            />

          </label>


          <label>

            <span>
              Confirm New Password
            </span>

            <input
              type="password"
              autoComplete="new-password"
              value={
                form.confirm_password
              }
              onChange={
                event =>
                  updateField(
                    "confirm_password",
                    event.target.value
                  )
              }
            />

          </label>


          <div className="settings-password-rule-box">

            Password must contain at least 8 characters,
            one uppercase letter, one lowercase letter and one number.

          </div>


          <div className="settings-security-form-actions">

            <button
              type="submit"
              className="settings-security-primary"
              disabled={
                saving
              }
            >

              {
                saving
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

              Change Password

            </button>

          </div>

        </form>

      </section>


      <section className="settings-security-card">

        <div className="settings-security-card-header">

          <div className="settings-security-card-icon lavender">

            <ShieldCheck
              size={18}
            />

          </div>


          <div>

            <h3>
              Account Protection
            </h3>

            <p>
              Security protections enforced by the backend.
            </p>

          </div>

        </div>


        <div className="settings-security-rules">

          <div>

            <CheckCircle2
              size={15}
            />

            <span>
              Users cannot deactivate their own account.
            </span>

          </div>


          <div>

            <CheckCircle2
              size={15}
            />

            <span>
              Users cannot change their own role.
            </span>

          </div>


          <div>

            <CheckCircle2
              size={15}
            />

            <span>
              Admin cannot create, edit or reset a Boss account.
            </span>

          </div>


          <div>

            <CheckCircle2
              size={15}
            />

            <span>
              The final active Boss cannot be deactivated or demoted.
            </span>

          </div>


          <div>

            <CheckCircle2
              size={15}
            />

            <span>
              Password resets for other users are performed from Users & Access.
            </span>

          </div>

        </div>

      </section>

    </>
  );
}