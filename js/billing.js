// js/billing.js — Billing Management

requireAuth();
initSidebar();

let allBills = [];

// ─── Load all bills ───────────────────────────────────
async function loadBills() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `
    <tr><td colspan="9">
      <div class="spinner-wrap"><div class="spinner"></div></div>
    </td></tr>`;

  try {
    const res  = await authFetch(API.BILLING);
    const data = await res.json();
    allBills = extractList(data);
    renderBills(allBills);
  } catch (err) {
    showToast("Failed to load bills", "error");
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <div class="empty-state-icon">🧾</div>
          <p>Could not load billing records</p>
        </div>
      </td></tr>`;
  }
}

// ─── Render bills table ────────────────────────────────
function renderBills(list) {
  const tbody = document.getElementById("tableBody");

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <div class="empty-state-icon">🧾</div>
          <p>No billing records found</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => {
    const guest = b.guest || {};
    const res   = b.reservation || {};
    return `
      <tr>
        <td><strong style="color:var(--text-primary)">#${b.billId}</strong></td>
        <td>
          <div style="font-weight:600;color:var(--text-primary)">${guest.name || "—"}</div>
          <div style="font-size:0.74rem;color:var(--text-muted)">${guest.contactNumber || ""}</div>
        </td>
        <td>
          <span style="color:var(--text-primary);font-weight:600">#${res.reservationId || "—"}</span>
          <span class="badge badge-${(res.status || "").toLowerCase()}" style="margin-left:6px;font-size:0.65rem">${res.status || ""}</span>
        </td>
        <td>${formatDate(res.checkInDate)}</td>
        <td>${formatDate(res.checkOutDate)}</td>
        <td><strong>${res.numberOfNights ?? "—"}</strong></td>
        <td>${formatDate(b.generatedDate)}</td>
        <td><strong style="color:var(--text-primary);font-size:0.95rem">Rs. ${(b.totalAmount || 0).toFixed(2)}</strong></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-outline btn-xs" onclick="printBillById(${b.billId})">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ─── Print bill by ID from loaded list ─────────────────────
function printBillById(billId) {
  const bill = allBills.find(b => b.billId === billId);
  if (!bill) { showToast("Bill not found", "error"); return; }
  openPrintBill(bill);
}

// ─── Open printable bill in new window ──────────────────
function openPrintBill(bill) {
  const guest = bill.guest || {};
  const res   = bill.reservation || {};
  const rooms = Array.isArray(bill.rooms) ? bill.rooms : [];

  const nights   = res.numberOfNights || bill.numberOfNights || "—";
  const resId    = res.reservationId  || bill.reservationId  || "—";
  const checkIn  = res.checkInDate    || "—";
  const checkOut = res.checkOutDate   || "—";

  const roomRows = rooms.map(r => `
    <tr>
      <td>Room ${r.roomNumber || r.roomId || "—"}</td>
      <td style="text-align:right">Rs. ${(r.pricePerNight || 0).toFixed(2)}</td>
      <td style="text-align:right">${nights} night${nights !== 1 ? "s" : ""}</td>
      <td style="text-align:right;font-weight:700">Rs. ${(r.totalForRoom || 0).toFixed(2)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Bill #${bill.billId} — OceanView Resort</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;font-size:13px;color:#111;background:#fff;padding:40px 48px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #111;margin-bottom:28px}
    .hotel-name{font-size:1.5rem;font-weight:800;letter-spacing:-0.04em;color:#111}
    .hotel-sub{font-size:0.75rem;color:#888;margin-top:3px}
    .bill-title{text-align:right}
    .bill-title h2{font-size:1.1rem;font-weight:700;color:#111}
    .bill-title .bill-id{font-size:0.78rem;color:#aaa;margin-top:3px;font-family:monospace}
    .section-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#aaa;margin-bottom:8px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
    .info-block p{font-size:0.82rem;color:#666;margin-top:3px}
    .info-block strong{font-size:0.9rem;color:#111;font-weight:700;display:block;margin-bottom:4px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#111;color:#fff}
    thead th{padding:10px 14px;text-align:left;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
    tbody tr:nth-child(even){background:#fafafa}
    tbody td{padding:10px 14px;font-size:0.83rem;border-bottom:1px solid #f0f0f0}
    .total-row{background:#111 !important;color:#fff}
    .total-row td{padding:14px;font-size:1rem;font-weight:800;letter-spacing:-0.02em;border:none}
    .footer{margin-top:36px;padding-top:18px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:0.74rem;color:#bbb}
    @media print{body{padding:20px 28px}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="hotel-name">🏨 Ocean View Resort</div>
      <div class="hotel-sub">Official Billing Receipt</div>
    </div>
    <div class="bill-title">
      <h2>Bill Receipt</h2>
      <div class="bill-id">Bill #${bill.billId}</div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="section-label">Guest Information</div>
      <div class="info-block">
        <strong>${guest.name || "—"}</strong>
        <p>${guest.email || ""}</p>
        <p>${guest.contactNumber || guest.contact_number || ""}</p>
        <p>${guest.address || ""}</p>
      </div>
    </div>
    <div>
      <div class="section-label">Reservation Details</div>
      <div class="info-block">
        <strong>Reservation #${resId}</strong>
        <p>Check-In: ${checkIn}</p>
        <p>Check-Out: ${checkOut}</p>
        <p>${nights} night${nights !== 1 ? "s" : ""}</p>
      </div>
    </div>
  </div>

  <div class="section-label" style="margin-bottom:8px">Rooms &amp; Charges</div>
  <table>
    <thead>
      <tr>
        <th>Room</th>
        <th style="text-align:right">Rate / Night</th>
        <th style="text-align:right">Nights</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${roomRows || `<tr><td colspan="4" style="color:#aaa;text-align:center;padding:18px">No room details</td></tr>`}
      <tr class="total-row">
        <td colspan="3">Total Amount</td>
        <td style="text-align:right">Rs. ${(bill.totalAmount || 0).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Generated: ${bill.generatedDate || new Date().toISOString().split("T")[0]}</span>
    <span>OceanView Resort Management System</span>
  </div>

  <script>window.onload=function(){window.print()};<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=820,height=700");
  if (!win) {
    showToast("Pop-up blocked — please allow pop-ups for this site to print bills.", "error");
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── Checkout Modal ─────────────────────────────────────
let checkoutReservation = null;

function openCheckoutModal() {
  checkoutReservation = null;
  document.getElementById("coResId").value = "";
  document.getElementById("coReservationDetail").innerHTML = "";
  document.getElementById("coStep1").classList.remove("hidden");
  document.getElementById("coStep2").classList.add("hidden");
  document.getElementById("checkoutModal").classList.remove("hidden");
}

function closeCheckoutModal() {
  document.getElementById("checkoutModal").classList.add("hidden");
  checkoutReservation = null;
}

document.getElementById("checkoutBtn").addEventListener("click", openCheckoutModal);
document.getElementById("closeCheckoutModal").addEventListener("click", closeCheckoutModal);
document.getElementById("checkoutModal").addEventListener("click", function (e) {
  if (e.target === this) closeCheckoutModal();
});

document.getElementById("coBackBtn").addEventListener("click", () => {
  document.getElementById("coStep2").classList.add("hidden");
  document.getElementById("coStep1").classList.remove("hidden");
  checkoutReservation = null;
});

document.getElementById("coSearchBtn").addEventListener("click", async () => {
  const idVal = document.getElementById("coResId").value.trim();
  if (!idVal || isNaN(idVal) || parseInt(idVal) < 1) {
    showToast("Enter a valid Reservation ID", "error"); return;
  }

  const btn = document.getElementById("coSearchBtn");
  btn.disabled = true; btn.textContent = "Searching…";

  try {
    const res  = await authFetch(API.RESERVATION_BY_ID(parseInt(idVal)));
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Reservation not found");

    const r = data.result;
    checkoutReservation = r;

    if (r.status === "COMPLETED" || r.status === "CANCELLED") {
      showToast(`Reservation is already ${r.status.toLowerCase()} and cannot be checked out.`, "error");
      return;
    }

    renderCheckoutDetails(r);
    document.getElementById("coStep1").classList.add("hidden");
    document.getElementById("coStep2").classList.remove("hidden");

  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Search";
  }
});

function renderCheckoutDetails(r) {
  const guest = r.guest || {};
  const rooms = Array.isArray(r.rooms) ? r.rooms : [];
  const nights = Math.max(1, Math.ceil(
    (new Date(r.checkOutDate) - new Date(r.checkInDate)) / 86400000
  ));
  const estimatedTotal = rooms.reduce((s, rm) => s + (rm.pricePerNight || 0), 0) * nights;

  const roomCards = rooms.map(rm => `
    <div class="res-room-detail-card">
      <div class="res-rdc-number">${rm.roomNumber || "—"}</div>
      <div class="res-rdc-info">
        <div class="res-rdc-type">${rm.roomType || "—"}</div>
        <div class="res-rdc-meta">👥 Capacity: ${rm.capacity || "—"} &nbsp;·&nbsp;
          <span class="badge badge-${(rm.status || "").toLowerCase()}" style="font-size:0.65rem;padding:2px 7px">${rm.status || "—"}</span>
        </div>
      </div>
      <div class="res-rdc-price">Rs. ${(rm.pricePerNight || 0).toFixed(2)}<span style="font-size:0.7rem;font-weight:400;opacity:.55">/night</span></div>
    </div>`).join("");

  document.getElementById("coReservationDetail").innerHTML = `
    <div class="res-view-header" style="margin-bottom:16px">
      <div>
        <div class="res-view-id">Reservation #${r.reservationId}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px">Guest: ${guest.name || "—"}</div>
      </div>
      <span class="badge badge-${(r.status || "").toLowerCase()}" style="font-size:0.85rem;padding:6px 14px">${r.status || "—"}</span>
    </div>

    <div style="margin-bottom:16px">
      <div class="res-section-label">Guest</div>
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

    <div class="res-summary-bar" style="margin-top:12px">
      <div>
        <div class="res-summary-bar-label">${nights} night${nights !== 1 ? "s" : ""} × ${rooms.length} room${rooms.length !== 1 ? "s" : ""}</div>
      </div>
      <div style="text-align:right">
        <div class="res-summary-bar-label">Estimated Total</div>
        <div class="res-summary-bar-amount">Rs. ${estimatedTotal.toFixed(2)}</div>
      </div>
    </div>`;
}

document.getElementById("coCompleteBtn").addEventListener("click", async () => {
  if (!checkoutReservation) return;

  const btn = document.getElementById("coCompleteBtn");
  btn.disabled = true; btn.textContent = "Processing…";

  try {
    const res  = await authFetch(API.RESERVATION_COMPLETE(checkoutReservation.reservationId), {
      method: "POST"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to complete reservation");

    // Snapshot before closeCheckoutModal() nulls out checkoutReservation
    const snapshotCheckIn  = checkoutReservation.checkInDate;
    const snapshotCheckOut = checkoutReservation.checkOutDate;

    showToast("Reservation completed! Opening bill…");
    closeCheckoutModal();
    loadBills();

    const r = data.result;
    openPrintBill({
      billId:         r.billId,
      generatedDate:  r.generatedDate,
      totalAmount:    r.totalAmount,
      numberOfNights: r.numberOfNights,
      guest:          r.guest,
      reservation: {
        reservationId:  r.reservationId,
        checkInDate:    snapshotCheckIn,
        checkOutDate:   snapshotCheckOut,
        numberOfNights: r.numberOfNights,
        status:         r.status
      },
      rooms: r.rooms
    });

  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px"><polyline points="20 6 9 17 4 12"/></svg> Complete Reservation`;
  }
});

// ─── Init ──────────────────────────────────────────────────
loadBills();
