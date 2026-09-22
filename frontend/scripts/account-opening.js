if (Session.isLoggedIn()) {
  window.location.href = "dashboard.html";
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

document.getElementById("form-account-opening").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const note = document.getElementById("account-opening-note");
  const button = form.querySelector("button[type=submit]");
  const details = {
    first_name: document.getElementById("first-name").value.trim(),
    last_name: document.getElementById("last-name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    account_type: document.getElementById("account-type").value,
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
  };

  button.disabled = true;
  setNote(note, "Creating your account…");
  try {
    await Api.openCustomerAccount(details);
    const { access_token } = await Api.login(details.username, details.password);
    Session.setToken(access_token);
    window.location.href = "dashboard.html";
  } catch (error) {
    setNote(note, error.message, "error");
    button.disabled = false;
  }
});
