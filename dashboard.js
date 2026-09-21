if (!Session.isLoggedIn()) {
  window.location.href = "index.html";
}

let accountsCache = [];

function rupee(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setNote(el, message, kind) {
  el.textContent = message || "";
  el.className = "form-note" + (kind ? ` ${kind}` : "");
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

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.toggle("active", b === btn));
    Object.entries(views).forEach(([key, section]) => {
      section.classList.toggle("hidden", key !== btn.dataset.view);
    });
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
  const type = window.prompt("Account type (Savings or Current):", "Savings");
  if (!type) return;
  try {
    await Api.openAccount(type.trim());
    await loadAccounts();
  } catch (err) {
    alert(err.message);
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
  const amount = parseFloat(document.getElementById("deposit-amount").value);
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
  const amount = parseFloat(document.getElementById("withdraw-amount").value);
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
  const amount = parseFloat(document.getElementById("transfer-amount").value);
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
  const principal = parseFloat(document.getElementById("calc-principal").value) || 0;
  const rate = parseFloat(document.getElementById("calc-rate").value) || 0;
  const tenure = parseInt(document.getElementById("calc-tenure").value, 10) || 0;
  const result = document.getElementById("calc-result");

  if (principal <= 0 || rate <= 0 || tenure <= 0) {
    setNote(result, "Enter a principal, rate and tenure to calculate.", "error");
    return;
  }

  const emi = calculateEmi(principal, rate, tenure);
  const total = emi * tenure;
  setNote(
    result,
    `EMI: ${rupee(emi)} / month · Total payable: ${rupee(total)} · Total interest: ${rupee(total - principal)}`
  );
});

document.getElementById("form-loan-apply").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("loan-apply-note");
  const accountId = document.getElementById("loan-account").value;
  const principal = parseFloat(document.getElementById("loan-principal").value);
  const rate = parseFloat(document.getElementById("loan-rate").value);
  const tenure = parseInt(document.getElementById("loan-tenure").value, 10);
  const button = e.target.querySelector("button");
  button.disabled = true;
  try {
    await Api.applyLoan(accountId, principal, rate, tenure);
    setNote(note, "Loan approved and disbursed.", "success");
    e.target.reset();
    await loadAccounts();
    await loadLoans();
  } catch (err) {
    setNote(note, err.message, "error");
  } finally {
    button.disabled = false;
  }
});

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
          loan.status !== "CLOSED"
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
    await loadAccounts();
    await loadLoans();
  } catch (err) {
    console.error(err);
  }
})();
