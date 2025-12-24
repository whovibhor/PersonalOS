from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.task_history import TaskHistory
from ..schemas.task_history import TaskHistoryOut

router = APIRouter(prefix="/task-history", tags=["task-history"])


@router.get("", response_model=list[TaskHistoryOut])
def list_task_history(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    stmt = select(TaskHistory).order_by(TaskHistory.created_at.desc()).limit(limit)
    history = db.execute(stmt).scalars().all()
    return history
