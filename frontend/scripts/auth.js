// If already signed in, skip straight to the dashboard.
if (Session.isLoggedIn()) {
  window.location.href = "dashboard.html";
}

const tabLogin = document.getElementById("tab-login");
const paneLogin = document.getElementById("pane-login");

// Theme Toggle Logic for index.html
const themeBtn = document.getElementById("theme-toggle-btn");

function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  if (themeBtn) {
    themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
  }
}

// Load initial theme from localStorage
const savedTheme = localStorage.getItem("meridian_theme");
applyTheme(savedTheme === "dark");

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const isDarkNow = !document.body.classList.contains("dark");
    applyTheme(isDarkNow);
    localStorage.setItem("meridian_theme", isDarkNow ? "dark" : "light");
  });
}

function setNote(el, message, kind) {
  el.textContent = message || "";
  el.className = "form-note" + (kind ? ` ${kind}` : "");
}

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("login-note");
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const button = e.target.querySelector("button");

  setNote(note, "Signing in…");
  button.disabled = true;
  try {
    const { access_token } = await Api.login(username, password);
    Session.setToken(access_token);
    window.location.href = "dashboard.html";
  } catch (err) {
    setNote(note, err.message, "error");
    button.disabled = false;
  }
});

