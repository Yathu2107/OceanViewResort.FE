// js/auth.js — Login page logic

// Redirect if already logged in
if (getToken()) {
  window.location.href = "dashboard.html";
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const btn      = document.getElementById("loginBtn");
  const errEl    = document.getElementById("errorMsg");

  // Clear previous error
  errEl.textContent = "";
  errEl.classList.remove("show");

  // Basic validation
  if (!username) { showFieldError(errEl, "Username is required."); return; }
  if (!password) { showFieldError(errEl, "Password is required.");  return; }

  // Loading state
  btn.disabled    = true;
  btn.textContent = "Signing in…";

  try {
    const res  = await fetch(API.LOGIN, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showFieldError(errEl, data.text || "Invalid username or password.");
      return;
    }

    // Store auth data
    localStorage.setItem("token", data.result.token);
    localStorage.setItem("role",  data.result.role);
    localStorage.setItem("user",  JSON.stringify({
      name: data.result.name,
      role: data.result.role
    }));

    window.location.href = "dashboard.html";

  } catch (err) {
    showFieldError(errEl, "Cannot connect to server. Please check the backend is running on port 8080.");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Sign In";
  }
});

function showFieldError(el, msg) {
  el.textContent = msg;
  el.classList.add("show");
}
