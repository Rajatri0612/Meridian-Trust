// Base URL of the FastAPI backend (main.py). Change this if you deploy the
// API somewhere other than localhost.
const API_BASE = "http://127.0.0.1:8000";

const Session = {
  KEY: "meridian_token",
  getToken() {
    return localStorage.getItem(this.KEY);
  },
  setToken(token) {
    localStorage.setItem(this.KEY, token);
  },
  clearToken() {
    localStorage.removeItem(this.KEY);
  },
  isLoggedIn() {
    return !!this.getToken();
  },
};

async function request(path, { method = "GET", body, auth = false, form = false } = {}) {
  const headers = {};
  let payload;

  if (form) {
    // OAuth2PasswordRequestForm on the backend expects
    // application/x-www-form-urlencoded, not JSON.
    payload = new URLSearchParams(body).toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = Session.getToken();
    if (!token) throw new Error("You need to sign in first.");
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch (networkErr) {
    throw new Error("Couldn't reach the server. Is the API running?");
  }

  if (res.status === 401) {
    Session.clearToken();
    if (!location.pathname.endsWith("index.html")) {
      window.location.href = "index.html";
    }
    throw new Error("Your session has expired — please sign in again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // No JSON body (e.g. some error responses) — that's fine.
  }

  if (!res.ok) {
    const detail = data && data.detail;
    let message = "Something went wrong.";
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length) {
      // FastAPI validation error shape: [{ msg, loc, ... }, ...]
      message = detail.map((d) => d.msg).join(" ");
    }
    throw new Error(message);
  }

  return data;
}

const Api = {
  register(username, password) {
    return request("/register", { method: "POST", body: { username, password } });
  },
  openCustomerAccount(details) {
    return request("/account-opening", { method: "POST", body: details });
  },
  login(username, password) {
    return request("/login", { method: "POST", body: { username, password }, form: true });
  },
  adminLogin(username, password) {
    return request("/admin/login", { method: "POST", body: { username, password }, form: true });
  },
  me() {
    return request("/me", { auth: true });
  },
  getAdminOverview() {
    return request("/admin/overview", { auth: true });
  },
  approveLoan(loanId) {
    return request(`/admin/loans/${loanId}/approve`, { method: "POST", auth: true });
  },
  rejectLoan(loanId) {
    return request(`/admin/loans/${loanId}/reject`, { method: "POST", auth: true });
  },
  getAccounts() {
    return request("/accounts", { auth: true });
  },
  openAccount(accountType) {
    return request("/accounts", { method: "POST", body: { account_type: accountType }, auth: true });
  },
  getTransactions(accountId) {
    return request(`/accounts/${accountId}/transactions`, { auth: true });
  },
  deposit(accountId, amount) {
    return request("/deposit", { method: "POST", body: { account_id: Number(accountId), amount }, auth: true });
  },
  withdraw(accountId, amount) {
    return request("/withdraw", { method: "POST", body: { account_id: Number(accountId), amount }, auth: true });
  },
  transfer(fromAccountId, toAccountId, amount) {
    return request("/transfer", {
      method: "POST",
      body: {
        from_account_id: Number(fromAccountId),
        to_account_id: Number(toAccountId),
        amount,
      },
      auth: true,
    });
  },
  getLoans() {
    return request("/loans", { auth: true });
  },
  applyLoan(accountId, principal, tenureMonths) {
    return request("/loans/apply", {
      method: "POST",
      body: {
        account_id: Number(accountId),
        principal,
        tenure_months: tenureMonths,
      },
      auth: true,
    });
  },
  payEmi(loanId) {
    return request(`/loans/${loanId}/pay-emi`, { method: "POST", auth: true });
  },
};
