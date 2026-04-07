from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.habit import Habit
from ..models.habit_log import HabitLog
from ..schemas.habit import HabitCreate, HabitLogOut, HabitOut, HabitUpdate

router = APIRouter(prefix="/habits", tags=["habits"])


# ─── Streak helpers ───────────────────────────────────────────────────────────

def _compute_streaks(done_dates: set[date], today: date) -> tuple[int, int, int]:
    """Return (current_streak, longest_streak, total_done)."""
    if not done_dates:
        return 0, 0, 0

    total_done = len(done_dates)
    sorted_dates = sorted(done_dates, reverse=True)

    # Current streak: consecutive days ending today or yesterday
    current = 0
    check = today
    for d in sorted_dates:
        if d == check:
            current += 1
            check -= timedelta(days=1)
        elif d < check:
            break

    # Longest streak: scan all done dates in ascending order
    asc = sorted(done_dates)
    longest = 1
    run = 1
    for i in range(1, len(asc)):
        if (asc[i] - asc[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    return current, longest, total_done


def _enrich(habit: Habit, logs: list[HabitLog], today: date) -> HabitOut:
    done_dates = {log.log_date for log in logs if log.is_done}
    current_streak, longest_streak, total_done = _compute_streaks(done_dates, today)
    return HabitOut(
        id=habit.id,
        name=habit.name,
        frequency=habit.frequency,
        created_at=habit.created_at,
        updated_at=habit.updated_at,
        done_today=today in done_dates,
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_done=total_done,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=list[HabitOut])
def list_habits(db: Session = Depends(get_db)):
    today = date.today()
    habits = db.execute(select(Habit).order_by(Habit.created_at.asc())).scalars().all()
    result = []
    for habit in habits:
        logs = db.execute(
            select(HabitLog).where(HabitLog.habit_id == habit.id)
        ).scalars().all()
        result.append(_enrich(habit, logs, today))
    return result


@router.post("", response_model=HabitOut, status_code=201)
def create_habit(payload: HabitCreate, db: Session = Depends(get_db)):
    habit = Habit(name=payload.name.strip(), frequency=payload.frequency)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return _enrich(habit, [], date.today())


@router.patch("/{habit_id}", response_model=HabitOut)
def update_habit(habit_id: int, payload: HabitUpdate, db: Session = Depends(get_db)):
    habit = db.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    if payload.name is not None:
        habit.name = payload.name.strip()
    if payload.frequency is not None:
        habit.frequency = payload.frequency
    db.commit()
    db.refresh(habit)
    logs = db.execute(select(HabitLog).where(HabitLog.habit_id == habit_id)).scalars().all()
    return _enrich(habit, logs, date.today())


@router.delete("/{habit_id}", status_code=204)
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    habit = db.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(habit)
    db.commit()


@router.post("/{habit_id}/checkin", response_model=HabitOut)
def checkin_habit(habit_id: int, db: Session = Depends(get_db)):
    """Toggle today's completion for a habit."""
    habit = db.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    today = date.today()
    log = db.execute(
        select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.log_date == today)
    ).scalar_one_or_none()

    if log:
        # Toggle: if already done, unmark it
        log.is_done = not log.is_done
    else:
        log = HabitLog(habit_id=habit_id, log_date=today, is_done=True)
        db.add(log)

    db.commit()
    logs = db.execute(select(HabitLog).where(HabitLog.habit_id == habit_id)).scalars().all()
    return _enrich(habit, logs, today)


@router.get("/{habit_id}/logs", response_model=list[HabitLogOut])
def get_habit_logs(habit_id: int, db: Session = Depends(get_db)):
    habit = db.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    logs = db.execute(
        select(HabitLog)
        .where(HabitLog.habit_id == habit_id)
        .order_by(HabitLog.log_date.desc())
    ).scalars().all()
    return logs
