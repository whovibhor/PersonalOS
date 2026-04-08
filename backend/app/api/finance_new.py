"""
New Personal Finance API — student-focused, fast entry, smart insights.
Routes: /api/finance/*
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.fin_account import FinAccount
from ..models.fin_budget import FinBudget
from ..models.fin_category import FinCategory
from ..models.fin_goal import FinGoal
from ..models.fin_subscription import FinSubscription
from ..models.fin_transaction import FinTransaction

router = APIRouter(prefix="/finance", tags=["finance-new"])

# ── helpers ────────────────────────────────────────────────────────────────────

def _money(v: float) -> float:
    return round(v, 2)

def _today() -> str:
    return date.today().isoformat()

# ── Default categories seed ────────────────────────────────────────────────────

DEFAULT_CATEGORIES = [
    # Expense
    ("Food & Dining",    "expense", "orange", "utensils",       0),
    ("Groceries",        "expense", "green",  "shopping-cart",  1),
    ("Transport",        "expense", "blue",   "bus",            2),
    ("Rent",             "expense", "red",    "home",           3),
    ("Subscriptions",    "expense", "purple", "rss",            4),
    ("Shopping",         "expense", "pink",   "shopping-bag",   5),
    ("Entertainment",    "expense", "yellow", "tv",             6),
    ("Health",           "expense", "teal",   "heart-pulse",    7),
    ("Education",        "expense", "indigo", "book-open",      8),
    ("Utilities",        "expense", "gray",   "zap",            9),
    ("Travel",           "expense", "cyan",   "plane",          10),
    ("Personal Care",    "expense", "rose",   "sparkles",       11),
    ("Snacks",           "expense", "amber",  "coffee",         12),
    ("Other Expense",    "expense", "zinc",   "circle",         13),
    # Income
    ("Salary",           "income",  "emerald","briefcase",      20),
    ("Freelance",        "income",  "green",  "laptop",         21),
    ("Family",           "income",  "blue",   "users",          22),
    ("Investments",      "income",  "indigo", "trending-up",    23),
    ("Other Income",     "income",  "zinc",   "circle",         24),
]


@router.post("/seed-categories", status_code=201)
def seed_categories(db: Session = Depends(get_db)):
    """Seed default categories if table is empty."""
    existing = db.query(FinCategory).count()
    if existing > 0:
        return {"seeded": 0, "message": "Categories already exist"}
    cats = []
    for (name, cat_type, color, icon, sort_order) in DEFAULT_CATEGORIES:
        c = FinCategory(name=name, cat_type=cat_type, color=color, icon=icon, sort_order=sort_order, is_default=True)
        db.add(c)
        cats.append(c)
    db.commit()
    return {"seeded": len(cats)}


# ── Accounts ───────────────────────────────────────────────────────────────────

class AccountIn(BaseModel):
    name: str
    account_type: str = "bank"
    balance: float = 0.0
    color: Optional[str] = None
    is_default: bool = False

class AccountOut(BaseModel):
    id: int
    name: str
    account_type: str
    balance: float
    color: Optional[str]
    is_default: bool
    class Config: from_attributes = True

@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(FinAccount).order_by(FinAccount.is_default.desc(), FinAccount.name).all()

@router.post("/accounts", response_model=AccountOut, status_code=201)
def create_account(payload: AccountIn, db: Session = Depends(get_db)):
    if payload.is_default:
        db.query(FinAccount).update({"is_default": False})
    acc = FinAccount(**payload.model_dump())
    db.add(acc); db.commit(); db.refresh(acc)
    return acc

@router.patch("/accounts/{acc_id}", response_model=AccountOut)
def update_account(acc_id: int, payload: AccountIn, db: Session = Depends(get_db)):
    acc = db.get(FinAccount, acc_id)
    if not acc: raise HTTPException(404, "Account not found")
    if payload.is_default:
        db.query(FinAccount).filter(FinAccount.id != acc_id).update({"is_default": False})
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(acc, k, v)
    db.commit(); db.refresh(acc); return acc

@router.delete("/accounts/{acc_id}", status_code=204)
def delete_account(acc_id: int, db: Session = Depends(get_db)):
    acc = db.get(FinAccount, acc_id)
    if not acc: raise HTTPException(404, "Account not found")
    db.delete(acc); db.commit()


# ── Categories ─────────────────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    name: str
    cat_type: str = "expense"
    color: str = "zinc"
    icon: str = "circle"
    parent_id: Optional[int] = None

class CategoryOut(BaseModel):
    id: int
    name: str
    cat_type: str
    color: str
    icon: str
    parent_id: Optional[int]
    is_default: bool
    sort_order: int
    class Config: from_attributes = True

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(cat_type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(FinCategory).order_by(FinCategory.sort_order, FinCategory.name)
    if cat_type: q = q.filter(FinCategory.cat_type.in_([cat_type, "both"]))
    return q.all()

@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryIn, db: Session = Depends(get_db)):
    cat = FinCategory(**payload.model_dump(), is_default=False, sort_order=99)
    db.add(cat); db.commit(); db.refresh(cat); return cat

@router.patch("/categories/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, payload: CategoryIn, db: Session = Depends(get_db)):
    cat = db.get(FinCategory, cat_id)
    if not cat: raise HTTPException(404, "Category not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    db.commit(); db.refresh(cat); return cat

@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.get(FinCategory, cat_id)
    if not cat or cat.is_default: raise HTTPException(400, "Cannot delete default category")
    db.delete(cat); db.commit()


# ── Transactions ───────────────────────────────────────────────────────────────

class TransactionIn(BaseModel):
    amount: float
    txn_type: str = "expense"
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    payment_method: str = "cash"
    notes: Optional[str] = None
    txn_date: Optional[str] = None  # ISO datetime or date string
    subscription_id: Optional[int] = None

class TransactionOut(BaseModel):
    id: int
    amount: float
    txn_type: str
    category_id: Optional[int]
    category_name: Optional[str]
    category_color: Optional[str]
    category_icon: Optional[str]
    account_id: Optional[int]
    account_name: Optional[str]
    payment_method: str
    notes: Optional[str]
    txn_date: str
    created_at: str

def _enrich_txn(t: FinTransaction, db: Session) -> TransactionOut:
    cat = db.get(FinCategory, t.category_id) if t.category_id else None
    acc = db.get(FinAccount, t.account_id) if t.account_id else None
    return TransactionOut(
        id=t.id, amount=t.amount, txn_type=t.txn_type,
        category_id=t.category_id,
        category_name=cat.name if cat else None,
        category_color=cat.color if cat else None,
        category_icon=cat.icon if cat else None,
        account_id=t.account_id,
        account_name=acc.name if acc else None,
        payment_method=t.payment_method,
        notes=t.notes,
        txn_date=t.txn_date.isoformat() if hasattr(t.txn_date, 'isoformat') else str(t.txn_date),
        created_at=t.created_at.isoformat(),
    )

def _apply_balance(db: Session, account_id: Optional[int], txn_type: str, amount: float, direction: int = 1):
    """direction=1 apply, -1 reverse."""
    if not account_id: return
    acc = db.get(FinAccount, account_id)
    if not acc: return
    delta = amount * direction
    if txn_type == "income":
        acc.balance += delta
    else:
        acc.balance -= delta

@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(
    limit: int = 50,
    offset: int = 0,
    txn_type: Optional[str] = None,
    category_id: Optional[int] = None,
    account_id: Optional[int] = None,
    search: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(FinTransaction).order_by(FinTransaction.txn_date.desc(), FinTransaction.id.desc())
    if txn_type: q = q.filter(FinTransaction.txn_type == txn_type)
    if category_id: q = q.filter(FinTransaction.category_id == category_id)
    if account_id: q = q.filter(FinTransaction.account_id == account_id)
    if search: q = q.filter(FinTransaction.notes.ilike(f"%{search}%"))
    if from_date: q = q.filter(FinTransaction.txn_date >= from_date)
    if to_date: q = q.filter(FinTransaction.txn_date <= f"{to_date}T23:59:59")
    txns = q.offset(offset).limit(limit).all()
    return [_enrich_txn(t, db) for t in txns]

@router.post("/transactions", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionIn, db: Session = Depends(get_db)):
    txn_date = datetime.fromisoformat(payload.txn_date) if payload.txn_date else datetime.now()
    t = FinTransaction(
        amount=payload.amount,
        txn_type=payload.txn_type,
        category_id=payload.category_id,
        account_id=payload.account_id,
        payment_method=payload.payment_method,
        notes=payload.notes,
        txn_date=txn_date,
        subscription_id=payload.subscription_id,
    )
    db.add(t)
    _apply_balance(db, payload.account_id, payload.txn_type, payload.amount, direction=1)
    db.commit(); db.refresh(t)
    return _enrich_txn(t, db)

@router.patch("/transactions/{txn_id}", response_model=TransactionOut)
def update_transaction(txn_id: int, payload: TransactionIn, db: Session = Depends(get_db)):
    t = db.get(FinTransaction, txn_id)
    if not t: raise HTTPException(404, "Transaction not found")
    # Reverse old
    _apply_balance(db, t.account_id, t.txn_type, t.amount, direction=-1)
    t.amount = payload.amount
    t.txn_type = payload.txn_type
    t.category_id = payload.category_id
    t.account_id = payload.account_id
    t.payment_method = payload.payment_method
    t.notes = payload.notes
    if payload.txn_date:
        t.txn_date = datetime.fromisoformat(payload.txn_date)
    # Apply new
    _apply_balance(db, payload.account_id, payload.txn_type, payload.amount, direction=1)
    db.commit(); db.refresh(t)
    return _enrich_txn(t, db)

@router.delete("/transactions/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    t = db.get(FinTransaction, txn_id)
    if not t: raise HTTPException(404, "Transaction not found")
    _apply_balance(db, t.account_id, t.txn_type, t.amount, direction=-1)
    db.delete(t); db.commit()


# ── Budgets ────────────────────────────────────────────────────────────────────

class BudgetIn(BaseModel):
    year: int
    month: int
    category_id: Optional[int] = None
    amount: float

class BudgetOut(BaseModel):
    id: int
    year: int
    month: int
    category_id: Optional[int]
    category_name: Optional[str]
    amount: float
    spent: float = 0.0
    pct: float = 0.0

@router.get("/budgets", response_model=list[BudgetOut])
def list_budgets(year: int, month: int, db: Session = Depends(get_db)):
    budgets = db.query(FinBudget).filter_by(year=year, month=month).all()
    # Compute spent per category for this month
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        month_end = f"{year+1}-01-01"
    else:
        month_end = f"{year}-{month+1:02d}-01"

    rows: list[BudgetOut] = []
    for b in budgets:
        cat = db.get(FinCategory, b.category_id) if b.category_id else None
        q = db.query(func.sum(FinTransaction.amount)).filter(
            FinTransaction.txn_type == "expense",
            FinTransaction.txn_date >= month_start,
            FinTransaction.txn_date < month_end,
        )
        if b.category_id:
            q = q.filter(FinTransaction.category_id == b.category_id)
        spent = float(q.scalar() or 0)
        pct = round(spent / b.amount * 100, 1) if b.amount > 0 else 0
        rows.append(BudgetOut(
            id=b.id, year=b.year, month=b.month,
            category_id=b.category_id,
            category_name=cat.name if cat else "Total",
            amount=b.amount, spent=spent, pct=pct,
        ))
    return rows

@router.post("/budgets", response_model=BudgetOut, status_code=201)
def upsert_budget(payload: BudgetIn, db: Session = Depends(get_db)):
    existing = db.query(FinBudget).filter_by(
        year=payload.year, month=payload.month, category_id=payload.category_id
    ).first()
    if existing:
        existing.amount = payload.amount
        db.commit(); db.refresh(existing)
        b = existing
    else:
        b = FinBudget(year=payload.year, month=payload.month, category_id=payload.category_id, amount=payload.amount)
        db.add(b); db.commit(); db.refresh(b)
    cat = db.get(FinCategory, b.category_id) if b.category_id else None
    return BudgetOut(id=b.id, year=b.year, month=b.month, category_id=b.category_id,
                     category_name=cat.name if cat else "Total", amount=b.amount, spent=0, pct=0)

@router.delete("/budgets/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    b = db.get(FinBudget, budget_id)
    if not b: raise HTTPException(404, "Budget not found")
    db.delete(b); db.commit()


# ── Goals ─────────────────────────────────────────────────────────────────────

class GoalIn(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None
    notes: Optional[str] = None
    color: str = "blue"

class GoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: Optional[str]
    notes: Optional[str]
    color: str
    is_active: bool
    pct: float
    days_left: Optional[int]
    daily_needed: Optional[float]

def _goal_out(g: FinGoal) -> GoalOut:
    pct = round(g.current_amount / g.target_amount * 100, 1) if g.target_amount > 0 else 0
    days_left = None
    daily_needed = None
    if g.target_date:
        td = date.fromisoformat(g.target_date)
        days_left = (td - date.today()).days
        remaining = g.target_amount - g.current_amount
        if days_left > 0 and remaining > 0:
            daily_needed = round(remaining / days_left, 0)
    return GoalOut(id=g.id, name=g.name, target_amount=g.target_amount,
                   current_amount=g.current_amount, target_date=g.target_date,
                   notes=g.notes, color=g.color, is_active=g.is_active,
                   pct=min(100, pct), days_left=days_left, daily_needed=daily_needed)

@router.get("/goals", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db)):
    return [_goal_out(g) for g in db.query(FinGoal).filter_by(is_active=True).order_by(FinGoal.created_at).all()]

@router.post("/goals", response_model=GoalOut, status_code=201)
def create_goal(payload: GoalIn, db: Session = Depends(get_db)):
    g = FinGoal(**payload.model_dump()); db.add(g); db.commit(); db.refresh(g)
    return _goal_out(g)

@router.patch("/goals/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, payload: GoalIn, db: Session = Depends(get_db)):
    g = db.get(FinGoal, goal_id)
    if not g: raise HTTPException(404, "Goal not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(g, k, v)
    db.commit(); db.refresh(g); return _goal_out(g)

@router.patch("/goals/{goal_id}/add", response_model=GoalOut)
def add_to_goal(goal_id: int, amount: float = Query(..., gt=0), db: Session = Depends(get_db)):
    g = db.get(FinGoal, goal_id)
    if not g: raise HTTPException(404, "Goal not found")
    g.current_amount += amount; db.commit(); db.refresh(g); return _goal_out(g)

@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    g = db.get(FinGoal, goal_id)
    if not g: raise HTTPException(404, "Goal not found")
    g.is_active = False; db.commit()


# ── Subscriptions ──────────────────────────────────────────────────────────────

class SubIn(BaseModel):
    name: str
    amount: float
    billing_cycle: str = "monthly"
    next_billing_date: str
    category_id: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool = True

class SubOut(BaseModel):
    id: int
    name: str
    amount: float
    billing_cycle: str
    next_billing_date: str
    category_id: Optional[int]
    category_name: Optional[str]
    category_color: Optional[str]
    notes: Optional[str]
    is_active: bool
    days_until: int
    monthly_equivalent: float

def _sub_out(s: FinSubscription, db: Session) -> SubOut:
    cat = db.get(FinCategory, s.category_id) if s.category_id else None
    try:
        nd = date.fromisoformat(s.next_billing_date)
        days_until = (nd - date.today()).days
    except Exception:
        days_until = 0
    # Normalize to monthly
    cycle_map = {"weekly": 4.33, "monthly": 1, "yearly": 1/12}
    monthly = round(s.amount * cycle_map.get(s.billing_cycle, 1), 2)
    return SubOut(
        id=s.id, name=s.name, amount=s.amount, billing_cycle=s.billing_cycle,
        next_billing_date=s.next_billing_date,
        category_id=s.category_id,
        category_name=cat.name if cat else None,
        category_color=cat.color if cat else None,
        notes=s.notes, is_active=s.is_active,
        days_until=days_until, monthly_equivalent=monthly,
    )

@router.get("/subscriptions", response_model=list[SubOut])
def list_subscriptions(db: Session = Depends(get_db)):
    subs = db.query(FinSubscription).order_by(FinSubscription.next_billing_date).all()
    return [_sub_out(s, db) for s in subs]

@router.post("/subscriptions", response_model=SubOut, status_code=201)
def create_subscription(payload: SubIn, db: Session = Depends(get_db)):
    s = FinSubscription(**payload.model_dump()); db.add(s); db.commit(); db.refresh(s)
    return _sub_out(s, db)

@router.patch("/subscriptions/{sub_id}", response_model=SubOut)
def update_subscription(sub_id: int, payload: SubIn, db: Session = Depends(get_db)):
    s = db.get(FinSubscription, sub_id)
    if not s: raise HTTPException(404, "Subscription not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit(); db.refresh(s); return _sub_out(s, db)

@router.delete("/subscriptions/{sub_id}", status_code=204)
def delete_subscription(sub_id: int, db: Session = Depends(get_db)):
    s = db.get(FinSubscription, sub_id)
    if not s: raise HTTPException(404, "Subscription not found")
    db.delete(s); db.commit()


# ── Dashboard / Analytics ──────────────────────────────────────────────────────

class DashboardOut(BaseModel):
    total_balance: float
    today_spent: float
    today_income: float
    this_month_spent: float
    this_month_income: float
    this_month_savings: float
    savings_rate: float
    total_monthly_subs: float
    accounts: list[AccountOut]
    recent_transactions: list[TransactionOut]

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)) -> Any:
    today_str = date.today().isoformat()
    now = date.today()
    month_start = f"{now.year}-{now.month:02d}-01"

    total_balance = float(db.query(func.sum(FinAccount.balance)).scalar() or 0)

    def _sum(txn_type: str, from_d: str, to_d: Optional[str] = None) -> float:
        q = db.query(func.sum(FinTransaction.amount)).filter(
            FinTransaction.txn_type == txn_type,
            FinTransaction.txn_date >= from_d,
        )
        if to_d:
            q = q.filter(FinTransaction.txn_date <= f"{to_d}T23:59:59")
        return float(q.scalar() or 0)

    today_spent = _sum("expense", today_str, today_str)
    today_income = _sum("income", today_str, today_str)
    month_spent = _sum("expense", month_start)
    month_income = _sum("income", month_start)
    savings = month_income - month_spent
    savings_rate = round(savings / month_income * 100, 1) if month_income > 0 else 0

    # Monthly subscriptions cost
    subs = db.query(FinSubscription).filter_by(is_active=True).all()
    cycle_map = {"weekly": 4.33, "monthly": 1, "yearly": 1/12}
    total_subs = sum(s.amount * cycle_map.get(s.billing_cycle, 1) for s in subs)

    accounts = db.query(FinAccount).order_by(FinAccount.is_default.desc()).all()
    recent = db.query(FinTransaction).order_by(FinTransaction.txn_date.desc(), FinTransaction.id.desc()).limit(8).all()

    return {
        "total_balance": _money(total_balance),
        "today_spent": _money(today_spent),
        "today_income": _money(today_income),
        "this_month_spent": _money(month_spent),
        "this_month_income": _money(month_income),
        "this_month_savings": _money(savings),
        "savings_rate": savings_rate,
        "total_monthly_subs": _money(total_subs),
        "accounts": [AccountOut.model_validate(a) for a in accounts],
        "recent_transactions": [_enrich_txn(t, db) for t in recent],
    }


class CategorySpendItem(BaseModel):
    category_id: Optional[int]
    category_name: str
    category_color: str
    category_icon: str
    total: float
    count: int
    pct: float

@router.get("/analytics/category-spend", response_model=list[CategorySpendItem])
def category_spend(year: int, month: int, db: Session = Depends(get_db)):
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        month_end = f"{year+1}-01-01"
    else:
        month_end = f"{year}-{month+1:02d}-01"

    rows = db.query(
        FinTransaction.category_id,
        func.sum(FinTransaction.amount).label("total"),
        func.count(FinTransaction.id).label("cnt"),
    ).filter(
        FinTransaction.txn_type == "expense",
        FinTransaction.txn_date >= month_start,
        FinTransaction.txn_date < month_end,
    ).group_by(FinTransaction.category_id).all()

    grand_total = sum(float(r.total) for r in rows) or 1

    result = []
    for r in rows:
        cat = db.get(FinCategory, r.category_id) if r.category_id else None
        result.append(CategorySpendItem(
            category_id=r.category_id,
            category_name=cat.name if cat else "Uncategorized",
            category_color=cat.color if cat else "zinc",
            category_icon=cat.icon if cat else "circle",
            total=round(float(r.total), 2),
            count=r.cnt,
            pct=round(float(r.total) / grand_total * 100, 1),
        ))
    return sorted(result, key=lambda x: x.total, reverse=True)


class DailySpend(BaseModel):
    date: str
    expense: float
    income: float

@router.get("/analytics/daily-trend", response_model=list[DailySpend])
def daily_trend(year: int, month: int, db: Session = Depends(get_db)):
    month_start = f"{year}-{month:02d}-01"
    if month == 12:
        month_end = f"{year+1}-01-01"
    else:
        month_end = f"{year}-{month+1:02d}-01"

    rows = db.query(
        func.date(FinTransaction.txn_date).label("d"),
        FinTransaction.txn_type,
        func.sum(FinTransaction.amount).label("total"),
    ).filter(
        FinTransaction.txn_date >= month_start,
        FinTransaction.txn_date < month_end,
    ).group_by("d", FinTransaction.txn_type).all()

    by_date: dict[str, dict] = defaultdict(lambda: {"expense": 0.0, "income": 0.0})
    for r in rows:
        ds = str(r.d)
        by_date[ds][r.txn_type] = float(r.total)

    result = []
    cur = date(year, month, 1)
    end = date(year, month+1, 1) if month < 12 else date(year+1, 1, 1)
    while cur < end and cur <= date.today():
        ds = cur.isoformat()
        result.append(DailySpend(date=ds, expense=by_date[ds]["expense"], income=by_date[ds]["income"]))
        cur += timedelta(days=1)
    return result


class InsightItem(BaseModel):
    type: str   # info/warning/tip
    title: str
    body: str

@router.get("/analytics/insights", response_model=list[InsightItem])
def get_insights(db: Session = Depends(get_db)):
    now = date.today()
    month_start = f"{now.year}-{now.month:02d}-01"
    last_month_start = f"{(now.replace(day=1) - timedelta(days=1)).replace(day=1).isoformat()}"
    last_month_end = now.replace(day=1).isoformat()

    def _month_spend(from_d: str, to_d: Optional[str] = None) -> float:
        q = db.query(func.sum(FinTransaction.amount)).filter(
            FinTransaction.txn_type == "expense",
            FinTransaction.txn_date >= from_d,
        )
        if to_d: q = q.filter(FinTransaction.txn_date < to_d)
        return float(q.scalar() or 0)

    this_spend = _month_spend(month_start)
    last_spend = _month_spend(last_month_start, last_month_end)

    insights: list[InsightItem] = []

    # MoM comparison
    if last_spend > 0:
        diff_pct = round((this_spend - last_spend) / last_spend * 100, 0)
        if diff_pct > 20:
            insights.append(InsightItem(type="warning", title="Spending up this month",
                body=f"You've spent {diff_pct}% more than last month (₹{int(this_spend):,} vs ₹{int(last_spend):,})"))
        elif diff_pct < -10:
            insights.append(InsightItem(type="info", title="Great spending control",
                body=f"You've spent {abs(diff_pct)}% less than last month. Keep it up!"))

    # Daily average & burn rate
    days_elapsed = now.day
    if days_elapsed > 0 and this_spend > 0:
        daily_avg = this_spend / days_elapsed
        days_in_month = 30
        projected = daily_avg * days_in_month
        insights.append(InsightItem(type="info", title="Burn rate",
            body=f"Spending ₹{int(daily_avg):,}/day. Projected month total: ₹{int(projected):,}"))

    # Top category
    cat_rows = db.query(
        FinTransaction.category_id,
        func.sum(FinTransaction.amount).label("total"),
    ).filter(
        FinTransaction.txn_type == "expense",
        FinTransaction.txn_date >= month_start,
    ).group_by(FinTransaction.category_id).order_by(func.sum(FinTransaction.amount).desc()).first()

    if cat_rows:
        cat = db.get(FinCategory, cat_rows.category_id) if cat_rows.category_id else None
        if cat:
            insights.append(InsightItem(type="info", title=f"Top category: {cat.name}",
                body=f"₹{int(float(cat_rows.total)):,} spent on {cat.name} this month"))

    # High-spend day of week
    rows = db.query(
        func.dayofweek(FinTransaction.txn_date).label("dow"),
        func.sum(FinTransaction.amount).label("total"),
    ).filter(
        FinTransaction.txn_type == "expense",
        FinTransaction.txn_date >= month_start,
    ).group_by("dow").order_by(func.sum(FinTransaction.amount).desc()).first()

    if rows:
        days = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        day_name = days[int(rows.dow)] if 1 <= int(rows.dow) <= 7 else "Unknown"
        insights.append(InsightItem(type="tip", title=f"High spend day: {day_name}",
            body=f"You spend the most on {day_name}s. Consider planning ahead."))

    # Budget alerts
    budgets = db.query(FinBudget).filter_by(year=now.year, month=now.month).all()
    for b in budgets:
        spent_q = db.query(func.sum(FinTransaction.amount)).filter(
            FinTransaction.txn_type == "expense",
            FinTransaction.txn_date >= month_start,
        )
        if b.category_id:
            spent_q = spent_q.filter(FinTransaction.category_id == b.category_id)
        spent = float(spent_q.scalar() or 0)
        pct = spent / b.amount * 100 if b.amount > 0 else 0
        cat = db.get(FinCategory, b.category_id) if b.category_id else None
        name = cat.name if cat else "Total"
        if pct >= 100:
            insights.append(InsightItem(type="warning", title=f"Budget exceeded: {name}",
                body=f"Spent ₹{int(spent):,} of ₹{int(b.amount):,} budget"))
        elif pct >= 80:
            insights.append(InsightItem(type="warning", title=f"Budget warning: {name}",
                body=f"{int(pct)}% used — only ₹{int(b.amount - spent):,} left"))

    # Subscriptions reminder
    subs = db.query(FinSubscription).filter(
        FinSubscription.is_active == True,  # noqa: E712
        FinSubscription.next_billing_date <= (now + timedelta(days=7)).isoformat(),
        FinSubscription.next_billing_date >= now.isoformat(),
    ).all()
    if subs:
        names = ", ".join(s.name for s in subs[:3])
        insights.append(InsightItem(type="tip", title="Subscriptions due soon",
            body=f"{names} billing in the next 7 days"))

    return insights[:8]
