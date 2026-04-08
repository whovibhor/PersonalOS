from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def _compute_score(*values: Optional[int]) -> float | None:
    vals = [v for v in values if v is not None]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 2)


class DailyLogCreate(BaseModel):
    log_date: date = Field(default_factory=date.today)
    mood: int | None = Field(default=None, ge=1, le=10)
    energy: int | None = Field(default=None, ge=1, le=10)
    focus: int | None = Field(default=None, ge=1, le=10)
    productivity: int | None = Field(default=None, ge=1, le=10)
    spending_control: int | None = Field(default=None, ge=1, le=10)
    financial_mindfulness: int | None = Field(default=None, ge=1, le=10)
    discipline: int | None = Field(default=None, ge=1, le=10)
    day_satisfaction: int | None = Field(default=None, ge=1, le=10)
    reflection: str | None = None


class DailyLogUpdate(BaseModel):
    mood: int | None = Field(default=None, ge=1, le=10)
    energy: int | None = Field(default=None, ge=1, le=10)
    focus: int | None = Field(default=None, ge=1, le=10)
    productivity: int | None = Field(default=None, ge=1, le=10)
    spending_control: int | None = Field(default=None, ge=1, le=10)
    financial_mindfulness: int | None = Field(default=None, ge=1, le=10)
    discipline: int | None = Field(default=None, ge=1, le=10)
    day_satisfaction: int | None = Field(default=None, ge=1, le=10)
    reflection: str | None = None


class DailyLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_date: date
    mood: int | None
    energy: int | None
    focus: int | None
    productivity: int | None
    spending_control: int | None
    financial_mindfulness: int | None
    discipline: int | None
    day_satisfaction: int | None
    reflection: str | None
    score: float | None
    created_at: datetime
    updated_at: datetime
