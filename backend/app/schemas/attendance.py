from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AttendStatus = Literal['present', 'absent']


class AttendanceCreate(BaseModel):
    attend_date: date = Field(default_factory=date.today)
    status: AttendStatus
    reason: str | None = None


class AttendanceUpdate(BaseModel):
    status: AttendStatus | None = None
    reason: str | None = None


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    attend_date: date
    status: str
    reason: str | None
    created_at: datetime
    updated_at: datetime
