// js/help.js — Help page logic

requireAuth();
initSidebar();

// ─── Tab switching ─────────────────────────────────────────
const tabBtns   = document.querySelectorAll(".help-tab-btn");
const tabPanels = document.querySelectorAll(".help-tab-panel");
const loaded    = { guidelines: false, faq: false, system: false };

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b  => b.classList.remove("active"));
    tabPanels.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");

    if (!loaded[tab]) {
      if (tab === "guidelines") loadGuidelines();
      if (tab === "faq")        loadFaq();
      if (tab === "system")     loadSystem();
    }
  });
});

// ─── Staff Guidelines ──────────────────────────────────────
async function loadGuidelines() {
  try {
    const res  = await authFetch(API.HELP_GUIDELINES);
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to load guidelines");

    const result = data.result || {};
    document.getElementById("guidelinesMeta").textContent =
      result.section || "Staff Guidelines";

    const items = result.guidelines || [];
    document.getElementById("guidelinesGrid").innerHTML = items.length
      ? items.map(g => {
          const steps = (g.description || "").split("\n").filter(Boolean);
          return `
            <div class="guideline-card">
              <div class="guideline-card-header">
                <div class="guideline-num">${g.id}</div>
                <div class="guideline-title">${g.title}</div>
              </div>
              <ul class="guideline-steps">
                ${steps.map(s => `<li>${s}</li>`).join("")}
              </ul>
            </div>`;
        }).join("")
      : `<p style="color:var(--text-muted)">No guidelines available.</p>`;

    loaded.guidelines = true;
  } catch (err) {
    document.getElementById("guidelinesGrid").innerHTML =
      `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

// ─── Reservation FAQ ───────────────────────────────────────
async function loadFaq() {
  try {
    const res  = await authFetch(API.HELP_FAQ);
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to load FAQ");

    const result = data.result || {};
    document.getElementById("faqMeta").textContent =
      result.section || "Reservation FAQ";

    const faqs = result.faqs || [];
    const listEl = document.getElementById("faqList");

    if (!faqs.length) {
      listEl.innerHTML = `<p style="color:var(--text-muted)">No FAQ entries available.</p>`;
      loaded.faq = true;
      return;
    }

    listEl.innerHTML = faqs.map((f, i) => `
      <div class="faq-item">
        <button class="faq-question" id="faqq-${i}" onclick="toggleFaq(${i})">
          <span>${f.question}</span>
          <svg class="faq-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" style="width:16px;height:16px">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="faq-answer" id="faqa-${i}">
          ${f.answer}
        </div>
      </div>`).join("");

    loaded.faq = true;
  } catch (err) {
    document.getElementById("faqList").innerHTML =
      `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

function toggleFaq(i) {
  const btn = document.getElementById(`faqq-${i}`);
  const ans = document.getElementById(`faqa-${i}`);
  const isOpen = btn.classList.contains("open");

  // Close all
  document.querySelectorAll(".faq-question").forEach(b => b.classList.remove("open"));
  document.querySelectorAll(".faq-answer").forEach(a => a.classList.remove("open"));

  // Open clicked if it was closed
  if (!isOpen) {
    btn.classList.add("open");
    ans.classList.add("open");
  }
}

// ─── System Help ───────────────────────────────────────────
const FEATURE_ICONS = {
  "Dashboard":              "📊",
  "Reservation Management": "📅",
  "Room Management":        "🛏️",
  "Guest Management":       "👥",
  "Billing System":         "💳",
  "User Management":        "⚙️"
};

async function loadSystem() {
  try {
    const res  = await authFetch(API.HELP_SYSTEM);
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to load system help");

    const result = data.result || {};
    document.getElementById("systemMeta").textContent =
      result.section || "System Help";

    const features = result.features || [];
    document.getElementById("systemGrid").innerHTML = features.length
      ? features.map(f => `
          <div class="feature-card">
            <div class="feature-icon">${FEATURE_ICONS[f.title] || "🔧"}</div>
            <div class="feature-name">${f.title}</div>
            <div class="feature-desc">${f.description}</div>
          </div>`).join("")
      : `<p style="color:var(--text-muted)">No features documented.</p>`;

    loaded.system = true;
  } catch (err) {
    document.getElementById("systemGrid").innerHTML =
      `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

// ─── Init: load first tab ──────────────────────────────────
loadGuidelines();
