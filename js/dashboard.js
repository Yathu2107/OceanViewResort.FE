// js/dashboard.js — Dashboard page logic

requireAuth();
initSidebar();

async function loadDashboard() {
  try {
    // Fetch both endpoints in parallel
    const [statsRes, roomStatusRes] = await Promise.all([
      authFetch(API.DASHBOARD_STATS),
      authFetch(API.DASHBOARD_ROOMS)
    ]);

    // ── Statistics ──────────────────────────────────────
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const d = statsData.result;

      // Room statistics
      const s = d.room_statistics || {};
      setEl("totalRooms",       s.total       ?? "—");
      setEl("availableRooms",   s.available   ?? "—");
      setEl("maintenanceRooms", s.maintenance ?? "—");

      // Total revenue
      const rev = d.total_revenue ?? null;
      setEl("totalRevenue", rev !== null ? "Rs. " + Number(rev).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

      // Status bar percentages (available + maintenance only)
      const p = d.percentages || {};
      const avail = parseFloat(p.available_percentage)   || 0;
      const maint = parseFloat(p.maintenance_percentage) || 0;

      setStyle("availBar", "width", avail + "%");
      setStyle("maintBar", "width", maint + "%");

      setEl("availPct", avail.toFixed(1) + "%");
      setEl("maintPct", maint.toFixed(1) + "%");
    }

    // ── Room Availability Rate ───────────────────────────
    if (roomStatusRes.ok) {
      const roomData = await roomStatusRes.json();
      const rate = roomData.result?.availability_rate ?? null;
      const display = rate !== null ? rate : "—";
      setEl("availRate", display);

      // Animate SVG ring (circumference of r=48 circle = 2π×48 ≈ 301.6)
      const rateNum = parseFloat(rate) || 0;
      const circ = 301.6;
      const fill = (rateNum / 100) * circ;
      const arc = document.getElementById("rateArc");
      if (arc) arc.setAttribute("stroke-dasharray", `${fill} ${circ}`);
    }

  } catch (err) {
    console.error(err);
    showToast("Failed to load dashboard data", "error");
  }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}

loadDashboard();
