from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    frequency: str = Field(default="daily", max_length=40)


class HabitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    frequency: str
    created_at: datetime
    updated_at: datetime
