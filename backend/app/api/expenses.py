from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.expense import Expense
from ..schemas.expense import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db)):
    stmt = select(Expense).order_by(Expense.spent_on.desc(), Expense.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(
        amount=payload.amount,
        category=payload.category,
        description=payload.description,
        spent_on=payload.spent_on,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense
