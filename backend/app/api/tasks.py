from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, or_, select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.task import Task
from ..models.task_history import TaskHistory
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
        due_date=payload.due_date,
        priority=payload.priority,
    )
    db.add(task)
    db.flush()  # Get task.id before commit
    
    # Log history
    history = TaskHistory(
        task_id=task.id,
        action="created",
        task_title=task.title,
        changes=None,
    )
    db.add(history)
    db.commit()
    db.refresh(task)
    return _to_out(task, date.today())


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    changes = {}
    old_completed_status = task.completed_at is not None or (
        (task.recurrence or "") == "daily" and task.recurrence_completed_on == date.today()
    )

    if payload.title is not None:
        if task.title != payload.title.strip():
            changes["title"] = {"from": task.title, "to": payload.title.strip()}
        task.title = payload.title.strip()
    if payload.description is not None:
        if task.description != payload.description:
            changes["description"] = {"from": task.description, "to": payload.description}
        task.description = payload.description

    if "category" in payload.model_fields_set:
        new_cat = payload.category.strip() if payload.category else None
        if task.category != new_cat:
            changes["category"] = {"from": task.category, "to": new_cat}
        task.category = new_cat

    if "labels" in payload.model_fields_set:
        labels = payload.labels if payload.labels is not None else []
        new_labels = json.dumps([s.strip() for s in labels if isinstance(s, str) and s.strip()]) if labels else None
        if task.labels != new_labels:
            changes["labels"] = {"from": task.labels, "to": new_labels}
        task.labels = new_labels

    if "assignee" in payload.model_fields_set:
        new_assignee = payload.assignee.strip() if payload.assignee else None
        if task.assignee != new_assignee:
            changes["assignee"] = {"from": task.assignee, "to": new_assignee}
        task.assignee = new_assignee

    if "recurrence" in payload.model_fields_set:
        recurrence = (payload.recurrence or "none").strip().lower()
        if recurrence not in ("none", "daily", "weekly", "monthly"):
            recurrence = "none"
        new_rec = None if recurrence == "none" else recurrence
        if task.recurrence != new_rec:
            changes["recurrence"] = {"from": task.recurrence, "to": new_rec}
        task.recurrence = new_rec
        if task.recurrence is None:
            task.recurrence_completed_on = None

    if "start_date" in payload.model_fields_set:
        if task.start_date != payload.start_date:
            changes["start_date"] = {"from": str(task.start_date) if task.start_date else None, "to": str(payload.start_date) if payload.start_date else None}
        task.start_date = payload.start_date

    if payload.due_date is not None or payload.due_date is None:
        # Explicitly allow clearing due_date by sending null
        if "due_date" in payload.model_fields_set:
            if task.due_date != payload.due_date:
                changes["due_date"] = {"from": str(task.due_date) if task.due_date else None, "to": str(payload.due_date) if payload.due_date else None}
            task.due_date = payload.due_date
    if payload.priority is not None:
        if task.priority != payload.priority:
            changes["priority"] = {"from": task.priority, "to": payload.priority}
        task.priority = payload.priority

    if payload.completed is not None:
        if (task.recurrence or "") == "daily":
            task.recurrence_completed_on = date.today() if payload.completed else None
        else:
            task.completed_at = _now_utc() if payload.completed else None

    new_completed_status = task.completed_at is not None or (
        (task.recurrence or "") == "daily" and task.recurrence_completed_on == date.today()
    )

    # Log history for updates or completion status changes
    if changes or (old_completed_status != new_completed_status):
        action = "updated"
        if not old_completed_status and new_completed_status:
            action = "completed"
        elif old_completed_status and not new_completed_status:
            action = "uncompleted"
        
        history = TaskHistory(
            task_id=task.id,
            action=action,
            task_title=task.title,
            changes=json.dumps(changes) if changes else None,
        )
        db.add(history)

    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_out(task, date.today())


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # Log history before deletion
    history = TaskHistory(
        task_id=task.id,
        action="deleted",
        task_title=task.title,
        changes=None,
    )
    db.add(history)
    
    db.delete(task)
    db.commit()
    return None
