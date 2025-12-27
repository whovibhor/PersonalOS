from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class FinanceMonthlyBudget(Base):
    __tablename__ = "finance_monthly_budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)

    total_budget: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    rollover_unused: Mapped[bool] = mapped_column(nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class FinanceCategoryBudget(Base):
    __tablename__ = "finance_category_budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)

    category: Mapped[str] = mapped_column(String(80), nullable=False)
    limit_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    rollover_unused: Mapped[bool] = mapped_column(nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
