from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)

    # Core wellness — 1-10 scale
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    focus: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Extended daily metrics — 1-10 scale
    productivity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spending_control: Mapped[int | None] = mapped_column(Integer, nullable=True)
    financial_mindfulness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discipline: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_satisfaction: Mapped[int | None] = mapped_column(Integer, nullable=True)

    reflection: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Computed average score (1-10) stored for quick retrieval by calendar/analytics
    score: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
