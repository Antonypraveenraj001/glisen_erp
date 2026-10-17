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
let selectedLicenseCompany = null;
let selectedRecoveryCompany = null;
let selectedRecoveryCase = null;

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
  else { companyRows = []; editingCompany = null; selectedLicenseCompany = null; byId("licensePanel").hidden = true; selectedRecoveryCompany = null; selectedRecoveryCase = null; byId("recoveryPanel").hidden = true; byId("recoveryReviewPanel").hidden = true; companyForm.reset(); }
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
    buttons.appendChild(actionButton("Manage license", () => openLicense(company)));
    buttons.appendChild(actionButton("Boss recovery", () => openRecovery(company)));
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

function licenseStatusText(item) {
  const state = item.subscription_status.replaceAll("_", " ");
  const last = item.last_paid_term;
  const fee = item.price_inr ? `INR ${item.price_inr}` : "Not configured";
  return `${state} · ${item.plan || "No plan"} · Price ${fee} · Latest paid end (exclusive): ${last ? last.expires_on : "None"} · Grace ends: ${item.annual_grace_ends_on || "Not applicable"} · Checked (India): ${item.checked_on_ist} · Cancellation: ${item.cancellation_effective_on || "Not applicable"} · Proposed export window through: ${item.data_recovery_deadline_on || "Not applicable"} · ERP ACCESS NOT ENFORCED`;
}

async function openLicense(company) {
  selectedLicenseCompany = company;
  byId("licenseHeading").textContent = `Subscription: ${company.legal_name}`;
  byId("licensePanel").hidden = false;
  await refreshLicense();
  byId("licensePanel").scrollIntoView({behavior: "smooth", block: "start"});
}

async function refreshLicense() {
  if (!selectedLicenseCompany) return;
  const id = selectedLicenseCompany.id;
  const [summary, history] = await Promise.all([
    api(`companies/${id}/license`), api(`companies/${id}/license/history`),
  ]);
  byId("licenseSummary").textContent = licenseStatusText(summary);
  byId("licensePlan").value = summary.plan || "MONTHLY";
  byId("licensePrice").value = summary.price_inr || "";
  const list = byId("licenseHistory");
  list.replaceChildren();
  for (const term of history.items) {
    list.appendChild(element("div", `${term.plan}: INR ${term.amount_received_inr} · ${term.start_on} to ${term.expires_on} (end exclusive) · Ref ${term.payment_reference}`));
  }
  if (!history.items.length) list.appendChild(element("p", "No advance payments confirmed yet."));
}

async function openRecovery(company) {
  selectedRecoveryCompany = company;
  selectedRecoveryCase = null;
  byId("recoveryHeading").textContent = `Boss recovery: ${company.legal_name}`;
  byId("recoveryPanel").hidden = false;
  byId("recoveryReviewPanel").hidden = true;
  byId("requesterEmail").value = company.recovery_email || company.boss_email;
  byId("requesterRole").value = company.recovery_email ? "RECOVERY_CONTACT" : "BOSS";
  await refreshRecovery();
  byId("recoveryPanel").scrollIntoView({behavior: "smooth", block: "start"});
}

async function refreshRecovery() {
  if (!selectedRecoveryCompany) return;
  const data = await api(`companies/${selectedRecoveryCompany.id}/boss-recovery`);
  const list = byId("recoveryCases"); list.replaceChildren();
  for (const entry of data.items) {
    const card = element("article", undefined, "company-card");
    card.appendChild(element("h3", `Case #${entry.id} — ${entry.status.replaceAll("_", " ")}`));
    card.appendChild(element("div", `${entry.reason.replaceAll("_", " ")} · ${entry.requester_role.replaceAll("_", " ")} · ${entry.requester_email}`, "meta"));
    card.appendChild(element("div", `Opened: ${entry.opened_at} · Customer credentials changed: NO · Reset token issued: NO`, "meta"));
    const buttons = element("div", undefined, "buttons");
    buttons.appendChild(actionButton("Review / history", () => reviewRecovery(entry)));
    card.appendChild(buttons); list.appendChild(card);
  }
  if (!data.items.length) list.appendChild(element("p", "No recovery cases for this company.", "info"));
}

async function reviewRecovery(entry) {
  selectedRecoveryCase = entry;
  byId("recoveryReviewPanel").hidden = false;
  byId("recoveryReviewHeading").textContent = `Review case #${entry.id} — ${entry.status.replaceAll("_", " ")}`;
  byId("verifyRecoveryForm").hidden = entry.status !== "OPEN";
  byId("recoveryDecisionPanel").hidden = entry.status !== "VERIFIED";
  byId("rejectRecoveryForm").hidden = !["OPEN", "VERIFIED", "READY_PENDING_CONNECTOR"].includes(entry.status);
  byId("verificationReference").value = "";
  for (const id of ["verifiedIdentity", "verifiedAuthority", "verifiedContact", "approvalReviewed", "approvalUnderstood"]) byId(id).checked = false;
  const history = await api(`companies/${selectedRecoveryCompany.id}/boss-recovery/${entry.id}/history`);
  byId("recoveryReviewHeading").textContent += ` · ${history.items.map(i => i.type).join(" → ")}`;
  byId("recoveryReviewPanel").scrollIntoView({behavior: "smooth", block: "start"});
}

byId("openRecoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedRecoveryCompany) return;
  if (!confirm(`Open an UNVERIFIED recovery case for ${selectedRecoveryCompany.legal_name}? This will NOT change a customer's credentials.`)) return;
  const button = byId("openRecoveryButton"); button.disabled = true; showNotice("");
  try {
    await api(`companies/${selectedRecoveryCompany.id}/boss-recovery`, "POST", {
      reason: byId("recoveryReason").value,
      requester_role: byId("requesterRole").value,
      requester_email: byId("requesterEmail").value.trim(),
    });
    await refreshRecovery(); showNotice("Unverified case opened. NO company ERP account changed.", true);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

byId("verifyRecoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedRecoveryCompany || !selectedRecoveryCase) return;
  if (!confirm("Confirm you performed each verification OUTSIDE this application using genuine evidence? No customer account will change.")) return;
  const button = byId("verifyRecoveryButton"); button.disabled = true; showNotice("");
  try {
    const result = await api(`companies/${selectedRecoveryCompany.id}/boss-recovery/${selectedRecoveryCase.id}/verify`, "POST", {
      method: byId("verificationMethod").value,
      evidence_reference: byId("verificationReference").value.trim(),
      independent_identity_checked: byId("verifiedIdentity").checked,
      legal_company_authority_checked: byId("verifiedAuthority").checked,
      company_contact_checked: byId("verifiedContact").checked,
    });
    await refreshRecovery(); await reviewRecovery(result);
    showNotice("Manual verification recorded. No password, OTP or customer account changed.", true);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

byId("approveRecoveryButton").addEventListener("click", async () => {
  if (!selectedRecoveryCompany || !selectedRecoveryCase) return;
  if (!confirm("Record owner approval for FUTURE secure execution? This does NOT execute a reset.")) return;
  const button = byId("approveRecoveryButton"); button.disabled = true; showNotice("");
  try {
    const result = await api(`companies/${selectedRecoveryCompany.id}/boss-recovery/${selectedRecoveryCase.id}/approve`, "POST", {
      review_completed: byId("approvalReviewed").checked,
      understand_no_customer_account_is_changed: byId("approvalUnderstood").checked,
    });
    await refreshRecovery(); await reviewRecovery(result);
    showNotice("Case ready pending future secure connector. No customer access changed.", true);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

byId("rejectRecoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedRecoveryCompany || !selectedRecoveryCase) return;
  if (!confirm("Reject or revoke this recovery review? The customer ERP is unaffected.")) return;
  const button = byId("rejectRecoveryButton"); button.disabled = true; showNotice("");
  try {
    const result = await api(`companies/${selectedRecoveryCompany.id}/boss-recovery/${selectedRecoveryCase.id}/reject`, "POST", {
      decision_code: byId("rejectionReason").value,
    });
    await refreshRecovery(); await reviewRecovery(result);
    showNotice("Recovery case rejected/revoked; no customer credentials changed.", true);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

byId("refreshRecovery").addEventListener("click", () => refreshRecovery().catch(e => showNotice(e.message)));
byId("closeRecovery").addEventListener("click", () => {
  selectedRecoveryCompany = null; selectedRecoveryCase = null;
  byId("recoveryPanel").hidden = true; byId("recoveryReviewPanel").hidden = true;
});

byId("licensePlanForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedLicenseCompany) return;
  showNotice("");
  const plan = byId("licensePlan").value;
  const price = byId("licensePrice").value;
  if (!confirm(`Set ${plan} subscription at INR ${price} for ${selectedLicenseCompany.legal_name}? This changes the future subscription price, NOT any paid term or ERP access.`)) return;
  const button = byId("saveLicensePlan"); button.disabled = true;
  try {
    await api(`companies/${selectedLicenseCompany.id}/license/plan`, "PUT", {plan, price_inr: price});
    await refreshLicense();
    showNotice("Subscription plan saved. No ERP access was changed.", true);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

byId("licensePaymentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedLicenseCompany) return;
  const reference = byId("licensePaymentReference").value;
  if (!byId("licenseAdvanceReceived").checked) { showNotice("Verify the advance payment first."); return; }
  if (!confirm(`CONFIRM money already received for ${selectedLicenseCompany.legal_name}? Reference: ${reference}. This action creates a permanent receipt record, NOT ERP access.`)) return;
  showNotice("");
  const button = byId("confirmLicensePayment"); button.disabled = true;
  try {
    await api(`companies/${selectedLicenseCompany.id}/license/confirm-payment`, "POST", {payment_reference: reference, advance_received: true});
    byId("licensePaymentForm").reset();
    await refreshLicense();
    showNotice("Received payment recorded. Customer ERP remains NOT activated.", true);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; }
});

byId("closeLicense").addEventListener("click", () => {
  selectedLicenseCompany = null;
  byId("licensePanel").hidden = true;
});

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
