from __future__ import annotations
from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class FinBudget(Base):
    __tablename__ = "fin_budgets"
    __table_args__ = (
        UniqueConstraint("year", "month", "category_id", name="uq_budget_period_cat"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fin_categories.id", ondelete="CASCADE"), nullable=True)  # null = total budget
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
