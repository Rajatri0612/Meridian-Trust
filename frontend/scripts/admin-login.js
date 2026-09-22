if (Session.isLoggedIn()) {
  window.location.href = "admin.html";
}

const themeBtn = document.getElementById("theme-toggle-btn");

function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
}

applyTheme(localStorage.getItem("meridian_theme") === "dark");
themeBtn.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark);
  localStorage.setItem("meridian_theme", isDark ? "dark" : "light");
});

function setNote(element, message, kind) {
  element.textContent = message || "";
  element.className = `form-note${kind ? ` ${kind}` : ""}`;
}

document.getElementById("form-admin-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const note = document.getElementById("admin-login-note");
  const button = event.target.querySelector("button");
  const username = document.getElementById("admin-username-input").value.trim();
  const password = document.getElementById("admin-password-input").value;

  button.disabled = true;
  setNote(note, "Signing in…");
  try {
    const { access_token } = await Api.adminLogin(username, password);
    Session.setToken(access_token);
    window.location.href = "admin.html";
  } catch (error) {
    setNote(note, error.message, "error");
    button.disabled = false;
  }
});
