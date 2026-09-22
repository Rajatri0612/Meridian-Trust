# Meridian Trust

Meridian Trust is a local banking dashboard demo with customer banking features and a separate admin control room.

## What It Includes

- Customer account opening with personal details
- Savings and current accounts
- Deposits, withdrawals, and transfers
- Transaction history
- Loan EMI calculation
- Loan applications requiring admin approval
- Loan disbursement after approval
- EMI payments
- Separate admin login and control room
- Light and dark themes

## Project Layout

```text
.
├── frontend/
│   ├── pages/       HTML pages
│   ├── scripts/     JavaScript and API client
│   └── styles/      Shared CSS
├── backend/
│   ├── main.py      FastAPI routes
│   ├── auth.py      Authentication helpers
│   ├── database.py  Database setup
│   ├── models.py    SQLAlchemy models
│   ├── schemas.py   API schemas
│   ├── data/        SQLite database
│   └── requirements.txt
├── .venv/           Python virtual environment
└── README.md
```

## Requirements

- Python 3.10 or newer
- A modern browser
- PowerShell, Command Prompt, or a terminal

## Setup

Run these commands from the project root:

### 1. Create and activate the virtual environment

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install backend dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

## Run the Application

Use two terminals. Keep both servers running.

### Terminal 1: Backend API

Run from the project root:

```powershell
$env:ADMIN_USERNAME = "your-admin-username"
$env:ADMIN_PASSWORD = "your-admin-password"
python -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- API: http://127.0.0.1:8000
- API documentation: http://127.0.0.1:8000/docs

### Terminal 2: Frontend

Run from the project root:

```powershell
python -m http.server 5500 --directory frontend
```

Open the customer sign-in page:

http://127.0.0.1:5500/pages/index.html

Other pages:

- Account opening: http://127.0.0.1:5500/pages/account-opening.html
- Customer dashboard: http://127.0.0.1:5500/pages/dashboard.html
- Admin sign-in: http://127.0.0.1:5500/pages/admin-login.html
- Admin control room: http://127.0.0.1:5500/pages/admin.html

## First Use

1. Start both servers.
2. Open the customer sign-in page.
3. Select **Open an account**.
4. Enter your name, contact details, address, account type, username, and password.
5. Submit the form. You will be signed in and taken to the customer dashboard.
6. Use the dashboard to manage accounts, money, transfers, and loans.

## Admin Use

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` before starting the backend.

1. Open the admin sign-in page.
2. Enter the configured admin credentials.
3. Use the control room to view customers, accounts, balances, transactions, and loans.
4. Approve or reject pending loan applications.

Customer sign-in cannot use the configured admin username.

## Loan Rules

The annual interest rate is selected automatically from the loan principal:

- Up to ₹50,000: 12%
- ₹50,000.01 to ₹200,000: 10%
- Above ₹200,000: 8%

New loans start as `PENDING`. They do not change the customer balance until an admin approves them. EMI payments are available only for approved loans.

## API Summary

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/account-opening` | Create a customer profile and initial account |
| `POST` | `/login` | Customer login |
| `POST` | `/admin/login` | Admin login |
| `GET` | `/accounts` | List customer accounts |
| `POST` | `/deposit` | Deposit money |
| `POST` | `/withdraw` | Withdraw money |
| `POST` | `/transfer` | Transfer money |
| `POST` | `/loans/apply` | Submit a loan application |
| `POST` | `/admin/loans/{id}/approve` | Approve and disburse a loan |
| `POST` | `/admin/loans/{id}/reject` | Reject a loan |
| `POST` | `/loans/{id}/pay-emi` | Pay an EMI |

## Database

The default database is:

```text
backend/data/meridian.db
```

It is created automatically when the backend starts. Delete it only when you want to reset all local users, accounts, transactions, and loans.

## Troubleshooting

### `Could not import module "main"`

Run the backend command from the project root and include `--app-dir backend`:

```powershell
python -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

### `Couldn't reach the server`

Make sure the backend is running on port `8000` and the frontend is opened through the HTTP server on port `5500`.

### Port already in use

Use another port, then open the matching URL. For example:

```powershell
python -m http.server 5501 --directory frontend
```

### Username already exists

Choose another username, or delete `backend/data/meridian.db` to reset the local demo database.

## Security Note

This project is for local development and demonstration. Production use would require stronger validation, secure secret management, HTTPS, restricted CORS, database migrations, rate limiting, and audit logging.
