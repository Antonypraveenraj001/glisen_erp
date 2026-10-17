"use strict";

const byId = (id) => document.getElementById(id);
const loginForm = byId("loginForm");
const passwordForm = byId("passwordForm");
const authenticated = byId("authenticated");
const notice = byId("notice");

function csrfCookie() {
  const entry = document.cookie.split("; ").find((x) =>
    x.startsWith("castle_owner_dev_csrf=") || x.startsWith("__Host-castle_owner_csrf=")
  );
  return entry ? decodeURIComponent(entry.substring(entry.indexOf("=") + 1)) : "";
}

function showNotice(message, good = false) {
  notice.textContent = message;
  notice.className = good ? "notice good" : "notice";
  notice.hidden = !message;
}

function renderSession(data) {
  const signedIn = !!data?.authenticated;
  loginForm.hidden = signedIn;
  authenticated.hidden = !signedIn;
  byId("heading").textContent = signedIn ? "Owner security" : "Owner sign in";
  byId("intro").textContent = signedIn
    ? "You are authenticated in the independent CASTLE Platform Owner service."
    : "Sign in to the owner-only service. Company Boss and Admin accounts cannot sign in here.";
  byId("signedInEmail").textContent = signedIn ? (data.email || "") : "";
}

async function api(path, method = "GET", payload = null) {
  const headers = { Accept: "application/json" };
  if (payload !== null) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = csrfCookie();
  const response = await fetch(`/api/owner/auth/${path}`, {
    method, headers, credentials: "same-origin",
    body: payload === null ? undefined : JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || `Request failed (${response.status})`);
  return result;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = byId("loginButton");
  button.disabled = true;
  showNotice("");
  try {
    const result = await api("login", "POST", {
      email: byId("email").value, password: byId("password").value,
    });
    byId("password").value = "";
    renderSession(result);
  } catch (error) {
    showNotice(error.message);
  } finally { button.disabled = false; }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showNotice("");
  try {
    const result = await api("change-password", "POST", {
      current_password: byId("currentPassword").value,
      new_password: byId("newPassword").value,
    });
    passwordForm.reset();
    renderSession(result);
    showNotice("Password updated. Please sign in again.", true);
  } catch (error) { showNotice(error.message); }
});

byId("logoutButton").addEventListener("click", async () => {
  showNotice("");
  try { renderSession(await api("logout", "POST")); }
  catch (error) { showNotice(error.message); }
});

api("me").then(renderSession).catch(() => renderSession({ authenticated: false }));
