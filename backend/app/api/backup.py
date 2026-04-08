from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.attendance import Attendance
from ..models.daily_log import DailyLog
from ..models.finance_asset import FinanceAsset
from ..models.finance_budget import FinanceCategoryBudget, FinanceMonthlyBudget
from ..models.finance_goal import FinanceGoal
from ..models.finance_liability import FinanceLiability
from ..models.finance_recurring import FinanceRecurringOccurrence, FinanceRecurringRule
from ..models.finance_transaction import FinanceTransaction
from ..models.habit import Habit
from ..models.habit_log import HabitLog
from ..models.note import Note
from ..models.sleep_log import SleepLog
from ..models.task import Task
from ..models.task_history import TaskHistory
from ..models.weekly_reflection import WeeklyReflection

router = APIRouter(prefix="/backup", tags=["backup"])


def _row_to_dict(row: Any) -> dict:
    """Convert a SQLAlchemy model row to a plain dict."""
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif hasattr(val, 'isoformat'):  # date objects
            val = val.isoformat()
        d[col.name] = val
    return d


@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    """Export all user data as a JSON object."""
    data: dict[str, list] = {
        "exported_at": datetime.utcnow().isoformat(),
        "version": 1,
        "tasks": [_row_to_dict(r) for r in db.query(Task).all()],
        "task_history": [_row_to_dict(r) for r in db.query(TaskHistory).all()],
        "habits": [_row_to_dict(r) for r in db.query(Habit).all()],
        "habit_logs": [_row_to_dict(r) for r in db.query(HabitLog).all()],
        "notes": [_row_to_dict(r) for r in db.query(Note).all()],
        "daily_logs": [_row_to_dict(r) for r in db.query(DailyLog).all()],
        "sleep_logs": [_row_to_dict(r) for r in db.query(SleepLog).all()],
        "attendance": [_row_to_dict(r) for r in db.query(Attendance).all()],
        "weekly_reflections": [_row_to_dict(r) for r in db.query(WeeklyReflection).all()],
        "finance_assets": [_row_to_dict(r) for r in db.query(FinanceAsset).all()],
        "finance_liabilities": [_row_to_dict(r) for r in db.query(FinanceLiability).all()],
        "finance_transactions": [_row_to_dict(r) for r in db.query(FinanceTransaction).all()],
        "finance_recurring_rules": [_row_to_dict(r) for r in db.query(FinanceRecurringRule).all()],
        "finance_occurrences": [_row_to_dict(r) for r in db.query(FinanceRecurringOccurrence).all()],
        "finance_monthly_budgets": [_row_to_dict(r) for r in db.query(FinanceMonthlyBudget).all()],
        "finance_category_budgets": [_row_to_dict(r) for r in db.query(FinanceCategoryBudget).all()],
        "finance_goals": [_row_to_dict(r) for r in db.query(FinanceGoal).all()],
    }
    # Return as attachment-style JSON
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f"attachment; filename=personalos-backup-{datetime.utcnow().strftime('%Y%m%d')}.json"},
    )
