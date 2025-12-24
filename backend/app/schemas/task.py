from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TaskStatus = Literal["todo", "overdue", "done"]
TaskRecurrence = Literal["none", "daily", "weekly", "monthly"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    labels: list[str] = Field(default_factory=list)
    assignee: str | None = Field(default=None, max_length=100)
    recurrence: TaskRecurrence = "none"
    start_date: date | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=1440)
    due_date: date | None = None
    priority: int = Field(default=2, ge=1, le=3)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    labels: list[str] | None = None
    assignee: str | None = Field(default=None, max_length=100)
    recurrence: TaskRecurrence | None = None
    start_date: date | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=1440)
    due_date: date | None = None
    priority: int | None = Field(default=None, ge=1, le=3)
    completed: bool | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category: str | None
    labels: list[str]
    assignee: str | None
    recurrence: TaskRecurrence
    completed_on: date | None = None
    start_date: date | None
    estimated_minutes: int | None
    due_date: date | None
    priority: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    status: TaskStatus
