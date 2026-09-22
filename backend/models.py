from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    accounts = relationship("Account", back_populates="owner")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    user = relationship("User", backref="profile")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_type = Column(String, default="Savings")
    balance = Column(Float, default=0.0)
    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")
class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)  # "DEPOSIT", "WITHDRAWAL", "TRANSFER", "LOAN_DISBURSEMENT", "EMI_PAYMENT"
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    account = relationship("Account", back_populates="transactions")

class Loan(Base):
    __tablename__ = "loans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    principal = Column(Float, nullable=False)
    annual_rate = Column(Float, nullable=False)
    tenure_months = Column(Integer, nullable=False)
    emi_amount = Column(Float, nullable=False)
    months_paid = Column(Integer, default=0)
    status = Column(String, default="PENDING")  # "PENDING", "APPROVED", "CLOSED", "REJECTED"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
