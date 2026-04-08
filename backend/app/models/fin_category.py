from __future__ import annotations
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class FinCategory(Base):
    __tablename__ = "fin_categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    cat_type: Mapped[str] = mapped_column(String(10), nullable=False, default="expense")  # income/expense/both
    color: Mapped[str] = mapped_column(String(30), nullable=False, default="zinc")
    icon: Mapped[str] = mapped_column(String(40), nullable=False, default="circle")  # lucide icon name
    parent_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # for sub-categories
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
