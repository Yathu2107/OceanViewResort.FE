// ============================================================
//  js/config.js  —  SINGLE SOURCE OF TRUTH for BASE_URL
//  Include this as the FIRST <script> on every HTML page.
// ============================================================

const BASE_URL = "http://localhost:8080";

const API = {
  // Auth
  LOGIN:               `${BASE_URL}/auth/login`,
  LOGOUT:              `${BASE_URL}/user/logout`,
  ME:                  `${BASE_URL}/user/me`,

  // Users
  REGISTER_USER:       `${BASE_URL}/user/register`,
  UPDATE_USER:         (id) => `${BASE_URL}/user/${id}`,

  // Rooms
  ROOMS:               `${BASE_URL}/rooms`,
  ROOM_BY_ID:          (id) => `${BASE_URL}/rooms/${id}`,

  // Guests
  GUESTS:              `${BASE_URL}/guests`,
  GUEST_BY_ID:         (id) => `${BASE_URL}/guests/${id}`,
  GUEST_SEARCH:        `${BASE_URL}/guests/search`,

  // Reservations
  RESERVATIONS:         `${BASE_URL}/reservations`,
  RESERVATION_BY_ID:   (id) => `${BASE_URL}/reservations?id=${id}`,
  RESERVATION_UPDATE:  (id) => `${BASE_URL}/reservations/${id}`,
  RESERVATION_CANCEL:  (id) => `${BASE_URL}/reservations?id=${id}`,
  RESERVATION_COMPLETE:(id) => `${BASE_URL}/reservations/${id}/complete`,

  // Available rooms for a date range
  ROOMS_AVAILABLE: (checkIn, checkOut) =>
    `${BASE_URL}/rooms?status=AVAILABLE&checkInDate=${checkIn}&checkOutDate=${checkOut}`,

  // Billing
  BILLING:             `${BASE_URL}/billing`,
  BILLING_CHECKOUT:    `${BASE_URL}/billing/checkout`,

  // Dashboard
  DASHBOARD_STATS:     `${BASE_URL}/dashboard/statistics`,
  DASHBOARD_ROOMS:     `${BASE_URL}/dashboard/room-status`,

  // Help
  HELP_GUIDELINES: `${BASE_URL}/help/staff-guidelines`,
  HELP_FAQ:        `${BASE_URL}/help/reservation-faq`,
  HELP_SYSTEM:     `${BASE_URL}/help/system-help`,
  HELP_ALL:        `${BASE_URL}/help/all`,
};

// ─── Auth Helpers ───────────────────────────────────────────
function getToken() { return localStorage.getItem("token"); }
function getUser()  { return JSON.parse(localStorage.getItem("user") || "{}"); }
function getRole()  { return localStorage.getItem("role"); }
function isManager() { return getRole() === "MANAGER"; }

function requireAuth() {
  if (!getToken()) { window.location.href = "index.html"; }
}

function requireManager() {
  requireAuth();
  if (!isManager()) {
    alert("Access denied. Managers only.");
    window.location.href = "dashboard.html";
  }
}

function logout() {
  authFetch(API.LOGOUT, { method: "POST" })
    .catch(() => {})
    .finally(() => {
      localStorage.clear();
      window.location.href = "index.html";
    });
}

// ─── Authenticated Fetch Wrapper ────────────────────────────
async function authFetch(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "index.html";
  }
  return res;
}

// ─── Toast Notification ─────────────────────────────────────
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── Universal list extractor ───────────────────────────────
// API shape: { status, text, code, result: { <key>: [...], total: N } }
// Finds the first array inside `result`, or falls back to result itself.
function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  // result is an object — find the first key whose value is an array
  if (data?.result && typeof data.result === "object") {
    for (const key of Object.keys(data.result)) {
      if (Array.isArray(data.result[key])) return data.result[key];
    }
  }
  // Plain data object fallback
  if (data && typeof data === "object") {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

// ─── Confirm Dialog ────────────────────────────────────────
// Usage: if (!await showConfirm({ title, message, confirmLabel, variant })) return;
function showConfirm({ title = "Are you sure?", message = "", confirmLabel = "Delete", cancelLabel = "Cancel", variant = "danger" } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const icon = variant === "danger" ? "🗑️" : "⚠️";

    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-icon ${variant}">${icon}</div>
        <div class="confirm-title">${title}</div>
        ${message ? `<div class="confirm-message">${message}</div>` : ""}
        <div class="confirm-footer">
          <button class="btn btn-outline" id="cfmNo">${cancelLabel}</button>
          <button class="btn btn-${variant}" id="cfmYes">${confirmLabel}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = (result) => { overlay.remove(); resolve(result); };
    overlay.querySelector("#cfmYes").addEventListener("click", () => close(true));
    overlay.querySelector("#cfmNo").addEventListener("click",  () => close(false));
    overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
  });
}

// ─── Utility Helpers ────────────────────────────────────────
function formatDate(dateStr) {
  return dateStr ? dateStr.split("T")[0] : "—";
}

function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return "Rs. 0.00";
  return `Rs. ${parseFloat(amount).toFixed(2)}`;
}

// Setup sidebar active link + user info (call on every auth page)
function initSidebar() {
  const user = getUser();
  const nameEl = document.getElementById("userName");
  const roleEl = document.getElementById("userRole");
  if (nameEl) nameEl.textContent = user.name || "User";
  if (roleEl) roleEl.textContent = user.role || "";

  // Hide manager-only nav items for STAFF
  if (!isManager()) {
    document.querySelectorAll(".manager-only").forEach(el => el.style.display = "none");
  }

  // Set active nav link
  const page = window.location.pathname.split("/").pop() || "index.html";
  const navMap = {
    "dashboard.html":    "nav-dashboard",
    "rooms.html":        "nav-rooms",
    "guests.html":       "nav-guests",
    "reservations.html": "nav-reservations",
    "billing.html":      "nav-billing",
    "help.html":         "nav-help",
    "users.html":        "nav-users"
  };
  const activeId = navMap[page];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add("active");
  }
}
