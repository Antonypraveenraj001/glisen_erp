"use strict";

const byId = (id) => document.getElementById(id);
const loginForm = byId("loginForm");
const passwordForm = byId("passwordForm");
const companyForm = byId("companyForm");
const authenticated = byId("authenticated");
const notice = byId("notice");
let offset = 0;
let editingCompany = null;
let companyRows = [];

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

function showTab(tab) {
  const security = tab === "security";
  byId("companiesPanel").hidden = security;
  byId("securityPanel").hidden = !security;
  byId("companiesTab").setAttribute("aria-pressed", String(!security));
  byId("securityTab").setAttribute("aria-pressed", String(security));
  byId("companiesTab").className = security ? "tab secondary" : "tab";
  byId("securityTab").className = security ? "tab" : "tab secondary";
  byId("heading").textContent = security ? "Owner security" : "Company management";
}

function renderSession(data) {
  const signedIn = !!data?.authenticated;
  loginForm.hidden = signedIn;
  authenticated.hidden = !signedIn;
  byId("layout").classList.toggle("wide", signedIn);
  byId("heading").textContent = signedIn ? "Company management" : "Owner sign in";
  byId("intro").textContent = signedIn
    ? "Register and manage companies in the independent CASTLE owner directory."
    : "Sign in to the owner-only service. Company Boss and Admin accounts cannot sign in here.";
  byId("signedInEmail").textContent = signedIn ? (data.email || "") : "";
  if (signedIn) { showTab("companies"); loadCompanies().catch((error) => showNotice(error.message)); }
  else { companyRows = []; editingCompany = null; companyForm.reset(); }
}

async function api(path, method = "GET", payload = null) {
  const headers = { Accept: "application/json" };
  if (payload !== null) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = csrfCookie();
  const response = await fetch(`/api/owner/${path}`, {
    method, headers, credentials: "same-origin",
    body: payload === null ? undefined : JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result.detail;
    const message = Array.isArray(detail) ? detail.map(x => x.msg).join("; ") : detail;
    throw new Error(typeof message === "string" ? message : `Request failed (${response.status})`);
  }
  return result;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function actionButton(title, handler) {
  const button = element("button", title, "secondary");
  button.type = "button";
  button.addEventListener("click", () => {
    Promise.resolve().then(handler).catch(error => showNotice(error.message));
  });
  return button;
}

function renderCompanies(data) {
  const list = byId("companyList");
  list.replaceChildren();
  companyRows = data.items;
  for (const company of data.items) {
    const card = element("article", undefined, "company-card");
    card.setAttribute("role", "listitem");
    card.appendChild(element("h3", company.legal_name));
    card.appendChild(element("span", company.status.replaceAll("_", " "), `company-status ${company.status}`));
    const info = element("div", `${company.slug}  ·  GSTIN: ${company.gstin || "Not provided"}  ·  Boss: ${company.boss_email}`, "meta");
    card.appendChild(info);
    const buttons = element("div", undefined, "buttons");
    buttons.appendChild(actionButton("Edit", () => editCompany(company)));
    buttons.appendChild(actionButton("History", () => loadHistory(company)));
    if (company.status === "PENDING_SETUP") {
      buttons.appendChild(actionButton("Hold onboarding", () => changeOnboarding(company, "hold")));
    }
    if (company.status === "ON_HOLD") {
      buttons.appendChild(actionButton("Resume onboarding", () => changeOnboarding(company, "resume")));
    }
    card.appendChild(buttons);
    list.appendChild(card);
  }
  if (!data.items.length) list.appendChild(element("p", "No companies registered on this page.", "info"));
  byId("companiesPageLabel").textContent = `${data.total ? offset + 1 : 0}–${offset + data.items.length} of ${data.total}`;
  byId("previousCompanies").disabled = offset === 0;
  byId("nextCompanies").disabled = offset + data.items.length >= data.total;
}

async function loadCompanies() {
  const data = await api(`companies?offset=${offset}&limit=20`);
  renderCompanies(data);
}

async function loadHistory(company) {
  const result = await api(`companies/${company.id}/history`);
  const section = byId("companyHistory");
  section.replaceChildren();
  for (const item of result.items) {
    section.appendChild(element("div", `${item.created_at}: ${item.event_type} — ${item.message}`));
  }
  if (!result.items.length) section.appendChild(element("p", "No recorded actions."));
  byId("historyHeading").textContent = `Recent actions: ${company.legal_name}`;
  section.hidden = false;
  byId("historyHeading").hidden = false;
}

function editCompany(company) {
  editingCompany = company.id;
  byId("companySlug").value = company.slug;
  byId("companySlug").readOnly = true;
  byId("companyName").value = company.legal_name;
  byId("companyGstin").value = company.gstin || "";
  byId("bossEmail").value = company.boss_email;
  byId("recoveryEmail").value = company.recovery_email || "";
  byId("saveCompanyButton").textContent = "Save company details";
  byId("cancelEditButton").hidden = false;
  companyForm.scrollIntoView({behavior: "smooth", block: "start"});
}

function cancelEdit() {
  editingCompany = null;
  companyForm.reset();
  byId("companySlug").readOnly = false;
  byId("saveCompanyButton").textContent = "Register company";
  byId("cancelEditButton").hidden = true;
}

async function changeOnboarding(company, action) {
  const verb = action === "hold" ? "hold" : "resume";
  if (!confirm(`${verb === "hold" ? "Hold" : "Resume"} onboarding for ${company.legal_name}? This does NOT change customer ERP access.`)) return;
  await api(`companies/${company.id}/${action}`, "POST");
  showNotice("Onboarding registration updated. No ERP access was changed.", true);
  await loadCompanies();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = byId("loginButton");
  button.disabled = true;
  showNotice("");
  try {
    const result = await api("auth/login", "POST", {
      email: byId("email").value, password: byId("password").value,
    });
    byId("password").value = "";
    renderSession(result);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

companyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showNotice("");
  const payload = {
    legal_name: byId("companyName").value.trim(),
    gstin: byId("companyGstin").value.trim() || null,
    boss_email: byId("bossEmail").value.trim(),
    recovery_email: byId("recoveryEmail").value.trim() || null,
  };
  const button = byId("saveCompanyButton");
  button.disabled = true;
  try {
    if (editingCompany === null) {
      payload.slug = byId("companySlug").value.trim();
      await api("companies", "POST", payload);
    } else {
      await api(`companies/${editingCompany}`, "PUT", payload);
    }
    showNotice("Company registration saved. No customer ERP was provisioned or activated.", true);
    cancelEdit();
    offset = 0;
    await loadCompanies();
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showNotice("");
  try {
    const result = await api("auth/change-password", "POST", {
      current_password: byId("currentPassword").value,
      new_password: byId("newPassword").value,
    });
    passwordForm.reset();
    renderSession(result);
    showNotice("Password updated. Please sign in again.", true);
  } catch (error) { showNotice(error.message); }
});

byId("companiesTab").addEventListener("click", () => showTab("companies"));
byId("securityTab").addEventListener("click", () => showTab("security"));
byId("cancelEditButton").addEventListener("click", cancelEdit);
byId("refreshCompanies").addEventListener("click", () => loadCompanies().catch(error => showNotice(error.message)));
byId("previousCompanies").addEventListener("click", () => {offset = Math.max(0, offset - 20);loadCompanies().catch(error => showNotice(error.message));});
byId("nextCompanies").addEventListener("click", () => {offset += 20;loadCompanies().catch(error => showNotice(error.message));});
byId("logoutButton").addEventListener("click", async () => {
  showNotice("");
  try { renderSession(await api("auth/logout", "POST")); }
  catch (error) { showNotice(error.message); }
});

api("auth/me").then(renderSession).catch(() => renderSession({ authenticated: false }));
