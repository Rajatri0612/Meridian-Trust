from datetime import datetime
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class AccountCreate(BaseModel):
    account_type: str = "Savings"

class AccountOut(BaseModel):
    id: int
    account_type: str
    balance: float
    class Config:
        from_attributes = True

class TransactionOut(BaseModel):
    id: int
    account_id: int
    amount: float
    transaction_type: str
    timestamp: datetime
    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    account_id: int
    amount: float = Field(gt=0, description="Deposit amount must be greater than zero")
class WithdrawRequest(BaseModel):
    account_id: int
    amount: float = Field(gt=0, description="Withdrawal amount must be greater than zero")
class TransferRequest(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float = Field(gt=0, description="Transfer amount must be greater than zero")

class LoanApplyRequest(BaseModel):
    account_id: int
    principal: float = Field(gt=0, description="Loan principal must be greater than zero")
    annual_rate: float = Field(gt=0, description="Annual interest rate must be greater than zero")
    tenure_months: int = Field(gt=0, description="Tenure must be at least one month")

class LoanOut(BaseModel):
    id: int
    account_id: int
    principal: float
    annual_rate: float
    tenure_months: int
    emi_amount: float
    months_paid: int
    status: str
    class Config:
        from_attributes = True
