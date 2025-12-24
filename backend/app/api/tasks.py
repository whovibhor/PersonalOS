from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.task import Task
from ..schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _status_for(task: Task, today: date) -> str:
    if task.completed_at is not None:
        return "done"
    if task.due_date is not None and task.due_date < today:
        return "overdue"
    return "todo"


def _to_out(task: Task, today: date) -> TaskOut:
    return TaskOut.model_validate(
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "due_date": task.due_date,
            "priority": task.priority,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "completed_at": task.completed_at,
            "status": _status_for(task, today),
        }
    )


@router.get("", response_model=list[TaskOut])
def list_tasks(
    view: Literal["all", "today"] = Query(default="all"),
    db: Session = Depends(get_db),
):
    today = date.today()

    stmt = select(Task)

    if view == "today":
        stmt = stmt.where(
            (Task.due_date == today)
            | ((Task.due_date < today) & (Task.completed_at.is_(None)))
            | ((Task.due_date.is_(None)) & (Task.completed_at.is_(None)))
        )

    # Order: incomplete first, then due_date, then newest
    incomplete_first = case((Task.completed_at.is_(None), 0), else_=1)
    stmt = stmt.order_by(incomplete_first, Task.due_date.is_(None), Task.due_date, Task.created_at.desc())

    tasks = db.execute(stmt).scalars().all()
    return [_to_out(t, today) for t in tasks]


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        title=payload.title.strip(),
        description=payload.description,
        due_date=payload.due_date,
        priority=payload.priority,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_out(task, date.today())


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.description is not None:
        task.description = payload.description
    if payload.due_date is not None or payload.due_date is None:
        # Explicitly allow clearing due_date by sending null
        if "due_date" in payload.model_fields_set:
            task.due_date = payload.due_date
    if payload.priority is not None:
        task.priority = payload.priority

    if payload.completed is not None:
        task.completed_at = _now_utc() if payload.completed else None

    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_out(task, date.today())


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None
