from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, or_, select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.task import Task
from ..schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _status_for(task: Task, today: date) -> str:
    if (task.recurrence or "") == "daily":
        return "done" if task.recurrence_completed_on == today else "todo"
    if task.completed_at is not None:
        return "done"
    if task.due_date is not None and task.due_date < today:
        return "overdue"
    return "todo"


def _labels_for(task: Task) -> list[str]:
    if not task.labels:
        return []
    try:
        parsed = json.loads(task.labels)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    out: list[str] = []
    for item in parsed:
        if isinstance(item, str):
            s = item.strip()
            if s:
                out.append(s)
    # de-dupe, keep order
    seen: set[str] = set()
    deduped: list[str] = []
    for s in out:
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(s)
    return deduped


def _to_out(task: Task, today: date) -> TaskOut:
    recurrence = (task.recurrence or "none").strip().lower()
    if recurrence not in ("none", "daily", "weekly", "monthly"):
        recurrence = "none"
    return TaskOut.model_validate(
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "category": task.category,
            "labels": _labels_for(task),
            "assignee": task.assignee,
            "recurrence": recurrence,
            "completed_on": task.recurrence_completed_on,
            "start_date": task.start_date,
            "estimated_minutes": task.estimated_minutes,
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
        active_daily = and_(
            Task.recurrence == "daily",
            or_(Task.start_date.is_(None), Task.start_date <= today),
            or_(Task.due_date.is_(None), Task.due_date >= today),
        )

        ongoing = and_(
            Task.recurrence.is_(None),
            Task.start_date.is_not(None),
            Task.due_date.is_not(None),
            Task.start_date <= today,
            Task.due_date > today,
            Task.completed_at.is_(None),
        )

        stmt = stmt.where(
            (Task.due_date == today)
            | ((Task.due_date < today) & (Task.completed_at.is_(None)))
            | ((Task.due_date.is_(None)) & (Task.completed_at.is_(None)))
            | active_daily
            | ongoing
        )

    # Order: incomplete first, then due_date, then newest
    incomplete_first = case((Task.completed_at.is_(None), 0), else_=1)
    stmt = stmt.order_by(incomplete_first, Task.due_date.is_(None), Task.due_date, Task.created_at.desc())

    tasks = db.execute(stmt).scalars().all()
    return [_to_out(t, today) for t in tasks]


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_out(task, date.today())


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    recurrence = (payload.recurrence or "none").strip().lower()
    if recurrence not in ("none", "daily", "weekly", "monthly"):
        recurrence = "none"

    task = Task(
        title=payload.title.strip(),
        description=payload.description,
        category=payload.category.strip() if payload.category else None,
        labels=json.dumps([s.strip() for s in payload.labels if isinstance(s, str) and s.strip()])
        if payload.labels
        else None,
        assignee=payload.assignee.strip() if payload.assignee else None,
        recurrence=None if recurrence == "none" else recurrence,
        recurrence_completed_on=None,
        start_date=payload.start_date,
        estimated_minutes=payload.estimated_minutes,
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

    if "category" in payload.model_fields_set:
        task.category = payload.category.strip() if payload.category else None

    if "labels" in payload.model_fields_set:
        labels = payload.labels if payload.labels is not None else []
        task.labels = json.dumps([s.strip() for s in labels if isinstance(s, str) and s.strip()]) if labels else None

    if "assignee" in payload.model_fields_set:
        task.assignee = payload.assignee.strip() if payload.assignee else None

    if "recurrence" in payload.model_fields_set:
        recurrence = (payload.recurrence or "none").strip().lower()
        if recurrence not in ("none", "daily", "weekly", "monthly"):
            recurrence = "none"
        task.recurrence = None if recurrence == "none" else recurrence
        if task.recurrence is None:
            task.recurrence_completed_on = None

    if "start_date" in payload.model_fields_set:
        task.start_date = payload.start_date

    if "estimated_minutes" in payload.model_fields_set:
        task.estimated_minutes = payload.estimated_minutes
    if payload.due_date is not None or payload.due_date is None:
        # Explicitly allow clearing due_date by sending null
        if "due_date" in payload.model_fields_set:
            task.due_date = payload.due_date
    if payload.priority is not None:
        task.priority = payload.priority

    if payload.completed is not None:
        if (task.recurrence or "") == "daily":
            task.recurrence_completed_on = date.today() if payload.completed else None
        else:
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
