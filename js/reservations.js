// js/reservations.js — Reservations Management

requireAuth();
initSidebar();

let allReservations = [];
let editingId       = null;

// ─── Load all reservations ────────────────────────────────
async function loadReservations() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `
    <tr><td colspan="7">
      <div class="spinner-wrap"><div class="spinner"></div></div>
    </td></tr>`;

  try {
    const res  = await authFetch(API.RESERVATIONS);
    const data = await res.json();
    allReservations = extractList(data);
    renderReservations(allReservations);
  } catch (err) {
    showToast("Failed to load reservations", "error");
  }
}

// ─── Render table ─────────────────────────────────────────
function renderReservations(list) {
  const tbody = document.getElementById("tableBody");

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No reservations found</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    const guestName = r.guest?.name || r.guestName || "—";
    const rooms      = Array.isArray(r.rooms)
      ? r.rooms.map(rm => rm.roomNumber || rm).join(", ")
      : "—";

    return `
      <tr>
        <td><strong style="color:var(--text-primary)">#${r.reservationId}</strong></td>
        <td>${guestName}</td>
        <td style="max-width:140px;word-break:break-word">${rooms}</td>
        <td>${formatDate(r.checkInDate)}</td>
        <td>${formatDate(r.checkOutDate)}</td>
        <td><span class="badge badge-${(r.status || "").toLowerCase()}">${r.status || "—"}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-outline btn-xs" onclick="viewReservation(${r.reservationId})">View</button>
            ${(isManager() || r.status === 'OCCUPIED') ? `
              <button class="btn btn-outline btn-xs" onclick="openEditModal(${r.reservationId})">Update</button>
            ` : ''}
            <button class="btn btn-danger btn-xs" onclick="cancelReservation(${r.reservationId})">Cancel</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ─── Filter ───────────────────────────────────────────────
document.getElementById("addReservationBtn").addEventListener("click", openAddModal);
document.getElementById("closeDetailModal").addEventListener("click", closeDetailModal);
document.getElementById("closeDetailBtn").addEventListener("click", closeDetailModal);
document.getElementById("closeAddModal").addEventListener("click", closeAddModal);
document.getElementById("cancelAddModal").addEventListener("click", closeAddModal);
document.getElementById("closeEditModal").addEventListener("click", closeEditModal);
document.getElementById("cancelEditModal").addEventListener("click", closeEditModal);

document.getElementById("statusFilter").addEventListener("change", function () {
  const v = this.value;
  renderReservations(v ? allReservations.filter(r => r.status === v) : allReservations);
});

// ─── View Reservation Detail ──────────────────────────────
async function viewReservation(id) {
  try {
    const res  = await authFetch(API.RESERVATION_BY_ID(id));
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to load reservation");

    const r      = data.result;
    const guest  = r.guest || {};
    const rooms  = Array.isArray(r.rooms) ? r.rooms : [];
    const nights = Math.max(1, Math.ceil(
      (new Date(r.checkOutDate) - new Date(r.checkInDate)) / 86400000
    ));
    const total = rooms.reduce((s, rm) => s + (rm.pricePerNight || 0), 0) * nights;

    const roomCards = rooms.map(rm => `
      <div class="res-room-detail-card">
        <div class="res-rdc-number">${rm.roomNumber || "—"}</div>
        <div class="res-rdc-info">
          <div class="res-rdc-type">${rm.roomType || "—"}</div>
          <div class="res-rdc-meta">👥 Capacity: ${rm.capacity || "—"} &nbsp;·&nbsp; Status:
            <span class="badge badge-${(rm.status||"").toLowerCase()}" style="font-size:0.68rem;padding:2px 8px">${rm.status || "—"}</span>
          </div>
        </div>
        <div class="res-rdc-price">Rs. ${(rm.pricePerNight || 0).toFixed(2)}<span style="font-size:0.7rem;font-weight:400;opacity:.6">/night</span></div>
      </div>`).join("");

    document.getElementById("detailContent").innerHTML = `
      <div class="res-view-header">
        <div>
          <div class="res-view-id">Reservation #${r.reservationId}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px">Booked for ${guest.name || "—"}</div>
        </div>
        <span class="badge badge-${(r.status || "").toLowerCase()}" style="font-size:0.85rem;padding:6px 14px">${r.status || "—"}</span>
      </div>

      <div style="margin-bottom:16px">
        <div class="res-section-label">Guest Information</div>
        <div class="edit-guest-card">
          <div class="egc-avatar">${(guest.name || "G").charAt(0).toUpperCase()}</div>
          <div class="egc-info">
            <div class="egc-name">${guest.name || "—"}</div>
            <div class="egc-meta">📞 ${guest.contactNumber || "—"} &nbsp;&nbsp; ✉ ${guest.email || "—"}</div>
            <div class="egc-meta">📍 ${guest.address || "—"}</div>
          </div>
        </div>
      </div>

      <div class="res-info-grid" style="margin-bottom:16px">
        <div class="res-info-card">
          <div class="res-info-card-label">📅 Check-In</div>
          <div class="res-info-card-value">${formatDate(r.checkInDate)}</div>
          <div class="res-info-card-sub">${r.checkInDate || "—"}</div>
        </div>
        <div class="res-info-card">
          <div class="res-info-card-label">📅 Check-Out</div>
          <div class="res-info-card-value">${formatDate(r.checkOutDate)}</div>
          <div class="res-info-card-sub">${r.checkOutDate || "—"} &nbsp;·&nbsp; ${nights} night${nights !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <div class="res-section-label">Rooms (${rooms.length})</div>
      ${roomCards || `<p style="color:var(--text-muted);padding:4px 0 12px">No rooms assigned.</p>`}

      ${total > 0 ? `
      <div class="res-summary-bar">
        <div>
          <div class="res-summary-bar-label">${nights} night${nights !== 1 ? "s" : ""} × ${rooms.length} room${rooms.length !== 1 ? "s" : ""}</div>
        </div>
        <div style="text-align:right">
          <div class="res-summary-bar-label">Estimated Total</div>
          <div class="res-summary-bar-amount">Rs. ${total.toFixed(2)}</div>
        </div>
      </div>` : ""}
    `;
    document.getElementById("detailModal").classList.remove("hidden");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function closeDetailModal() {
  document.getElementById("detailModal").classList.add("hidden");
}

document.getElementById("detailModal").addEventListener("click", function (e) {
  if (e.target === this) closeDetailModal();
});

// ─── Add Reservation Wizard ──────────────────────────────
const addWizard = {
  checkIn:        null,
  checkOut:       null,
  availableRooms: [],
  selectedIds:    new Set(),
  guest:          null
};

function addShowStep(n) {
  [1,2,3,4].forEach(i => {
    document.getElementById(`addStep${i}`).classList.toggle("hidden", i !== n);
    const s = document.getElementById(`wstep${i}`);
    s.classList.toggle("wstep-active", i === n);
    s.classList.toggle("wstep-done",   i < n);
  });
}

function openAddModal() {
  addWizard.checkIn = addWizard.checkOut = addWizard.guest = null;
  addWizard.selectedIds.clear();
  addWizard.availableRooms = [];
  document.getElementById("addCheckIn").value  = "";
  document.getElementById("addCheckOut").value = "";
  document.getElementById("guestSearchPhone").value = "";
  document.getElementById("guestFoundCard").classList.add("hidden");
  document.getElementById("addNewGuestForm").classList.add("hidden");
  document.getElementById("addToConfirmBtn").disabled = true;
  document.getElementById("addToGuestBtn").disabled   = true;
  // ── Cache clear: wipe leftover room cards, banners, confirm summary ──
  document.getElementById("availableRoomsGrid").innerHTML = "";
  document.getElementById("addRoomsSummary").innerHTML    = "";
  document.getElementById("confirmSummary").innerHTML     = "";
  addShowStep(1);
  document.getElementById("addModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
}

document.getElementById("closeAddModal").addEventListener("click",  closeAddModal);
document.getElementById("cancelAddModal").addEventListener("click", closeAddModal);
document.getElementById("addModal").addEventListener("click", function (e) {
  if (e.target === this) closeAddModal();
});

// Step 1 → 2: Fetch available rooms
document.getElementById("addFindRoomsBtn").addEventListener("click", async () => {
  const checkIn  = document.getElementById("addCheckIn").value;
  const checkOut = document.getElementById("addCheckOut").value;
  if (!checkIn || !checkOut)       { showToast("Select both dates", "error"); return; }
  if (checkIn >= checkOut)         { showToast("Check-out must be after check-in", "error"); return; }

  addWizard.checkIn  = checkIn;
  addWizard.checkOut = checkOut;
  addWizard.selectedIds.clear();

  const btn = document.getElementById("addFindRoomsBtn");
  btn.disabled = true; btn.textContent = "Searching…";

  try {
    const res  = await authFetch(API.ROOMS_AVAILABLE(checkIn, checkOut));
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to load rooms");

    addWizard.availableRooms = extractList(data);
    renderRoomCards(addWizard.availableRooms);

    document.getElementById("addDateSummary").textContent =
      `Available rooms for ${checkIn} → ${checkOut}`;
    document.getElementById("addToGuestBtn").disabled = true;
    addShowStep(2);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Find Available Rooms →";
  }
});

function renderRoomCards(rooms) {
  const grid = document.getElementById("availableRoomsGrid");
  if (!rooms.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛏️</div>
        <p>No rooms available for the selected dates.</p>
      </div>`;
    return;
  }
  grid.innerHTML = rooms.map(r => `
    <div class="room-select-card" id="rcard-${r.id}" onclick="toggleRoomCard(${r.id})">
      <div class="rcard-top">
        <span class="rcard-number">${r.room_number}</span>
        <span class="rcard-check">✓</span>
      </div>
      <div class="rcard-type">${r.room_type}</div>
      <div class="rcard-meta">
        <span>👥 ${r.capacity}</span>
          <span>Rs. ${r.price_per_night}/night</span>
      </div>
    </div>
  `).join("");
}

function toggleRoomCard(id) {
  if (addWizard.selectedIds.has(id)) {
    addWizard.selectedIds.delete(id);
    document.getElementById(`rcard-${id}`).classList.remove("rcard-selected");
  } else {
    addWizard.selectedIds.add(id);
    document.getElementById(`rcard-${id}`).classList.add("rcard-selected");
  }
  document.getElementById("addToGuestBtn").disabled = addWizard.selectedIds.size === 0;
}

document.getElementById("addBackStep1").addEventListener("click", () => addShowStep(1));

// Step 2 → 3
document.getElementById("addToGuestBtn").addEventListener("click", () => {
  if (!addWizard.selectedIds.size) { showToast("Select at least one room", "error"); return; }

  const selected = addWizard.availableRooms.filter(r => addWizard.selectedIds.has(r.id));
  document.getElementById("addRoomsSummary").innerHTML =
    "Selected: " + selected.map(r =>
      `<span class="room-tag">🛏️ ${r.room_number} (${r.room_type})</span>`
    ).join(" ");

  addWizard.guest = null;
  document.getElementById("guestFoundCard").classList.add("hidden");
  document.getElementById("addNewGuestForm").classList.add("hidden");
  document.getElementById("addToConfirmBtn").disabled = true;
  document.getElementById("guestSearchPhone").value = "";
  addShowStep(3);
});

document.getElementById("addBackStep2").addEventListener("click", () => addShowStep(2));

// Guest search
document.getElementById("searchGuestBtn").addEventListener("click", async () => {
  const phone = document.getElementById("guestSearchPhone").value.trim();
  if (!phone) { showToast("Enter a mobile number", "error"); return; }

  const btn = document.getElementById("searchGuestBtn");
  btn.disabled = true; btn.textContent = "Searching…";

  try {
    const res  = await authFetch(`${API.GUEST_SEARCH}?contact_number=${encodeURIComponent(phone)}`);
    const data = await res.json();

    if (res.ok && data.result) {
      const g = Array.isArray(data.result) ? data.result[0] : data.result;
      applyFoundGuest(g);
    } else {
      showInlineGuestForm(phone);
    }
  } catch (_) {
    showInlineGuestForm(phone);
  } finally {
    btn.disabled = false; btn.textContent = "Search";
  }
});

function applyFoundGuest(g) {
  addWizard.guest = g;
  document.getElementById("guestFoundName").textContent    = g.name || "—";
  document.getElementById("guestFoundPhone").textContent   = g.contactNumber || g.contact_number || "—";
  document.getElementById("guestFoundEmail").textContent   = g.email || "—";
  document.getElementById("guestFoundAddress").textContent = g.address || "—";
  document.getElementById("guestFoundCard").classList.remove("hidden");
  document.getElementById("addNewGuestForm").classList.add("hidden");
  document.getElementById("addToConfirmBtn").disabled = false;
}

function showInlineGuestForm(phone) {
  document.getElementById("guestFoundCard").classList.add("hidden");
  document.getElementById("newGuestPhone").value  = phone;
  document.getElementById("newGuestName").value   = "";
  document.getElementById("newGuestEmail").value  = "";
  document.getElementById("newGuestAddress").value = "";
  document.getElementById("addNewGuestForm").classList.remove("hidden");
  document.getElementById("addToConfirmBtn").disabled = true;
}

document.getElementById("changeGuestBtn").addEventListener("click", () => {
  addWizard.guest = null;
  document.getElementById("guestFoundCard").classList.add("hidden");
  document.getElementById("addToConfirmBtn").disabled = true;
  document.getElementById("guestSearchPhone").value = "";
});

// Inline add guest
document.getElementById("saveNewGuestBtn").addEventListener("click", async () => {
  const name    = document.getElementById("newGuestName").value.trim();
  const phone   = document.getElementById("newGuestPhone").value.trim();
  const email   = document.getElementById("newGuestEmail").value.trim();
  const address = document.getElementById("newGuestAddress").value.trim();

  if (!name)  { showToast("Guest name is required",   "error"); return; }
  if (!phone) { showToast("Mobile number is required", "error"); return; }

  const btn = document.getElementById("saveNewGuestBtn");
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    const res  = await authFetch(API.GUESTS, {
      method: "POST",
      body:   JSON.stringify({ name, contact_number: phone, address, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to add guest");

    const g = data.result || { id: null, name, contactNumber: phone, address, email };
    showToast("Guest added successfully");
    applyFoundGuest(g);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Add & Use This Guest →";
  }
});

// Step 3 → 4
document.getElementById("addToConfirmBtn").addEventListener("click", () => {
  if (!addWizard.guest) { showToast("Please find or add a guest first", "error"); return; }

  const selected = addWizard.availableRooms.filter(r => addWizard.selectedIds.has(r.id));
  const nights   = Math.ceil(
    (new Date(addWizard.checkOut) - new Date(addWizard.checkIn)) / 86400000
  );
  const totalEst = selected.reduce((s, r) => s + r.price_per_night, 0) * nights;

  document.getElementById("confirmSummary").innerHTML = `
    <ul class="detail-list">
      <li><span class="dl-label">Guest</span>
          <span class="dl-value">${addWizard.guest.name}</span></li>
      <li><span class="dl-label">Check-In</span>
          <span class="dl-value">${addWizard.checkIn}</span></li>
      <li><span class="dl-label">Check-Out</span>
          <span class="dl-value">${addWizard.checkOut}</span></li>
      <li><span class="dl-label">Nights</span>
          <span class="dl-value">${nights}</span></li>
      <li><span class="dl-label">Est. Total</span>
          <span class="dl-value" style="color:#0a0a0a;font-size:1rem">Rs. ${totalEst.toFixed(2)}</span></li>
    </ul>
    <div class="detail-rooms" style="margin-top:14px">
      <div class="detail-rooms-title">Rooms</div>
      <div class="room-tags">
        ${selected.map(r =>
          `<span class="room-tag">🛏️ ${r.room_number} · ${r.room_type} · Rs. ${r.price_per_night}/night</span>`
        ).join("")}
      </div>
    </div>`;

  addShowStep(4);
});

document.getElementById("addBackStep3").addEventListener("click", () => addShowStep(3));

// Final submit
document.getElementById("addConfirmBtn").addEventListener("click", async () => {
  const btn = document.getElementById("addConfirmBtn");
  btn.disabled = true; btn.textContent = "Creating…";

  try {
    const res  = await authFetch(API.RESERVATIONS, {
      method: "POST",
      body:   JSON.stringify({
        guestId:     addWizard.guest.id,
        roomIds:     [...addWizard.selectedIds],
        checkInDate:  addWizard.checkIn,
        checkOutDate: addWizard.checkOut
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to create reservation");

    showToast("Reservation created successfully");
    closeAddModal();
    loadReservations();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "✓ Create Reservation";
  }
});

// ─── Update Reservation Modal ─────────────────────────────
const editState = {
  selectedRoomIds: new Set(),
  availableRooms:  []
};

async function openEditModal(id) {
  editingId = id;
  editState.selectedRoomIds = new Set();
  editState.availableRooms  = [];

  document.getElementById("editModalTitle").textContent    = `Update Reservation #${id}`;
  document.getElementById("editModalMeta").textContent     = "Loading…";
  document.getElementById("editGuestSection").style.display = "none";
  document.getElementById("editRoomsGrid").innerHTML =
    '<div class="spinner-wrap"><div class="spinner"></div></div>';
  document.getElementById("editRoomCount").textContent = "";
  document.getElementById("editModal").classList.remove("hidden");

  try {
    const res  = await authFetch(API.RESERVATION_BY_ID(id));
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to load reservation");

    const r     = data.result;
    const guest = r.guest || {};

    // ── Role guard: staff cannot edit COMPLETED reservations ──
    if (!isManager() && r.status === "COMPLETED") {
      showToast("Only managers can update completed reservations.", "error");
      closeEditModal();
      return;
    }

    document.getElementById("editModalMeta").textContent =
      `Status: ${r.status}  ·  Guest: ${guest.name || "—"}`;

    // Guest card (read-only)
    const gSection = document.getElementById("editGuestSection");
    gSection.style.display = "";
    gSection.innerHTML = `
      <div class="res-section-label">Guest</div>
      <div class="edit-guest-card">
        <div class="egc-avatar">${(guest.name || "G").charAt(0).toUpperCase()}</div>
        <div class="egc-info">
          <div class="egc-name">${guest.name || "—"}</div>
          <div class="egc-meta">📞 ${guest.contactNumber || "—"} &nbsp;&nbsp; ✉ ${guest.email || "—"}</div>
          <div class="egc-meta">📍 ${guest.address || "—"}</div>
        </div>
        <span class="badge badge-${(r.status || "").toLowerCase()}">${r.status || "—"}</span>
      </div>`;

    // Dates
    document.getElementById("editCheckIn").value  = r.checkInDate  || "";
    document.getElementById("editCheckOut").value = r.checkOutDate || "";

    // Status field — only managers may change status
    const statusWrap = document.getElementById("editStatusWrap");
    if (statusWrap) statusWrap.style.display = isManager() ? "" : "none";
    document.getElementById("editStatus").value = r.status || "OCCUPIED";

    // Load available rooms (current rooms pre-selected)
    await loadEditRooms(r.checkInDate, r.checkOutDate, r.rooms || []);

  } catch (err) {
    showToast(err.message, "error");
    closeEditModal();
  }
}

async function loadEditRooms(checkIn, checkOut, currentRooms) {
  const grid = document.getElementById("editRoomsGrid");
  grid.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  const currentIds = new Set(currentRooms.map(rm => rm.id));
  editState.selectedRoomIds = new Set(currentIds);

  try {
    const res  = await authFetch(API.ROOMS_AVAILABLE(checkIn, checkOut));
    const data = await res.json();
    let rooms = extractList(data);

    // Merge current rooms not in the available list (already booked to this reservation)
    const availableIds = new Set(rooms.map(r => r.id));
    currentRooms.forEach(cr => {
      if (!availableIds.has(cr.id)) {
        rooms = [{
          id:              cr.id,
          room_number:     cr.roomNumber,
          room_type:       cr.roomType,
          capacity:        cr.capacity,
          price_per_night: cr.pricePerNight,
          status:          cr.status
        }, ...rooms];
      }
    });

    editState.availableRooms = rooms;
    renderEditRoomCards(rooms);
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--text-muted);padding:8px">⚠ Could not load available rooms.</p>`;
    updateEditRoomCount();
  }
}

function renderEditRoomCards(rooms) {
  const grid = document.getElementById("editRoomsGrid");
  if (!rooms.length) {
    grid.innerHTML = `<p style="color:var(--text-muted);padding:8px">No rooms available for the selected dates.</p>`;
    updateEditRoomCount();
    return;
  }
  grid.innerHTML = rooms.map(r => {
    const sel = editState.selectedRoomIds.has(r.id);
    return `
      <div class="room-select-card${sel ? " rcard-selected" : ""}" id="ercard-${r.id}" onclick="toggleEditRoomCard(${r.id})">
        <div class="rcard-top">
          <span class="rcard-number">${r.room_number || r.roomNumber || "—"}</span>
          <span class="rcard-check">✓</span>
        </div>
        <div class="rcard-type">${r.room_type || r.roomType || "—"}</div>
        <div class="rcard-meta">
          <span>👥 ${r.capacity || "—"}</span>
          <span>Rs. ${r.price_per_night || r.pricePerNight || 0}/night</span>
        </div>
      </div>`;
  }).join("");
  updateEditRoomCount();
}

function toggleEditRoomCard(id) {
  if (editState.selectedRoomIds.has(id)) {
    editState.selectedRoomIds.delete(id);
    document.getElementById(`ercard-${id}`)?.classList.remove("rcard-selected");
  } else {
    editState.selectedRoomIds.add(id);
    document.getElementById(`ercard-${id}`)?.classList.add("rcard-selected");
  }
  updateEditRoomCount();
}

function updateEditRoomCount() {
  const n = editState.selectedRoomIds.size;
  document.getElementById("editRoomCount").textContent =
    n ? `— ${n} room${n !== 1 ? "s" : ""} selected` : "— none selected";
}

document.getElementById("editFindRoomsBtn").addEventListener("click", async () => {
  const checkIn  = document.getElementById("editCheckIn").value;
  const checkOut = document.getElementById("editCheckOut").value;
  if (!checkIn || !checkOut) { showToast("Select both dates first", "error"); return; }
  if (checkIn >= checkOut)   { showToast("Check-out must be after check-in", "error"); return; }
  await loadEditRooms(checkIn, checkOut, []);
});

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  editingId = null;
  editState.selectedRoomIds = new Set();
  editState.availableRooms  = [];
}

document.getElementById("editModal").addEventListener("click", function (e) {
  if (e.target === this) closeEditModal();
});

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const checkInDate  = document.getElementById("editCheckIn").value;
  const checkOutDate = document.getElementById("editCheckOut").value;
  const status       = document.getElementById("editStatus").value;

  if (!editState.selectedRoomIds.size) {
    showToast("Select at least one room", "error"); return;
  }
  if (!checkInDate || !checkOutDate) {
    showToast("Check-in and check-out dates are required", "error"); return;
  }
  if (checkInDate >= checkOutDate) {
    showToast("Check-out must be after check-in", "error"); return;
  }

  // Staff cannot change status — only include it for managers
  const body = {
    roomIds:      [...editState.selectedRoomIds],
    checkInDate,
    checkOutDate,
    ...(isManager() ? { status } : {})
  };

  const saveBtn = document.getElementById("editSaveBtn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Updating…";

  try {
    const res  = await authFetch(API.RESERVATION_UPDATE(editingId), {
      method: "PUT",
      body:   JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to update reservation");

    showToast("Reservation updated successfully");
    closeEditModal();
    loadReservations();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save Changes";
  }
});

// ─── Complete Reservation (POST /complete — both roles) ────────
async function completeReservation(id) {
  const ok = await showConfirm({
    title:        `Complete Reservation #${id}?`,
    message:      "This will mark the reservation as completed and generate a bill. This action cannot be undone.",
    confirmLabel: "Mark Complete",
    cancelLabel:  "Go Back",
    variant:      "warning"
  });
  if (!ok) return;

  try {
    const res  = await authFetch(API.RESERVATION_COMPLETE(id), { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to complete reservation");

    showToast("Reservation completed and bill generated");
    loadReservations();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─── Cancel Reservation (DELETE — both roles) ──────────────
async function cancelReservation(id) {
  const ok = await showConfirm({
    title:        `Cancel Reservation #${id}?`,
    message:      "This reservation will be cancelled and cannot be recovered.",
    confirmLabel: "Yes, Cancel It",
    cancelLabel:  "Go Back",
    variant:      "danger"
  });
  if (!ok) return;

  try {
    const res  = await authFetch(API.RESERVATION_CANCEL(id), { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.text || "Failed to cancel reservation");
    }

    showToast("Reservation cancelled");
    loadReservations();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─── Init ─────────────────────────────────────────────────
loadReservations();
