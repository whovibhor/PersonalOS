from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    category: str = Field(default="general", max_length=80)
    description: str | None = None
    spent_on: date


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: Decimal
    category: str
    description: str | None
    spent_on: date
    created_at: datetime
