from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.attendance import Attendance
from ..models.daily_log import DailyLog
from ..models.finance_asset import FinanceAsset
from ..models.finance_budget import FinanceMonthlyBudget
from ..models.finance_liability import FinanceLiability
from ..models.finance_recurring import FinanceRecurringOccurrence, FinanceRecurringRule
from ..models.finance_transaction import FinanceTransaction
from ..models.habit import Habit
from ..models.habit_log import HabitLog
from ..models.sleep_log import SleepLog
from ..models.task import Task

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ─── Response shapes ──────────────────────────────────────────────────────────

class DashTaskItem(BaseModel):
    id: int
    title: str
    priority: int
    status: str
    due_date: str | None


class DashHabitItem(BaseModel):
    id: int
    name: str
    frequency: str
    done_today: bool
    current_streak: int


class DashBillItem(BaseModel):
    id: int
    name: str
    amount: float
    due_date: str
    days_until: int


class DashDailyLog(BaseModel):
    id: int
    mood: int | None
    energy: int | None
    focus: int | None
    score: float | None


class DashSleepLog(BaseModel):
    id: int
    hours_slept: float | None
    quality: int | None
    wake_time: str | None
    sleep_date: str


class DashFinance(BaseModel):
    net_worth: float
    expenses_this_month: float
    income_this_month: float
    budget_total: float | None
    budget_used_pct: float | None


class DashAttendance(BaseModel):
    id: int
    status: str   # 'present' | 'absent'
    reason: str | None


class TodayState(BaseModel):
    date: str

    # Tasks
    tasks_pending: int
    tasks_overdue: int
    tasks: list[DashTaskItem]

    # Habits
    habits_done: int
    habits_total: int
    habits: list[DashHabitItem]

    # Upcoming bills (next 7 days)
    bills_due: list[DashBillItem]

    # Daily log (today)
    daily_log: DashDailyLog | None

    # Last sleep log
    last_sleep: DashSleepLog | None

    # Today's attendance
    attendance: DashAttendance | None

    # Finance summary
    finance: DashFinance


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _task_status(task: Task, today: date) -> str:
    if (task.recurrence or "") == "daily":
        return "done" if task.recurrence_completed_on == today else "todo"
    if task.completed_at is not None:
        return "done"
    if task.due_date is not None and task.due_date < today:
        return "overdue"
    return "todo"


def _streak(habit_id: int, db: Session, today: date) -> int:
    logs = db.execute(
        select(HabitLog)
        .where(HabitLog.habit_id == habit_id, HabitLog.is_done == True)  # noqa: E712
        .order_by(HabitLog.log_date.desc())
    ).scalars().all()
    done_dates = {l.log_date for l in logs}
    streak = 0
    check = today
    while check in done_dates:
        streak += 1
        check -= timedelta(days=1)
    return streak


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.get("/today", response_model=TodayState)
def today_state(db: Session = Depends(get_db)):
    today = date.today()
    today_str = today.isoformat()
    month_start = datetime(today.year, today.month, 1)

    # ── Tasks ──────────────────────────────────────────────────────────────────
    all_tasks = db.execute(
        select(Task).where(Task.completed_at.is_(None)).order_by(Task.priority.desc())
    ).scalars().all()

    pending_tasks: list[DashTaskItem] = []
    overdue_count = 0
    pending_count = 0

    for t in all_tasks:
        status = _task_status(t, today)
        if status == "done":
            continue
        if status == "overdue":
            overdue_count += 1
        else:
            pending_count += 1
        if len(pending_tasks) < 8:
            pending_tasks.append(DashTaskItem(
                id=t.id,
                title=t.title,
                priority=t.priority,
                status=status,
                due_date=t.due_date.isoformat() if t.due_date else None,
            ))

    # ── Habits ─────────────────────────────────────────────────────────────────
    habits = db.execute(select(Habit).order_by(Habit.created_at.asc())).scalars().all()
    today_habit_logs = {
        hl.habit_id: hl
        for hl in db.execute(
            select(HabitLog).where(HabitLog.log_date == today)
        ).scalars().all()
    }

    dash_habits: list[DashHabitItem] = []
    habits_done = 0

    for h in habits:
        log = today_habit_logs.get(h.id)
        done = log is not None and log.is_done
        if done:
            habits_done += 1
        dash_habits.append(DashHabitItem(
            id=h.id,
            name=h.name,
            frequency=h.frequency,
            done_today=done,
            current_streak=_streak(h.id, db, today),
        ))

    # ── Bills due in next 7 days ────────────────────────────────────────────────
    window_end = today + timedelta(days=7)

    upcoming_rules = db.execute(
        select(FinanceRecurringRule).where(
            FinanceRecurringRule.is_active == True,  # noqa: E712
            FinanceRecurringRule.next_due_date <= window_end,
        ).order_by(FinanceRecurringRule.next_due_date.asc())
    ).scalars().all()

    bills_due: list[DashBillItem] = []
    for rule in upcoming_rules:
        days = (rule.next_due_date - today).days
        bills_due.append(DashBillItem(
            id=rule.id,
            name=rule.name,
            amount=float(rule.amount),
            due_date=rule.next_due_date.isoformat(),
            days_until=max(0, days),
        ))

    # ── Daily log (today) ───────────────────────────────────────────────────────
    daily_log_row = db.execute(
        select(DailyLog).where(DailyLog.log_date == today)
    ).scalar_one_or_none()

    dash_daily = None
    if daily_log_row:
        dash_daily = DashDailyLog(
            id=daily_log_row.id,
            mood=daily_log_row.mood,
            energy=daily_log_row.energy,
            focus=daily_log_row.focus,
            score=daily_log_row.score,
        )

    # ── Last sleep log ──────────────────────────────────────────────────────────
    sleep_row = db.execute(
        select(SleepLog).order_by(SleepLog.sleep_date.desc()).limit(1)
    ).scalar_one_or_none()

    dash_sleep = None
    if sleep_row:
        dash_sleep = DashSleepLog(
            id=sleep_row.id,
            hours_slept=float(sleep_row.hours_slept) if sleep_row.hours_slept else None,
            quality=sleep_row.quality,
            wake_time=sleep_row.wake_time,
            sleep_date=sleep_row.sleep_date.isoformat(),
        )

    # ── Finance summary ─────────────────────────────────────────────────────────
    total_assets = float(
        db.execute(select(func.coalesce(func.sum(FinanceAsset.balance), 0))).scalar() or 0
    )
    total_liabilities = float(
        db.execute(select(func.coalesce(func.sum(FinanceLiability.balance), 0))).scalar() or 0
    )

    expenses_month = float(
        db.execute(
            select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
                FinanceTransaction.txn_type.in_(["expense", "liability_payment"]),
                FinanceTransaction.transacted_at >= month_start,
            )
        ).scalar() or 0
    )

    income_month = float(
        db.execute(
            select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
                FinanceTransaction.txn_type == "income",
                FinanceTransaction.transacted_at >= month_start,
            )
        ).scalar() or 0
    )

    monthly_budget = db.execute(
        select(FinanceMonthlyBudget).where(
            FinanceMonthlyBudget.year == today.year,
            FinanceMonthlyBudget.month == today.month,
        )
    ).scalar_one_or_none()

    budget_total = float(monthly_budget.total_budget) if monthly_budget else None
    budget_used_pct = round((expenses_month / budget_total) * 100, 1) if budget_total else None

    dash_finance = DashFinance(
        net_worth=total_assets - total_liabilities,
        expenses_this_month=expenses_month,
        income_this_month=income_month,
        budget_total=budget_total,
        budget_used_pct=budget_used_pct,
    )

    # ── Attendance (today) ──────────────────────────────────────────────────────
    attend_row = db.execute(
        select(Attendance).where(Attendance.attend_date == today)
    ).scalar_one_or_none()

    dash_attend = (
        DashAttendance(id=attend_row.id, status=attend_row.status, reason=attend_row.reason)
        if attend_row
        else None
    )

    return TodayState(
        date=today_str,
        tasks_pending=pending_count,
        tasks_overdue=overdue_count,
        tasks=pending_tasks,
        habits_done=habits_done,
        habits_total=len(habits),
        habits=dash_habits,
        bills_due=bills_due,
        daily_log=dash_daily,
        last_sleep=dash_sleep,
        finance=dash_finance,
        attendance=dash_attend,
    )
