// js/rooms.js — Rooms Management

requireManager();   // Managers only
initSidebar();

let allRooms    = [];
let editingId   = null;

// ─── Load rooms ───────────────────────────────────────────
async function loadRooms() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `
    <tr><td colspan="6">
      <div class="spinner-wrap"><div class="spinner"></div></div>
    </td></tr>`;

  try {
    const res  = await authFetch(API.ROOMS);
    const data = await res.json();
    allRooms = extractList(data);
    applyFilters();
  } catch (err) {
    showToast("Failed to load rooms", "error");
  }
}

// ─── Render table ─────────────────────────────────────────
function renderRooms(rooms) {
  const tbody = document.getElementById("tableBody");

  if (!rooms.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-state-icon">🛏️</div>
          <p>No rooms found</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rooms.map(r => `
    <tr>
      <td><strong style="color:var(--text-primary)">${r.room_number}</strong></td>
      <td>${r.room_type}</td>
      <td>${r.capacity}</td>
      <td>${formatCurrency(r.price_per_night)}</td>
      <td><span class="badge badge-${(r.status||'').toLowerCase()}">${r.status}</span></td>
      <td>
        <div class="actions-cell">
          ${isManager() ? `
            <button class="btn btn-outline btn-sm" onclick="openEditModal(${r.id})">Edit</button>
            <button class="btn btn-danger  btn-sm" onclick="deleteRoom(${r.id})">Delete</button>
          ` : `<span style="color:var(--text-muted);font-size:0.8rem">View only</span>`}
        </div>
      </td>
    </tr>
  `).join("");
}

// ─── Filters ──────────────────────────────────────────────
function applyFilters() {
  const q      = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;

  let filtered = allRooms;

  if (q) {
    filtered = filtered.filter(r =>
      String(r.room_number).toLowerCase().includes(q) ||
      (r.room_type || '').toLowerCase().includes(q)
    );
  }

  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }

  renderRooms(filtered);
}

document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("statusFilter").addEventListener("change", applyFilters);
document.getElementById("addRoomBtn").addEventListener("click", openAddModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

// ─── Modal helpers ────────────────────────────────────────
function openAddModal() {
  editingId = null;
  document.getElementById("modalTitle").textContent = "Add New Room";
  document.getElementById("roomForm").reset();
  document.getElementById("roomModal").classList.remove("hidden");
}

function openEditModal(id) {
  const room = allRooms.find(r => r.id === id);
  if (!room) return;

  editingId = id;
  document.getElementById("modalTitle").textContent   = "Edit Room";
  document.getElementById("fieldRoomNumber").value    = room.room_number;
  document.getElementById("fieldRoomType").value      = room.room_type;
  document.getElementById("fieldCapacity").value      = room.capacity;
  document.getElementById("fieldPrice").value         = room.price_per_night;
  document.getElementById("fieldStatus").value        = room.status;
  document.getElementById("roomModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("roomModal").classList.add("hidden");
  editingId = null;
}

// Close on overlay click
document.getElementById("roomModal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// ─── Save (Add / Edit) ────────────────────────────────────
document.getElementById("roomForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const roomNumber   = document.getElementById("fieldRoomNumber").value.trim();
  const roomType     = document.getElementById("fieldRoomType").value;
  const capacity     = parseInt(document.getElementById("fieldCapacity").value);
  const pricePerNight= parseFloat(document.getElementById("fieldPrice").value);
  const status       = document.getElementById("fieldStatus").value;

  if (!roomNumber) { showToast("Room number is required", "error"); return; }
  if (!roomType)   { showToast("Room type is required",   "error"); return; }
  if (!capacity || capacity < 1)    { showToast("Capacity must be at least 1",  "error"); return; }
  if (!pricePerNight || pricePerNight <= 0) { showToast("Price must be greater than 0", "error"); return; }

  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  try {
    const body = { room_number: roomNumber, room_type: roomType, capacity, price_per_night: pricePerNight, status };
    const url    = editingId ? API.ROOM_BY_ID(editingId) : API.ROOMS;
    const method = editingId ? "PUT" : "POST";

    const res  = await authFetch(url, { method, body: JSON.stringify(body) });
    const data = await res.json();

    if (!res.ok) throw new Error(data.text || "Failed to save room");

    showToast(editingId ? "Room updated successfully" : "Room added successfully");
    closeModal();
    loadRooms();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save Room";
  }
});

// ─── Delete Room ──────────────────────────────────────────
async function deleteRoom(id) {
  const ok = await showConfirm({
    title:        "Delete Room?",
    message:      "This room will be permanently removed. This action cannot be undone.",
    confirmLabel: "Delete Room",
    variant:      "danger"
  });
  if (!ok) return;

  try {
    const res  = await authFetch(API.ROOM_BY_ID(id), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to delete room");

    showToast("Room deleted successfully");
    loadRooms();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─── Init ─────────────────────────────────────────────────
loadRooms();
