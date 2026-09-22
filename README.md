# Meridian Trust

Meridian Trust is a local banking dashboard demo. It provides user registration and login, savings/current accounts, deposits, withdrawals, transfers, transaction history, and loan management with EMI calculation and repayment.

The project has a static frontend and a FastAPI backend. Data is stored in a local SQLite database.

## Features

- User registration and login with bearer-token authentication
- Automatic savings account creation for new users
- Additional savings or current accounts
- Account balances and transaction history
- Deposits and withdrawals with positive-amount validation
- Transfers between accounts
- Loan EMI calculator
- Loan applications with principal-based interest pricing and immediate demo disbursement
- EMI payments and loan status tracking

## Project Structure

```text
.
├── index.html          Sign-in and registration page
├── dashboard.html      Authenticated banking dashboard
├── style.css           Frontend styles
├── api.js              Frontend API client and session storage
├── auth.js             Sign-in and registration behavior
├── dashboard.js        Dashboard behavior and form handlers
├── main.py             FastAPI application and route definitions
├── auth.py             Password hashing and JWT authentication
├── database.py         SQLAlchemy engine and database session setup
├── models.py           SQLAlchemy database models
├── schemas.py          Pydantic request and response schemas
├── requirements.txt    Python dependencies
└── meridian.db         SQLite database, created automatically
```

## Requirements

- Python 3.10 or newer
- A modern web browser
- VS Code Live Server or Python's built-in HTTP server

Python 3.14 is supported by the current development environment.

## Setup

Open a terminal in the project directory.

### 1. Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
```

macOS/Linux:

```bash
python3 -m venv .venv
```

### 2. Activate the environment

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

If PowerShell blocks activation, run PowerShell as the current user and allow local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Run the Application

The backend and frontend use separate terminals.

### Terminal 1: Start FastAPI

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

### Terminal 2: Serve the frontend

From the same project directory:

```bash
python -m http.server 5500
```

Open the application at:

```text
http://127.0.0.1:5500/index.html
```

You can also open the project folder in VS Code and use the Live Server extension. The frontend API client is configured in `api.js` to call `http://127.0.0.1:8000`.

Do not open `index.html` directly with a `file://` URL. Serve it over HTTP so browser requests work consistently.

## First Use

1. Open the frontend URL.
2. Select **Open an account**.
3. Create a username and password.
4. The backend creates the user and an initial savings account.
5. The frontend signs you in and redirects to the dashboard.
6. Use the dashboard navigation to manage accounts, money movement, and loans.

## API Reference

All protected endpoints require:

```http
Authorization: Bearer <access_token>
```

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/register` | Create a user and initial savings account |
| `POST` | `/login` | Return a JWT access token; accepts OAuth2 form data |
| `GET` | `/me` | Return the authenticated user |

Registration JSON:

```json
{
  "username": "ada",
  "password": "correct-horse-battery-staple"
}
```

Login form fields:

```text
username=ada&password=correct-horse-battery-staple
```

### Accounts and Transactions

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/accounts` | List the authenticated user's accounts |
| `POST` | `/accounts` | Open another account |
| `GET` | `/accounts/{account_id}/transactions` | List an account's transactions |
| `POST` | `/deposit` | Deposit money into an owned account |
| `POST` | `/withdraw` | Withdraw money from an owned account |
| `POST` | `/transfer` | Transfer money between accounts |

Example account request:

```json
{
  "account_type": "Current"
}
```

Example deposit request:

```json
{
  "account_id": 1,
  "amount": 2500
}
```

### Loans

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/loans` | List the authenticated user's loans |
| `POST` | `/loans/apply` | Apply for a loan and disburse it immediately in this demo |
| `POST` | `/loans/{loan_id}/pay-emi` | Pay one EMI |

Example loan request:

```json
{
  "account_id": 1,
  "principal": 100000,
  "tenure_months": 24
}
```

The annual rate is set automatically from the principal: 12% for loans up to ₹50,000, 10% for loans up to ₹200,000, and 8% above ₹200,000.

## Database and Configuration

By default, the application uses:

```text
sqlite:///./meridian.db
```

The database is created automatically when `main.py` starts. Tables are also created automatically through SQLAlchemy's `Base.metadata.create_all` call.

Optional environment variables can be placed in a `.env` file:

```env
DATABASE_URL=sqlite:///./meridian.db
SECRET_KEY=replace-this-with-a-long-random-secret
ALGORITHM=HS256
```

For a remote database, set `DATABASE_URL` to a SQLAlchemy-compatible URL and install the appropriate database driver.

## Troubleshooting

### `Not Found` from the API

Confirm that:

- FastAPI is running on port `8000`.
- The frontend is using `http://127.0.0.1:8000` in `api.js`.
- The API URL has no trailing slash, because request paths already begin with `/`.

### `Couldn't reach the server`

Start the backend in a separate terminal:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Registration returns a generic error

Check the FastAPI terminal for the traceback. Also confirm that dependencies were installed inside the active virtual environment:

```bash
python -m pip install -r requirements.txt
```

### Username already exists

Usernames are unique. Use another username or delete `meridian.db` for a fresh local demo database. Deleting the database removes all users, accounts, transactions, and loans.

## Security Notes

This project is intended for local development and demonstration. Before production use, add stronger password and input policies, database migrations, HTTPS, restricted CORS origins, secure secret management, refresh-token handling, rate limiting, audit logging, and transactional safeguards around money movement.
