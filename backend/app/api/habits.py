from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.habit import Habit
from ..schemas.habit import HabitCreate, HabitOut

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("", response_model=list[HabitOut])
def list_habits(db: Session = Depends(get_db)):
    stmt = select(Habit).order_by(Habit.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.post("", response_model=HabitOut, status_code=201)
def create_habit(payload: HabitCreate, db: Session = Depends(get_db)):
    habit = Habit(name=payload.name.strip(), frequency=payload.frequency)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit
