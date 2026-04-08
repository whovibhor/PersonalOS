from __future__ import annotations
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class FinTransaction(Base):
    __tablename__ = "fin_transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    txn_type: Mapped[str] = mapped_column(String(10), nullable=False, default="expense")  # income/expense
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fin_categories.id", ondelete="SET NULL"), nullable=True)
    account_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fin_accounts.id", ondelete="SET NULL"), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="cash")  # cash/upi/card/net_banking
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    txn_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    subscription_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # ref to fin_subscriptions
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
