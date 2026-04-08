from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.daily_log import DailyLog
from ..models.habit_log import HabitLog
from ..models.sleep_log import SleepLog

router = APIRouter(prefix="/life-calendar", tags=["life-calendar"])


class CalendarDay(BaseModel):
    date: str
    composite_score: Optional[float] = None  # 0–100
    mood: Optional[int] = None
    energy: Optional[int] = None
    focus: Optional[int] = None
    daily_score: Optional[float] = None  # raw avg 1–10
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    habits_done: int = 0
    habits_total: int = 0


@router.get("", response_model=list[CalendarDay])
def get_life_calendar(year: int = Query(..., ge=2000, le=2100), db: Session = Depends(get_db)):
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)

    # --- Daily logs ---
    daily_logs: dict[str, DailyLog] = {
        str(row.log_date): row
        for row in db.query(DailyLog).filter(
            DailyLog.log_date >= year_start,
            DailyLog.log_date <= year_end,
        ).all()
    }

    # --- Sleep logs ---
    sleep_logs: dict[str, SleepLog] = {
        str(row.sleep_date): row
        for row in db.query(SleepLog).filter(
            SleepLog.sleep_date >= year_start,
            SleepLog.sleep_date <= year_end,
        ).all()
    }

    # --- Habit logs: done count per date ---
    done_rows = (
        db.query(HabitLog.log_date, func.count(HabitLog.id).label("cnt"))
        .filter(
            HabitLog.log_date >= year_start,
            HabitLog.log_date <= year_end,
            HabitLog.is_done == True,  # noqa: E712
        )
        .group_by(HabitLog.log_date)
        .all()
    )
    habit_done: dict[str, int] = {str(r.log_date): r.cnt for r in done_rows}

    # --- Habit logs: total logged per date (checked + unchecked) ---
    total_rows = (
        db.query(HabitLog.log_date, func.count(HabitLog.id).label("cnt"))
        .filter(
            HabitLog.log_date >= year_start,
            HabitLog.log_date <= year_end,
        )
        .group_by(HabitLog.log_date)
        .all()
    )
    habit_total: dict[str, int] = {str(r.log_date): r.cnt for r in total_rows}

    # --- Build day-by-day list ---
    result: list[CalendarDay] = []
    current = year_start
    while current <= year_end:
        ds = str(current)
        dl = daily_logs.get(ds)
        sl = sleep_logs.get(ds)
        h_done = habit_done.get(ds, 0)
        h_total = habit_total.get(ds, 0)

        # Composite: average of available components, each normalised 0-100
        parts: list[float] = []
        if dl and dl.score is not None:
            # score is avg of up to 8 metrics on 1-10 scale
            parts.append((dl.score - 1) / 9 * 100)
        if sl and sl.quality is not None:
            parts.append((sl.quality - 1) / 4 * 100)
        if h_total > 0:
            parts.append(h_done / h_total * 100)

        composite = round(sum(parts) / len(parts), 1) if parts else None

        result.append(
            CalendarDay(
                date=ds,
                composite_score=composite,
                mood=dl.mood if dl else None,
                energy=dl.energy if dl else None,
                focus=dl.focus if dl else None,
                daily_score=dl.score if dl else None,
                sleep_hours=float(sl.hours_slept) if sl and sl.hours_slept is not None else None,
                sleep_quality=sl.quality if sl else None,
                habits_done=h_done,
                habits_total=h_total,
            )
        )
        current += timedelta(days=1)

    return result
