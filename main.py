from datetime import timedelta
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meridian Trust API")

# The static frontend is opened directly (or served separately), so allow
# any origin to call the API during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------
# Auth
# ---------------------------------------------------------------
@app.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="That username is already taken.")

    user = models.User(username=payload.username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    # Every new customer gets a savings account to start, per the UI copy.
    account = models.Account(user_id=user.id, account_type="Savings", balance=0.0)
    db.add(account)
    db.commit()

    return user


@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------
def _get_owned_account(account_id: int, current_user: models.User, db: Session) -> models.Account:
    account = (
        db.query(models.Account)
        .filter(models.Account.id == account_id, models.Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    return account


@app.get("/accounts", response_model=List[schemas.AccountOut])
def list_accounts(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Account).filter(models.Account.user_id == current_user.id).all()


@app.post("/accounts", response_model=schemas.AccountOut, status_code=status.HTTP_201_CREATED)
def open_account(
    payload: schemas.AccountCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = models.Account(user_id=current_user.id, account_type=payload.account_type or "Savings", balance=0.0)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@app.get("/accounts/{account_id}/transactions", response_model=List[schemas.TransactionOut])
def list_transactions(
    account_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(account_id, current_user, db)
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.account_id == account.id)
        .order_by(models.Transaction.timestamp.desc())
        .all()
    )


# ---------------------------------------------------------------
# Money movement
# ---------------------------------------------------------------
@app.post("/deposit", response_model=schemas.AccountOut)
def deposit(
    payload: schemas.DepositRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(payload.account_id, current_user, db)
    account.balance += payload.amount
    db.add(models.Transaction(account_id=account.id, amount=payload.amount, transaction_type="DEPOSIT"))
    db.commit()
    db.refresh(account)
    return account


@app.post("/withdraw", response_model=schemas.AccountOut)
def withdraw(
    payload: schemas.WithdrawRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(payload.account_id, current_user, db)
    if account.balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds.")
    account.balance -= payload.amount
    db.add(models.Transaction(account_id=account.id, amount=-payload.amount, transaction_type="WITHDRAWAL"))
    db.commit()
    db.refresh(account)
    return account


@app.post("/transfer", response_model=schemas.AccountOut)
def transfer(
    payload: schemas.TransferRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account.")

    from_account = _get_owned_account(payload.from_account_id, current_user, db)
    to_account = db.query(models.Account).filter(models.Account.id == payload.to_account_id).first()
    if not to_account:
        raise HTTPException(status_code=404, detail="Destination account not found.")
    if from_account.balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds.")

    from_account.balance -= payload.amount
    to_account.balance += payload.amount
    db.add(models.Transaction(account_id=from_account.id, amount=-payload.amount, transaction_type="TRANSFER"))
    db.add(models.Transaction(account_id=to_account.id, amount=payload.amount, transaction_type="TRANSFER"))
    db.commit()
    db.refresh(from_account)
    return from_account


# ---------------------------------------------------------------
# Loans
# ---------------------------------------------------------------
def _loan_annual_rate(principal: float) -> float:
    if principal <= 50000:
        return 12.0
    if principal <= 200000:
        return 10.0
    return 8.0


def _calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    monthly_rate = annual_rate / 12 / 100
    if monthly_rate == 0:
        return round(principal / tenure_months, 2)
    factor = (1 + monthly_rate) ** tenure_months
    return round(principal * monthly_rate * factor / (factor - 1), 2)


@app.get("/loans", response_model=List[schemas.LoanOut])
def list_loans(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Loan).filter(models.Loan.user_id == current_user.id).all()


@app.post("/loans/apply", response_model=schemas.LoanOut, status_code=status.HTTP_201_CREATED)
def apply_loan(
    payload: schemas.LoanApplyRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_owned_account(payload.account_id, current_user, db)
    annual_rate = _loan_annual_rate(payload.principal)
    emi = _calculate_emi(payload.principal, annual_rate, payload.tenure_months)

    loan = models.Loan(
        user_id=current_user.id,
        account_id=account.id,
        principal=payload.principal,
        annual_rate=annual_rate,
        tenure_months=payload.tenure_months,
        emi_amount=emi,
        months_paid=0,
        status="APPROVED",
    )
    db.add(loan)

    # For this demo, approved loans are disbursed immediately into the
    # chosen account.
    account.balance += payload.principal
    db.add(
        models.Transaction(
            account_id=account.id, amount=payload.principal, transaction_type="LOAN_DISBURSEMENT"
        )
    )

    db.commit()
    db.refresh(loan)
    return loan


@app.post("/loans/{loan_id}/pay-emi", response_model=schemas.LoanOut)
def pay_emi(
    loan_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loan = (
        db.query(models.Loan)
        .filter(models.Loan.id == loan_id, models.Loan.user_id == current_user.id)
        .first()
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    if loan.status == "CLOSED":
        raise HTTPException(status_code=400, detail="This loan is already closed.")

    account = db.query(models.Account).filter(models.Account.id == loan.account_id).first()
    if account.balance < loan.emi_amount:
        raise HTTPException(status_code=400, detail="Insufficient funds in the linked account for this EMI.")

    account.balance -= loan.emi_amount
    loan.months_paid += 1
    db.add(models.Transaction(account_id=account.id, amount=-loan.emi_amount, transaction_type="EMI_PAYMENT"))

    if loan.months_paid >= loan.tenure_months:
        loan.status = "CLOSED"

    db.commit()
    db.refresh(loan)
    return loan
