from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WeeklyReflectionCreate(BaseModel):
    year: int
    week_number: int
    went_well: Optional[str] = None
    didnt_go_well: Optional[str] = None
    improvements: Optional[str] = None
    highlight: Optional[str] = None
    gratitude: Optional[str] = None


class WeeklyReflectionUpdate(BaseModel):
    went_well: Optional[str] = None
    didnt_go_well: Optional[str] = None
    improvements: Optional[str] = None
    highlight: Optional[str] = None
    gratitude: Optional[str] = None


class WeeklyReflectionOut(BaseModel):
    id: int
    year: int
    week_number: int
    went_well: Optional[str]
    didnt_go_well: Optional[str]
    improvements: Optional[str]
    highlight: Optional[str]
    gratitude: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
