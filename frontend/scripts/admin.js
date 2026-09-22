if (!Session.isLoggedIn()) {
  window.location.href = "index.html";
}

const adminContent = document.getElementById("admin-content");
const adminNote = document.getElementById("admin-note");
const themeBtn = document.getElementById("theme-toggle-btn");

function rupee(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

document.getElementById("logout-btn").addEventListener("click", () => {
  Session.clearToken();
  window.location.href = "index.html";
});

document.getElementById("refresh-btn").addEventListener("click", loadAdminOverview);

function setAdminNote(message, kind = "") {
  adminNote.textContent = message;
  adminNote.className = `form-note ${kind}`;
}

function statusClass(status) {
  return { APPROVED: "approved", CLOSED: "closed", REJECTED: "rejected" }[status] || "pending";
}

function cell(text) {
  const element = document.createElement("td");
  element.textContent = text;
  return element;
}

function addRow(body, values) {
  const row = document.createElement("tr");
  values.forEach((value) => row.appendChild(cell(value)));
  body.appendChild(row);
}

function renderMetrics(metrics) {
  const items = [
    ["Customers", metrics.users],
    ["Accounts", metrics.accounts],
    ["Total balances", rupee(metrics.total_balance)],
    ["Loan principal", rupee(metrics.loan_principal)],
    ["Active loans", metrics.active_loans],
  ];
  document.getElementById("metrics-grid").innerHTML = items.map(([label, value]) => `
    <div class="metric-card"><span>${label}</span><strong>${value}</strong></div>
  `).join("");
}

function renderOverview(data) {
  renderMetrics(data.metrics);
  document.getElementById("admin-username").textContent = data.users.find((user) => user.id === data.admin_id)?.username || "authorized";

  const usersBody = document.getElementById("users-body");
  usersBody.innerHTML = "";
  data.users.forEach((user) => addRow(usersBody, [user.id, user.username, user.account_count]));
  document.getElementById("users-count").textContent = `${data.users.length} total`;

  const accountsBody = document.getElementById("accounts-body");
  accountsBody.innerHTML = "";
  data.accounts.forEach((account) => addRow(accountsBody, [account.username, account.account_type, rupee(account.balance)]));
  document.getElementById("accounts-count").textContent = `${data.accounts.length} total`;

  const loansBody = document.getElementById("loans-body");
  loansBody.innerHTML = "";
  data.loans.forEach((loan) => {
    const row = document.createElement("tr");
    [loan.id, loan.username, rupee(loan.principal), rupee(loan.emi_amount), `${loan.months_paid} / ${loan.tenure_months} mo`].forEach((value) => row.appendChild(cell(value)));
    const status = document.createElement("td");
    status.innerHTML = `<span class="pill ${statusClass(loan.status)}">${loan.status}</span>`;
    row.appendChild(status);
    const action = document.createElement("td");
    if (loan.status === "PENDING") {
      action.innerHTML = `
        <button class="btn btn-brass btn-small" data-loan-action="approve" data-loan-id="${loan.id}">Approve</button>
        <button class="btn btn-ghost btn-small" data-loan-action="reject" data-loan-id="${loan.id}">Reject</button>
      `;
    } else {
      action.textContent = "-";
    }
    row.appendChild(action);
    loansBody.appendChild(row);
  });
  document.getElementById("loans-count").textContent = `${data.loans.length} total`;

  loansBody.querySelectorAll("button[data-loan-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.loanAction;
      button.disabled = true;
      try {
        if (action === "approve") {
          await Api.approveLoan(button.dataset.loanId);
        } else {
          await Api.rejectLoan(button.dataset.loanId);
        }
        await loadAdminOverview();
      } catch (error) {
        setAdminNote(error.message, "error");
        button.disabled = false;
      }
    });
  });

  const transactionsBody = document.getElementById("transactions-body");
  transactionsBody.innerHTML = "";
  data.transactions.forEach((transaction) => addRow(transactionsBody, [
    new Date(transaction.timestamp).toLocaleString("en-IN"),
    transaction.username,
    transaction.transaction_type,
    `#${transaction.account_id}`,
    rupee(transaction.amount),
  ]));

  adminContent.classList.remove("hidden");
}

async function loadAdminOverview() {
  const button = document.getElementById("refresh-btn");
  button.disabled = true;
  setAdminNote("Loading control room data…");
  try {
    const data = await Api.getAdminOverview();
    renderOverview(data);
    setAdminNote(`Updated ${new Date().toLocaleTimeString("en-IN")}.`, "success");
  } catch (error) {
    setAdminNote(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

loadAdminOverview();
