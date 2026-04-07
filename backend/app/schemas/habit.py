from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    frequency: str = Field(default="daily", max_length=40)


class HabitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    frequency: str | None = Field(default=None, max_length=40)


class HabitLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    habit_id: int
    log_date: date
    is_done: bool
    created_at: datetime


class HabitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    frequency: str
    created_at: datetime
    updated_at: datetime
    # Computed fields (populated by the API layer, not the ORM)
    done_today: bool = False
    current_streak: int = 0
    longest_streak: int = 0
    total_done: int = 0
