// js/users.js — User Management (MANAGER only)

requireManager();   // Redirects non-managers automatically
initSidebar();

let allUsers   = [];
let editingUUID = null;

// ─── Load current user info ───────────────────────────────
async function loadCurrentUser() {
  try {
    const res  = await authFetch(API.ME);
    const data = await res.json();
    if (data.result) {
      const u = data.result;
      setEl("meInfo", `${u.name} (${u.username}) — ${u.role}`);
    }
  } catch (err) { /* non-critical */ }
}

// ─── NOTE: The backend may not expose GET /user (list all).
//     If such an endpoint exists, call it. Otherwise prompt users
//     to register new users via the form. We attempt a common path.
async function loadUsers() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `
    <tr><td colspan="5">
      <div class="spinner-wrap"><div class="spinner"></div></div>
    </td></tr>`;

  try {
    // Try GET /user or /users endpoint
    const res = await authFetch(`${BASE_URL}/user`);
    if (!res.ok) {
      // If no list endpoint — show helpful message
      tbody.innerHTML = `
        <tr><td colspan="5">
          <div class="empty-state">
            <div class="empty-state-icon">⚙️</div>
            <p>User list endpoint not available.<br/>Use <strong>Register User</strong> to add users.</p>
          </div>
        </td></tr>`;
      return;
    }

    const data = await res.json();
    allUsers = extractList(data);
    renderUsers(allUsers);
  } catch (err) {
    document.getElementById("tableBody").innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon">⚙️</div>
          <p>Could not load user list. Use <strong>Register User</strong> to add new users.</p>
        </div>
      </td></tr>`;
  }
}

// ─── Render table ─────────────────────────────────────────
function renderUsers(users) {
  const tbody = document.getElementById("tableBody");

  if (!users.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon">⚙️</div>
          <p>No users found</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong style="color:var(--text-primary)">${u.name}</strong></td>
      <td style="color:var(--text-muted);font-family:monospace;font-size:0.82rem">${u.username}</td>
      <td><span class="badge badge-${(u.role || "").toLowerCase()}">${u.role || "—"}</span></td>
      <td>
        <span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">
          ${u.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-outline btn-sm" onclick="openEditModal('${u.id}')">Edit</button>
        </div>
      </td>
    </tr>
  `).join("");
}

document.getElementById("registerBtn").addEventListener("click", openRegisterModal);
document.getElementById("closeRegModal").addEventListener("click", closeRegisterModal);
document.getElementById("cancelRegModal").addEventListener("click", closeRegisterModal);

// ─── Register Modal ───────────────────────────────────────
function openRegisterModal() {
  document.getElementById("regForm").reset();
  document.getElementById("regActive").checked = true;
  document.getElementById("regModal").classList.remove("hidden");
}

function closeRegisterModal() {
  document.getElementById("regModal").classList.add("hidden");
}

document.getElementById("regModal").addEventListener("click", function (e) {
  if (e.target === this) closeRegisterModal();
});

document.getElementById("regForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name      = document.getElementById("regName").value.trim();
  const username  = document.getElementById("regUsername").value.trim();
  const password  = document.getElementById("regPassword").value.trim();
  const role      = document.getElementById("regRole").value;
  const is_active = document.getElementById("regActive").checked;

  if (!name)     { showToast("Name is required",     "error"); return; }
  if (!username) { showToast("Username is required", "error"); return; }
  if (!password) { showToast("Password is required", "error"); return; }
  if (!role)     { showToast("Role is required",     "error"); return; }

  const saveBtn = document.getElementById("regSaveBtn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Registering…";

  try {
    // POST /user/register
    // Body: { name, username, password, role, is_active }
    const res  = await authFetch(API.REGISTER_USER, {
      method: "POST",
      body:   JSON.stringify({ name, username, password, role, is_active })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to register user");

    showToast("User registered successfully");
    closeRegisterModal();
    loadUsers();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Register User";
  }
});

// ─── Edit Modal ───────────────────────────────────────────
function openEditModal(uuid) {
  editingUUID = uuid;
  const user  = allUsers.find(u => u.id === uuid);

  if (user) {
    document.getElementById("editUsername").value       = user.username || "";
    document.getElementById("editName").value           = user.name     || "";
    document.getElementById("editPassword").value       = "";
    document.getElementById("editRole").value           = user.role     || "STAFF";
    if (user.is_active !== false) {
      document.getElementById("editActive").checked   = true;
    } else {
      document.getElementById("editInactive").checked = true;
    }
  } else {
    document.getElementById("editUsername").value  = "";
    document.getElementById("editName").value      = "";
    document.getElementById("editPassword").value  = "";
    document.getElementById("editRole").value      = "STAFF";
    document.getElementById("editActive").checked  = true;
  }

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  editingUUID = null;
}

document.getElementById("closeEditModal").addEventListener("click", closeEditModal);
document.getElementById("cancelEditModal").addEventListener("click", closeEditModal);

document.getElementById("editModal").addEventListener("click", function (e) {
  if (e.target === this) closeEditModal();
});

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name      = document.getElementById("editName").value.trim();
  const password  = document.getElementById("editPassword").value.trim();
  const role      = document.getElementById("editRole").value;
  const is_active = document.getElementById("editActive").checked;

  if (!name) { showToast("Name is required", "error"); return; }

  const saveBtn = document.getElementById("editSaveBtn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Updating…";

  const body = { name, role, is_active };
  if (password) body.password = password;

  try {
    const res  = await authFetch(API.UPDATE_USER(editingUUID), {
      method: "PUT",
      body:   JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.text || "Failed to update user");

    showToast("User updated successfully");
    closeEditModal();
    loadUsers();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Update User";
  }
});

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Init ─────────────────────────────────────────────────
loadCurrentUser();
loadUsers();
