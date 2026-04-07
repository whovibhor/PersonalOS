from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sleep_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)

    hours_slept: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    quality: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1–5
    wake_time: Mapped[str | None] = mapped_column(String(8), nullable=True)  # "HH:MM"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
