from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class FinanceAsset(Base):
    __tablename__ = "finance_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    asset_subtype: Mapped[str | None] = mapped_column(String(80), nullable=True)

    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR")
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    is_primary: Mapped[bool] = mapped_column(nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
