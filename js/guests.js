// js/guests.js — Guests Management

requireAuth();
initSidebar();

let allGuests  = [];
let editingId  = null;

// ─── Load all guests ──────────────────────────────────────
async function loadGuests() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `
    <tr><td colspan="5">
      <div class="spinner-wrap"><div class="spinner"></div></div>
    </td></tr>`;

  try {
    const res  = await authFetch(API.GUESTS);
    const data = await res.json();
    allGuests = extractList(data);
    renderGuests(allGuests);
  } catch (err) {
    showToast("Failed to load guests", "error");
  }
}

// ─── Render table ─────────────────────────────────────────
function renderGuests(guests) {
  const tbody = document.getElementById("tableBody");

  if (!guests.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon">👤</div>
          <p>No guests found</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = guests.map(g => `
    <tr>
      <td><strong style="color:var(--text-primary)">${g.name}</strong></td>
      <td>${g.address || "—"}</td>
      <td>${g.contact_number || "—"}</td>
      <td>${g.email || "—"}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-outline btn-sm" onclick="openEditModal(${g.id})">Edit</button>
          <button class="btn btn-danger  btn-sm" onclick="deleteGuest(${g.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ─── Search ───────────────────────────────────────────────
let searchTimeout = null;

document.getElementById("addGuestBtn").addEventListener("click", openAddModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

document.getElementById("searchInput").addEventListener("input", function () {
  clearTimeout(searchTimeout);
  const q = this.value.trim();

  if (!q) { renderGuests(allGuests); return; }

  // If numeric → server-side search by contact number
  if (/^\d+$/.test(q)) {
    searchTimeout = setTimeout(() => searchByContact(q), 400);
    return;
  }

  // Client-side name filter
  renderGuests(
    allGuests.filter(g => g.name.toLowerCase().includes(q.toLowerCase()))
  );
});

async function searchByContact(contactNumber) {
  try {
    const res  = await authFetch(`${API.GUEST_SEARCH}?contact_number=${encodeURIComponent(contactNumber)}`);
    const data = await res.json();

    if (!res.ok || !data.result) {
      renderGuests([]);
      return;
    }
    // May return single object or array depending on backend
    const results = Array.isArray(data.result) ? data.result : [data.result];
    renderGuests(results);
  } catch (err) {
    showToast("Search failed", "error");
  }
}

// ─── Modal helpers ────────────────────────────────────────
function openAddModal() {
  editingId = null;
  document.getElementById("modalTitle").textContent = "Add New Guest";
  document.getElementById("guestForm").reset();
  document.getElementById("guestModal").classList.remove("hidden");
}

function openEditModal(id) {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;

  editingId = id;
  document.getElementById("modalTitle").textContent       = "Edit Guest";
  document.getElementById("fieldName").value              = guest.name           || "";
  document.getElementById("fieldAddress").value           = guest.address        || "";
  document.getElementById("fieldContactNumber").value     = guest.contact_number || "";
  document.getElementById("fieldEmail").value             = guest.email          || "";
  document.getElementById("guestModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("guestModal").classList.add("hidden");
  editingId = null;
}

document.getElementById("guestModal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

// ─── Save (Add / Edit) ────────────────────────────────────
document.getElementById("guestForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name           = document.getElementById("fieldName").value.trim();
  const address        = document.getElementById("fieldAddress").value.trim();
  const contact_number = document.getElementById("fieldContactNumber").value.trim();
  const email          = document.getElementById("fieldEmail").value.trim();

  if (!name)           { showToast("Name is required",           "error"); return; }
  if (!contact_number) { showToast("Contact number is required", "error"); return; }

  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  try {
    const body   = { name, address, contact_number, email };
    const url    = editingId ? API.GUEST_BY_ID(editingId) : API.GUESTS;
    const method = editingId ? "PUT" : "POST";

    const res  = await authFetch(url, { method, body: JSON.stringify(body) });
    const data = await res.json();

    if (!res.ok) throw new Error(data.text || "Failed to save guest");

    showToast(editingId ? "Guest updated successfully" : "Guest added successfully");
    closeModal();
    loadGuests();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save Guest";
  }
});

// ─── Delete Guest ─────────────────────────────────────────
async function deleteGuest(id) {
  const ok = await showConfirm({
    title:        "Delete Guest?",
    message:      "This guest record will be permanently removed and cannot be recovered.",
    confirmLabel: "Delete Guest",
    variant:      "danger"
  });
  if (!ok) return;

  try {
    const res  = await authFetch(API.GUEST_BY_ID(id), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to delete guest");

    showToast("Guest deleted successfully");
    loadGuests();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─── Init ─────────────────────────────────────────────────
loadGuests();
