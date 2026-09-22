if (!Session.isLoggedIn()) {
  window.location.href = "index.html";
}

let accountsCache = [];

function rupee(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numericInputValue(input) {
  return parseFloat(input.value.replace(/,/g, ""));
}

function formatNumberInput(input) {
  const rawValue = input.value.replace(/,/g, "");
  const [wholePart, decimalPart] = rawValue.split(".");
  if (!/^\d*$/.test(wholePart) || (decimalPart !== undefined && !/^\d*$/.test(decimalPart))) {
    return;
  }
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "");
  const formattedWhole = normalizedWhole
    ? Number(normalizedWhole).toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : "";
  input.value = decimalPart === undefined ? formattedWhole : `${formattedWhole}.${decimalPart}`;
}

document.querySelectorAll("#deposit-amount, #withdraw-amount, #transfer-amount, #calc-principal, #loan-principal")
  .forEach((input) => {
    input.addEventListener("input", () => formatNumberInput(input));
    input.addEventListener("blur", () => formatNumberInput(input));
  });

function setNote(el, message, kind) {
  el.textContent = message || "";
  el.className = "form-note" + (kind ? ` ${kind}` : "");
}

function loanRateForPrincipal(principal) {
  if (principal <= 50000) return 12;
  if (principal <= 200000) return 10;
  return 8;
}

function calculateLoanTerms(principal, tenure) {
  const annualRate = loanRateForPrincipal(principal);
  const monthlyRate = annualRate / 12 / 100;
  const factor = (1 + monthlyRate) ** tenure;
  const emi = principal * monthlyRate * factor / (factor - 1);
  return { annualRate, interest: emi * tenure - principal, emi };
}

// ---------------------------------------------------------------
// Dark Mode Toggle
// ---------------------------------------------------------------
const themeBtn = document.getElementById("theme-toggle-btn");

function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  if (themeBtn) {
    themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
  }
}

// Load initial theme choice from localStorage
const savedTheme = localStorage.getItem("meridian_theme");
applyTheme(savedTheme === "dark");

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const isDarkNow = !document.body.classList.contains("dark");
    applyTheme(isDarkNow);
    localStorage.setItem("meridian_theme", isDarkNow ? "dark" : "light");
  });
}

// ---------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------
const navItems = document.querySelectorAll(".nav-item");
const views = {
  overview: document.getElementById("view-overview"),
  deposit: document.getElementById("view-deposit"),
  withdraw: document.getElementById("view-withdraw"),
  transfer: document.getElementById("view-transfer"),
  loans: document.getElementById("view-loans"),
};
let currentView = "overview";

function showView(viewName) {
  if (!views[viewName]) return;
  currentView = viewName;
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  Object.entries(views).forEach(([key, section]) => {
    section.classList.toggle("hidden", key !== viewName);
  });
}

navItems.forEach((btn) => {
  if (!btn.dataset.view) return;
  btn.addEventListener("click", () => {
    showView(btn.dataset.view);
  });
});

document.getElementById("logout-btn").addEventListener("click", () => {
  Session.clearToken();
  window.location.href = "index.html";
});

// ---------------------------------------------------------------
// Account selects (shared across overview / deposit / withdraw / transfer / loans)
// ---------------------------------------------------------------
function fillAccountSelect(select) {
  const previous = select.value;
  select.innerHTML = "";
  accountsCache.forEach((acc) => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = `${acc.account_type} · #${acc.id} · ${rupee(acc.balance)}`;
    select.appendChild(opt);
  });
  if ([...select.options].some((o) => o.value === previous)) {
    select.value = previous;
  }
}

function refreshAllAccountSelects() {
  ["overview-account-select", "deposit-account", "withdraw-account", "transfer-from", "loan-account"].forEach(
    (id) => fillAccountSelect(document.getElementById(id))
  );
}

// ---------------------------------------------------------------
// Overview: account list + transaction ledger
// ---------------------------------------------------------------
function renderAccountsList() {
  const container = document.getElementById("accounts-list");
  container.innerHTML = "";
  accountsCache.forEach((acc) => {
    const row = document.createElement("div");
    row.className = "account-row";
    row.innerHTML = `
      <div>
        <div class="id">${acc.account_type} account</div>
        <div class="type">Account #${acc.id}</div>
      </div>
      <div class="type">${acc.account_type}</div>
      <div class="balance numeral">${rupee(acc.balance)}</div>
    `;
    container.appendChild(row);
  });
}

async function renderTransactions(accountId) {
  const body = document.getElementById("overview-tx-body");
  const empty = document.getElementById("overview-tx-empty");
  body.innerHTML = "";
  if (!accountId) {
    empty.classList.remove("hidden");
    return;
  }

  const txs = await Api.getTransactions(accountId);
  empty.classList.toggle("hidden", txs.length > 0);

  txs.forEach((tx) => {
    const positive = tx.amount >= 0;
    const date = new Date(tx.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const description =
      tx.transaction_type === "TRANSFER"
        ? positive
          ? "Incoming transfer"
          : "Outgoing transfer"
        : tx.transaction_type === "LOAN_DISBURSEMENT"
        ? "Loan disbursement"
        : tx.transaction_type === "EMI_PAYMENT"
        ? "Loan EMI payment"
        : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${tx.transaction_type}</td>
      <td>${description}</td>
      <td class="amount ${positive ? "pos" : "neg"}">${positive ? "+" : ""}${rupee(tx.amount)}</td>
    `;
    body.appendChild(tr);
  });
}

document.getElementById("overview-account-select").addEventListener("change", (e) => {
  renderTransactions(e.target.value);
});

document.getElementById("open-account-btn").addEventListener("click", async () => {
  const type = document.getElementById("new-account-type").value;
  const button = document.getElementById("open-account-btn");
  button.disabled = true;
  try {
    await Api.openAccount(type);
    await loadAccounts();
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
  }
});

async function loadAccounts() {
  accountsCache = await Api.getAccounts();
  renderAccountsList();
  refreshAllAccountSelects();
  const select = document.getElementById("overview-account-select");
  await renderTransactions(select.value);
}

// ---------------------------------------------------------------
// Deposit / Withdraw / Transfer
// ---------------------------------------------------------------
document.getElementById("form-deposit").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("deposit-note");
  const accountId = document.getElementById("deposit-account").value;
  const amount = numericInputValue(document.getElementById("deposit-amount"));
  const button = e.target.querySelector("button");
  button.disabled = true;
  try {
    await Api.deposit(accountId, amount);
    setNote(note, "Deposit complete.", "success");
    e.target.reset();
    await loadAccounts();
  } catch (err) {
    setNote(note, err.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("form-withdraw").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("withdraw-note");
  const accountId = document.getElementById("withdraw-account").value;
  const amount = numericInputValue(document.getElementById("withdraw-amount"));
  const button = e.target.querySelector("button");
  button.disabled = true;
  try {
    await Api.withdraw(accountId, amount);
    setNote(note, "Withdrawal complete.", "success");
    e.target.reset();
    await loadAccounts();
  } catch (err) {
    setNote(note, err.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("form-transfer").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("transfer-note");
  const fromId = document.getElementById("transfer-from").value;
  const toId = document.getElementById("transfer-to").value;
  const amount = numericInputValue(document.getElementById("transfer-amount"));
  const button = e.target.querySelector("button");
  button.disabled = true;
  try {
    await Api.transfer(fromId, toId, amount);
    setNote(note, "Transfer complete.", "success");
    e.target.reset();
    await loadAccounts();
  } catch (err) {
    setNote(note, err.message, "error");
  } finally {
    button.disabled = false;
  }
});

// ---------------------------------------------------------------
// Loans: EMI calculator + application + repayment
// ---------------------------------------------------------------
function calculateEmi(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

document.getElementById("calc-btn").addEventListener("click", () => {
  const principal = numericInputValue(document.getElementById("calc-principal")) || 0;
  const tenure = parseInt(document.getElementById("calc-tenure").value, 10) || 0;
  const result = document.getElementById("calc-result");

  if (principal <= 0 || tenure <= 0) {
    setNote(result, "Enter a principal and tenure to calculate.", "error");
    return;
  }

  const terms = calculateLoanTerms(principal, tenure);
  const emi = terms.emi;
  const total = emi * tenure;
  setNote(
    result,
    `Rate: ${terms.annualRate}% p.a. · EMI: ${rupee(emi)} / month · Total payable: ${rupee(total)} · Total interest: ${rupee(total - principal)}`
  );
});

document.getElementById("form-loan-apply").addEventListener("submit", async (e) => {
  e.preventDefault();
  const viewBeforeRefresh = currentView;
  const note = document.getElementById("loan-apply-note");
  const accountId = document.getElementById("loan-account").value;
  const principal = numericInputValue(document.getElementById("loan-principal"));
  const tenure = parseInt(document.getElementById("loan-tenure").value, 10);
  const button = e.target.querySelector("button");
  button.disabled = true;
  try {
    await Api.applyLoan(accountId, principal, tenure);
    setNote(note, "Loan application submitted for admin approval.", "success");
    e.target.reset();
    await loadAccounts();
    await loadLoans();
    showView(viewBeforeRefresh);
  } catch (err) {
    setNote(note, err.message, "error");
  } finally {
    button.disabled = false;
  }
});

function updateLoanEstimate(principalId, tenureId, interestId) {
  const principal = numericInputValue(document.getElementById(principalId));
  const tenure = parseInt(document.getElementById(tenureId).value, 10);
  const output = document.getElementById(interestId);
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(tenure) || tenure <= 0) {
    output.textContent = "Calculated from principal";
    return;
  }
  const terms = calculateLoanTerms(principal, tenure);
  output.textContent = `${rupee(terms.interest)} at ${terms.annualRate}% p.a.`;
}

document.getElementById("calc-principal").addEventListener("input", () =>
  updateLoanEstimate("calc-principal", "calc-tenure", "calc-interest")
);
document.getElementById("calc-tenure").addEventListener("input", () =>
  updateLoanEstimate("calc-principal", "calc-tenure", "calc-interest")
);
document.getElementById("loan-principal").addEventListener("input", () =>
  updateLoanEstimate("loan-principal", "loan-tenure", "loan-interest")
);
document.getElementById("loan-tenure").addEventListener("input", () =>
  updateLoanEstimate("loan-principal", "loan-tenure", "loan-interest")
);

function statusPillClass(status) {
  return { APPROVED: "approved", CLOSED: "closed", REJECTED: "rejected", PENDING: "pending" }[status] || "pending";
}

async function loadLoans() {
  const loans = await Api.getLoans();
  const container = document.getElementById("loans-list");
  const empty = document.getElementById("loans-empty");
  container.innerHTML = "";
  empty.classList.toggle("hidden", loans.length > 0);

  loans.forEach((loan) => {
    const remainingMonths = Math.max(loan.tenure_months - loan.months_paid, 0);
    const outstanding = loan.emi_amount * remainingMonths;

    const card = document.createElement("div");
    card.className = "loan-card";
    card.innerHTML = `
      <div class="loan-head">
        <strong>Loan #${loan.id} · Account #${loan.account_id}</strong>
        <span class="pill ${statusPillClass(loan.status)}">${loan.status}</span>
      </div>
      <div class="loan-figures">
        <div>Principal<strong>${rupee(loan.principal)}</strong></div>
        <div>EMI<strong>${rupee(loan.emi_amount)}</strong></div>
        <div>Paid<strong>${loan.months_paid} / ${loan.tenure_months} mo</strong></div>
        <div>Outstanding<strong>${rupee(outstanding)}</strong></div>
      </div>
      <div class="loan-actions">
        ${
          loan.status === "APPROVED"
            ? `<button class="btn btn-brass btn-small" data-loan-id="${loan.id}">Pay EMI</button>`
            : ""
        }
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll("button[data-loan-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await Api.payEmi(btn.dataset.loanId);
        await loadAccounts();
        await loadLoans();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
(async function init() {
  try {
    const me = await Api.me();
    document.getElementById("who-username").textContent = me.username;
    try {
      await Api.getAdminOverview();
      document.getElementById("admin-nav-group").classList.remove("hidden");
    } catch (adminError) {
      // Non-admin users should not see the admin navigation.
    }
    await loadAccounts();
    await loadLoans();
  } catch (err) {
    console.error(err);
  }
})();
