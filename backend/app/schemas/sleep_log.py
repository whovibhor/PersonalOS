from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SleepLogCreate(BaseModel):
    sleep_date: date = Field(default_factory=date.today)
    hours_slept: float | None = Field(default=None, ge=0, le=24)
    quality: int | None = Field(default=None, ge=1, le=5)
    wake_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")  # "HH:MM"
    notes: str | None = None


class SleepLogUpdate(BaseModel):
    hours_slept: float | None = Field(default=None, ge=0, le=24)
    quality: int | None = Field(default=None, ge=1, le=5)
    wake_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    notes: str | None = None


class SleepLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sleep_date: date
    hours_slept: float | None
    quality: int | None
    wake_time: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_obj(cls, obj: object) -> "SleepLogOut":
        from ..models.sleep_log import SleepLog
        assert isinstance(obj, SleepLog)
        return cls(
            id=obj.id,
            sleep_date=obj.sleep_date,
            hours_slept=float(obj.hours_slept) if obj.hours_slept is not None else None,
            quality=obj.quality,
            wake_time=obj.wake_time,
            notes=obj.notes,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )
