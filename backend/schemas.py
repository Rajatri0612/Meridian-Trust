from pydantic import BaseModel, Field
class UserCreate(BaseModel):
    username: str
    password: str
class Token(BaseModel):
    access_token: str
    token_type: str
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