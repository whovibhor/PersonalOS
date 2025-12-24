from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

TaskHistoryAction = Literal["created", "updated", "deleted", "completed", "uncompleted"]


class TaskHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    action: TaskHistoryAction
    task_title: str
    changes: str | None
    created_at: datetime
