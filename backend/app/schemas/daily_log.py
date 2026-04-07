from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _clamp(v: int | None, lo: int, hi: int) -> int | None:
    if v is None:
        return None
    return max(lo, min(hi, v))


def _compute_score(mood: int | None, energy: int | None, focus: int | None) -> float | None:
    vals = [v for v in (mood, energy, focus) if v is not None]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 2)


class DailyLogCreate(BaseModel):
    log_date: date = Field(default_factory=date.today)
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)
    focus: int | None = Field(default=None, ge=1, le=5)
    reflection: str | None = None


class DailyLogUpdate(BaseModel):
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)
    focus: int | None = Field(default=None, ge=1, le=5)
    reflection: str | None = None


class DailyLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_date: date
    mood: int | None
    energy: int | None
    focus: int | None
    reflection: str | None
    score: float | None
    created_at: datetime
    updated_at: datetime
