from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class FinanceLiability(Base):
    __tablename__ = "finance_liabilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    liability_type: Mapped[str] = mapped_column(String(32), nullable=False)

    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    credit_limit: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    minimum_payment: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    emi_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(6, 3), nullable=True)
    tenure_months_left: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
