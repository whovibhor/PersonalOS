from __future__ import annotations

from datetime import date, datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.finance_asset import FinanceAsset
from ..models.finance_budget import FinanceCategoryBudget, FinanceMonthlyBudget
from ..models.finance_goal import FinanceGoal, FinanceGoalAllocation
from ..models.finance_liability import FinanceLiability
from ..models.finance_recurring import FinanceRecurringOccurrence, FinanceRecurringRule
from ..models.finance_transaction import FinanceTransaction
from ..models.finance_audit_log import FinanceAuditLog
from ..schemas.finance import (
    FinanceAssetCreate,
    FinanceAssetOut,
    FinanceAssetUpdate,
    FinanceAuditLogOut,
    FinanceCashflowPointOut,
    FinanceCategoryBudgetCreate,
    FinanceCategoryBudgetOut,
    FinanceCategorySpendOut,
    FinanceDashboardOut,
    FinanceGoalAllocationCreate,
    FinanceGoalAllocationOut,
    FinanceGoalCreate,
    FinanceGoalOut,
    FinanceGoalUpdate,
    FinanceLiabilityCreate,
    FinanceLiabilityOut,
    FinanceLiabilityUpdate,
    FinanceMonthlyBudgetCreate,
    FinanceMonthlyBudgetOut,
    FinanceOccurrenceOut,
    FinanceOccurrenceDetailedOut,
    FinanceRecurringCreate,
    FinanceRecurringOut,
    FinanceTransactionCreate,
    FinanceTransactionUpdate,
    FinanceTransactionOut,
)

router = APIRouter(prefix="/expense", tags=["expense"])


def _json_dumps(v) -> str:
    return json.dumps(v, default=str, ensure_ascii=False)


def _model_dict(obj, fields: list[str]) -> dict:
    return {k: getattr(obj, k) for k in fields}


def _audit(
    db: Session,
    *,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before_json: str | None,
    after_json: str | None,
) -> None:
    row = FinanceAuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        before_json=before_json,
        after_json=after_json,
    )
    db.add(row)
    db.commit()


def _txn_audit_dict(txn: FinanceTransaction) -> dict:
    return _model_dict(
        txn,
        [
            "id",
            "txn_type",
            "amount",
            "category",
            "payment_mode",
            "description",
            "transacted_at",
            "from_asset_id",
            "to_asset_id",
            "liability_id",
            "recurring_id",
            "created_at",
            "updated_at",
        ],
    )


def _apply_transaction_effect(
    db: Session,
    *,
    txn_type: str,
    amount,
    from_asset_id: int | None,
    to_asset_id: int | None,
    liability_id: int | None,
    direction: int,
) -> None:
    # direction: +1 apply, -1 reverse
    if txn_type == "income":
        if to_asset_id is None:
            raise HTTPException(status_code=400, detail="Income requires to_asset_id")
        to_asset = _require_asset(db, to_asset_id, "to")
        to_asset.balance = (to_asset.balance or 0) + (amount * direction)
        to_asset.updated_at = datetime.utcnow()

    elif txn_type == "expense":
        if from_asset_id is None:
            raise HTTPException(status_code=400, detail="Expense requires from_asset_id")
        from_asset = _require_asset(db, from_asset_id, "from")
        from_asset.balance = (from_asset.balance or 0) - (amount * direction)
        from_asset.updated_at = datetime.utcnow()

    elif txn_type == "transfer":
        if from_asset_id is None or to_asset_id is None:
            raise HTTPException(status_code=400, detail="Transfer requires from_asset_id and to_asset_id")
        if from_asset_id == to_asset_id:
            raise HTTPException(status_code=400, detail="Transfer accounts must be different")
        from_asset = _require_asset(db, from_asset_id, "from")
        to_asset = _require_asset(db, to_asset_id, "to")
        from_asset.balance = (from_asset.balance or 0) - (amount * direction)
        to_asset.balance = (to_asset.balance or 0) + (amount * direction)
        from_asset.updated_at = datetime.utcnow()
        to_asset.updated_at = datetime.utcnow()

    elif txn_type == "liability_payment":
        if liability_id is None:
            raise HTTPException(status_code=400, detail="liability_payment requires liability_id")
        if from_asset_id is None:
            raise HTTPException(status_code=400, detail="liability_payment requires from_asset_id")
        from_asset = _require_asset(db, from_asset_id, "from")
        liab = db.get(FinanceLiability, liability_id)
        if not liab:
            raise HTTPException(status_code=400, detail="Liability not found")
        from_asset.balance = (from_asset.balance or 0) - (amount * direction)
        liab.balance = (liab.balance or 0) - (amount * direction)
        from_asset.updated_at = datetime.utcnow()
        liab.updated_at = datetime.utcnow()

    else:
        raise HTTPException(status_code=400, detail="Invalid txn_type")


def _set_primary_asset(db: Session, new_primary_id: int) -> None:
    db.execute(select(FinanceAsset).where(FinanceAsset.is_primary == True))
    db.execute(
        FinanceAsset.__table__.update().values(is_primary=False).where(FinanceAsset.is_primary == True)
    )
    db.execute(FinanceAsset.__table__.update().values(is_primary=True).where(FinanceAsset.id == new_primary_id))


# --- Assets ---
@router.get("/assets", response_model=list[FinanceAssetOut])
def list_assets(db: Session = Depends(get_db)):
    stmt = select(FinanceAsset).order_by(FinanceAsset.is_primary.desc(), FinanceAsset.name.asc())
    return db.execute(stmt).scalars().all()


@router.post("/assets", response_model=FinanceAssetOut, status_code=201)
def create_asset(payload: FinanceAssetCreate, db: Session = Depends(get_db)):
    asset = FinanceAsset(
        name=payload.name,
        asset_type=payload.asset_type,
        asset_subtype=payload.asset_subtype,
        currency=payload.currency,
        balance=payload.balance,
        is_primary=payload.is_primary,
        notes=payload.notes,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    if payload.is_primary:
        _set_primary_asset(db, asset.id)
        db.commit()
        db.refresh(asset)

    _audit(
        db,
        entity_type="asset",
        entity_id=asset.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(asset, ["id", "name", "asset_type", "asset_subtype", "currency", "balance", "is_primary", "notes", "created_at", "updated_at"])),
    )

    return asset


@router.patch("/assets/{asset_id}", response_model=FinanceAssetOut)
def update_asset(asset_id: int, payload: FinanceAssetUpdate, db: Session = Depends(get_db)):
    asset = db.get(FinanceAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    before = _json_dumps(_model_dict(asset, ["id", "name", "asset_type", "asset_subtype", "currency", "balance", "is_primary", "notes", "created_at", "updated_at"]))

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(asset, k, v)
    asset.updated_at = datetime.utcnow()

    db.add(asset)
    db.commit()
    db.refresh(asset)

    if payload.is_primary:
        _set_primary_asset(db, asset.id)
        db.commit()
        db.refresh(asset)

    _audit(
        db,
        entity_type="asset",
        entity_id=asset.id,
        action="updated",
        before_json=before,
        after_json=_json_dumps(_model_dict(asset, ["id", "name", "asset_type", "asset_subtype", "currency", "balance", "is_primary", "notes", "created_at", "updated_at"])),
    )

    return asset


# --- Liabilities ---
@router.get("/liabilities", response_model=list[FinanceLiabilityOut])
def list_liabilities(db: Session = Depends(get_db)):
    stmt = select(FinanceLiability).order_by(FinanceLiability.name.asc())
    return db.execute(stmt).scalars().all()


@router.post("/liabilities", response_model=FinanceLiabilityOut, status_code=201)
def create_liability(payload: FinanceLiabilityCreate, db: Session = Depends(get_db)):
    liab = FinanceLiability(**payload.model_dump())
    db.add(liab)
    db.commit()
    db.refresh(liab)

    _audit(
        db,
        entity_type="liability",
        entity_id=liab.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(liab, ["id", "name", "liability_type", "balance", "credit_limit", "due_day", "minimum_payment", "emi_amount", "interest_rate", "tenure_months_left", "notes", "created_at", "updated_at"])),
    )
    return liab


@router.patch("/liabilities/{liability_id}", response_model=FinanceLiabilityOut)
def update_liability(liability_id: int, payload: FinanceLiabilityUpdate, db: Session = Depends(get_db)):
    liab = db.get(FinanceLiability, liability_id)
    if not liab:
        raise HTTPException(status_code=404, detail="Liability not found")

    before = _json_dumps(_model_dict(liab, ["id", "name", "liability_type", "balance", "credit_limit", "due_day", "minimum_payment", "emi_amount", "interest_rate", "tenure_months_left", "notes", "created_at", "updated_at"]))

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(liab, k, v)
    liab.updated_at = datetime.utcnow()

    db.add(liab)
    db.commit()
    db.refresh(liab)

    _audit(
        db,
        entity_type="liability",
        entity_id=liab.id,
        action="updated",
        before_json=before,
        after_json=_json_dumps(_model_dict(liab, ["id", "name", "liability_type", "balance", "credit_limit", "due_day", "minimum_payment", "emi_amount", "interest_rate", "tenure_months_left", "notes", "created_at", "updated_at"])),
    )
    return liab


# --- Transactions (with auto-updates) ---

def _get_primary_asset(db: Session) -> FinanceAsset | None:
    stmt = select(FinanceAsset).where(FinanceAsset.is_primary == True).limit(1)
    return db.execute(stmt).scalars().first()


def _ensure_primary_asset(db: Session) -> FinanceAsset:
    primary = _get_primary_asset(db)
    if primary:
        return primary

    any_asset = db.execute(select(FinanceAsset).order_by(FinanceAsset.id.asc()).limit(1)).scalars().first()
    if any_asset:
        any_asset.is_primary = True
        any_asset.updated_at = datetime.utcnow()
        db.add(any_asset)
        db.commit()
        db.refresh(any_asset)
        return any_asset

    # First-time setup: create a sensible default account so transactions can work.
    created = FinanceAsset(
        name="Primary Account",
        asset_type="cash",
        asset_subtype=None,
        currency="INR",
        balance=0,
        is_primary=True,
        notes=None,
    )
    db.add(created)
    db.commit()
    db.refresh(created)
    return created


def _require_asset(db: Session, asset_id: int, label: str) -> FinanceAsset:
    asset = db.get(FinanceAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=400, detail=f"{label} asset not found")
    return asset


@router.get("/transactions", response_model=list[FinanceTransactionOut])
def list_transactions(
    start_date: date | None = None,
    end_date: date | None = None,
    txn_type: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(FinanceTransaction)

    if start_date:
        stmt = stmt.where(FinanceTransaction.transacted_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        stmt = stmt.where(FinanceTransaction.transacted_at <= datetime.combine(end_date, datetime.max.time()))
    if txn_type:
        stmt = stmt.where(FinanceTransaction.txn_type == txn_type)
    if category:
        stmt = stmt.where(FinanceTransaction.category == category)

    stmt = stmt.order_by(FinanceTransaction.transacted_at.desc(), FinanceTransaction.id.desc())
    return db.execute(stmt).scalars().all()


@router.post("/transactions", response_model=FinanceTransactionOut, status_code=201)
def create_transaction(payload: FinanceTransactionCreate, db: Session = Depends(get_db)):
    # Validate + resolve defaults
    txn_type = payload.txn_type
    amount = payload.amount

    from_asset_id = payload.from_asset_id
    to_asset_id = payload.to_asset_id

    primary = _get_primary_asset(db)

    # Default required account when missing (supports type switches from the UI)
    if txn_type == "income" and to_asset_id is None:
        if not primary:
            primary = _ensure_primary_asset(db)
        to_asset_id = primary.id
    if txn_type == "expense" and from_asset_id is None:
        if not primary:
            primary = _ensure_primary_asset(db)
        from_asset_id = primary.id

    if txn_type == "transfer":
        if from_asset_id is None or to_asset_id is None:
            raise HTTPException(status_code=400, detail="Transfer requires from_asset_id and to_asset_id")
        if from_asset_id == to_asset_id:
            raise HTTPException(status_code=400, detail="Transfer accounts must be different")

    if txn_type == "liability_payment" and from_asset_id is None:
        if not primary:
            primary = _ensure_primary_asset(db)
        from_asset_id = primary.id

    _apply_transaction_effect(
        db,
        txn_type=txn_type,
        amount=amount,
        from_asset_id=from_asset_id,
        to_asset_id=to_asset_id,
        liability_id=payload.liability_id,
        direction=1,
    )

    txn = FinanceTransaction(
        txn_type=payload.txn_type,
        amount=payload.amount,
        category=payload.category,
        payment_mode=payload.payment_mode,
        description=payload.description,
        transacted_at=payload.transacted_at,
        from_asset_id=from_asset_id,
        to_asset_id=to_asset_id,
        liability_id=payload.liability_id,
        recurring_id=payload.recurring_id,
    )

    db.add(txn)
    db.commit()
    db.refresh(txn)

    _audit(
        db,
        entity_type="transaction",
        entity_id=txn.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_txn_audit_dict(txn)),
    )
    return txn


@router.patch("/transactions/{txn_id}", response_model=FinanceTransactionOut)
def update_transaction(txn_id: int, payload: FinanceTransactionUpdate, db: Session = Depends(get_db)):
    txn = db.get(FinanceTransaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    before = _json_dumps(_txn_audit_dict(txn))

    # Reverse old effects
    _apply_transaction_effect(
        db,
        txn_type=txn.txn_type,
        amount=txn.amount,
        from_asset_id=txn.from_asset_id,
        to_asset_id=txn.to_asset_id,
        liability_id=txn.liability_id,
        direction=-1,
    )

    data = payload.model_dump(exclude_unset=True)

    new_txn_type = data.get("txn_type", txn.txn_type)
    new_amount = data.get("amount", txn.amount)
    new_category = data.get("category", txn.category)
    new_payment_mode = data.get("payment_mode", txn.payment_mode)
    new_description = data.get("description", txn.description)
    new_transacted_at = data.get("transacted_at", txn.transacted_at)
    new_from_asset_id = data.get("from_asset_id", txn.from_asset_id)
    new_to_asset_id = data.get("to_asset_id", txn.to_asset_id)
    new_liability_id = data.get("liability_id", txn.liability_id)
    new_recurring_id = data.get("recurring_id", txn.recurring_id)

    primary = _get_primary_asset(db)

    # Default required account when missing (supports type switches)
    if new_txn_type == "income" and new_to_asset_id is None:
        if not primary:
            primary = _ensure_primary_asset(db)
        new_to_asset_id = primary.id
    if new_txn_type == "expense" and new_from_asset_id is None:
        if not primary:
            primary = _ensure_primary_asset(db)
        new_from_asset_id = primary.id

    if new_txn_type == "transfer":
        if new_from_asset_id is None or new_to_asset_id is None:
            raise HTTPException(status_code=400, detail="Transfer requires from_asset_id and to_asset_id")
        if new_from_asset_id == new_to_asset_id:
            raise HTTPException(status_code=400, detail="Transfer accounts must be different")

    if new_txn_type == "liability_payment" and new_from_asset_id is None:
        if not primary:
            primary = _ensure_primary_asset(db)
        new_from_asset_id = primary.id

    # Apply new effects
    _apply_transaction_effect(
        db,
        txn_type=new_txn_type,
        amount=new_amount,
        from_asset_id=new_from_asset_id,
        to_asset_id=new_to_asset_id,
        liability_id=new_liability_id,
        direction=1,
    )

    txn.txn_type = new_txn_type
    txn.amount = new_amount
    txn.category = new_category
    txn.payment_mode = new_payment_mode
    txn.description = new_description
    txn.transacted_at = new_transacted_at
    txn.from_asset_id = new_from_asset_id
    txn.to_asset_id = new_to_asset_id
    txn.liability_id = new_liability_id
    txn.recurring_id = new_recurring_id
    txn.updated_at = datetime.utcnow()

    db.add(txn)
    db.commit()
    db.refresh(txn)

    _audit(
        db,
        entity_type="transaction",
        entity_id=txn.id,
        action="updated",
        before_json=before,
        after_json=_json_dumps(_txn_audit_dict(txn)),
    )

    return txn


@router.delete("/transactions/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = db.get(FinanceTransaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    before = _json_dumps(_txn_audit_dict(txn))

    _apply_transaction_effect(
        db,
        txn_type=txn.txn_type,
        amount=txn.amount,
        from_asset_id=txn.from_asset_id,
        to_asset_id=txn.to_asset_id,
        liability_id=txn.liability_id,
        direction=-1,
    )

    db.delete(txn)
    db.commit()

    _audit(
        db,
        entity_type="transaction",
        entity_id=txn_id,
        action="deleted",
        before_json=before,
        after_json=None,
    )

    return None


# --- Recurring rules + occurrences ---
@router.get("/recurring", response_model=list[FinanceRecurringOut])
def list_recurring(db: Session = Depends(get_db)):
    stmt = select(FinanceRecurringRule).order_by(FinanceRecurringRule.next_due_date.asc(), FinanceRecurringRule.id.asc())
    return db.execute(stmt).scalars().all()


@router.post("/recurring", response_model=FinanceRecurringOut, status_code=201)
def create_recurring(payload: FinanceRecurringCreate, db: Session = Depends(get_db)):
    rule = FinanceRecurringRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)

    # Create initial occurrence
    occ = FinanceRecurringOccurrence(recurring_id=rule.id, due_date=rule.next_due_date, status="pending")
    db.add(occ)
    db.commit()

    _audit(
        db,
        entity_type="recurring_rule",
        entity_id=rule.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(rule, ["id", "name", "txn_type", "amount", "category", "description", "schedule", "day_of_month", "day_of_week", "next_due_date", "auto_create", "is_active", "asset_id", "liability_id", "created_at", "updated_at"])),
    )

    return rule


@router.get("/occurrences", response_model=list[FinanceOccurrenceDetailedOut])
def list_occurrences(status: str | None = None, db: Session = Depends(get_db)):
    stmt = (
        select(FinanceRecurringOccurrence, FinanceRecurringRule)
        .join(FinanceRecurringRule, FinanceRecurringRule.id == FinanceRecurringOccurrence.recurring_id)
    )
    if status:
        stmt = stmt.where(FinanceRecurringOccurrence.status == status)
    stmt = stmt.order_by(FinanceRecurringOccurrence.due_date.asc(), FinanceRecurringOccurrence.id.asc())

    rows = db.execute(stmt).all()
    out: list[FinanceOccurrenceDetailedOut] = []
    for occ, rule in rows:
        out.append(
            FinanceOccurrenceDetailedOut(
                id=occ.id,
                recurring_id=occ.recurring_id,
                due_date=occ.due_date,
                status=occ.status,
                transaction_id=occ.transaction_id,
                created_at=occ.created_at,
                name=rule.name,
                txn_type=rule.txn_type,
                amount=rule.amount,
                category=rule.category,
            )
        )
    return out


# --- Budgets ---
@router.get("/budgets/monthly", response_model=list[FinanceMonthlyBudgetOut])
def list_monthly_budgets(db: Session = Depends(get_db)):
    stmt = select(FinanceMonthlyBudget).order_by(FinanceMonthlyBudget.year.desc(), FinanceMonthlyBudget.month.desc())
    return db.execute(stmt).scalars().all()


@router.post("/budgets/monthly", response_model=FinanceMonthlyBudgetOut, status_code=201)
def upsert_monthly_budget(payload: FinanceMonthlyBudgetCreate, db: Session = Depends(get_db)):
    stmt = select(FinanceMonthlyBudget).where(
        FinanceMonthlyBudget.year == payload.year,
        FinanceMonthlyBudget.month == payload.month,
    )
    existing = db.execute(stmt).scalars().first()
    if existing:
        before = _json_dumps(_model_dict(existing, ["id", "year", "month", "total_budget", "rollover_unused", "created_at", "updated_at"]))
        existing.total_budget = payload.total_budget
        existing.rollover_unused = payload.rollover_unused
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        db.refresh(existing)

        _audit(
            db,
            entity_type="monthly_budget",
            entity_id=existing.id,
            action="updated",
            before_json=before,
            after_json=_json_dumps(_model_dict(existing, ["id", "year", "month", "total_budget", "rollover_unused", "created_at", "updated_at"])),
        )
        return existing

    row = FinanceMonthlyBudget(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    _audit(
        db,
        entity_type="monthly_budget",
        entity_id=row.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(row, ["id", "year", "month", "total_budget", "rollover_unused", "created_at", "updated_at"])),
    )
    return row


@router.get("/budgets/category", response_model=list[FinanceCategoryBudgetOut])
def list_category_budgets(year: int | None = None, month: int | None = None, db: Session = Depends(get_db)):
    stmt = select(FinanceCategoryBudget)
    if year is not None:
        stmt = stmt.where(FinanceCategoryBudget.year == year)
    if month is not None:
        stmt = stmt.where(FinanceCategoryBudget.month == month)
    stmt = stmt.order_by(FinanceCategoryBudget.year.desc(), FinanceCategoryBudget.month.desc(), FinanceCategoryBudget.category.asc())
    return db.execute(stmt).scalars().all()


@router.post("/budgets/category", response_model=FinanceCategoryBudgetOut, status_code=201)
def upsert_category_budget(payload: FinanceCategoryBudgetCreate, db: Session = Depends(get_db)):
    stmt = select(FinanceCategoryBudget).where(
        FinanceCategoryBudget.year == payload.year,
        FinanceCategoryBudget.month == payload.month,
        FinanceCategoryBudget.category == payload.category,
    )
    existing = db.execute(stmt).scalars().first()
    if existing:
        before = _json_dumps(_model_dict(existing, ["id", "year", "month", "category", "limit_amount", "rollover_unused", "created_at", "updated_at"]))
        existing.limit_amount = payload.limit_amount
        existing.rollover_unused = payload.rollover_unused
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        db.refresh(existing)

        _audit(
            db,
            entity_type="category_budget",
            entity_id=existing.id,
            action="updated",
            before_json=before,
            after_json=_json_dumps(_model_dict(existing, ["id", "year", "month", "category", "limit_amount", "rollover_unused", "created_at", "updated_at"])),
        )
        return existing

    row = FinanceCategoryBudget(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    _audit(
        db,
        entity_type="category_budget",
        entity_id=row.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(row, ["id", "year", "month", "category", "limit_amount", "rollover_unused", "created_at", "updated_at"])),
    )
    return row


# --- Goals ---
@router.get("/goals", response_model=list[FinanceGoalOut])
def list_goals(active_only: bool = False, db: Session = Depends(get_db)):
    stmt = select(FinanceGoal)
    if active_only:
        stmt = stmt.where(FinanceGoal.is_active == True)
    stmt = stmt.order_by(FinanceGoal.is_active.desc(), FinanceGoal.id.desc())
    return db.execute(stmt).scalars().all()


@router.post("/goals", response_model=FinanceGoalOut, status_code=201)
def create_goal(payload: FinanceGoalCreate, db: Session = Depends(get_db)):
    goal = FinanceGoal(
        name=payload.name,
        description=payload.description,
        target_amount=payload.target_amount,
        current_amount=0,
        category=payload.category,
        target_date=payload.target_date,
        is_active=payload.is_active,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    _audit(
        db,
        entity_type="goal",
        entity_id=goal.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(goal, ["id", "name", "description", "target_amount", "current_amount", "category", "target_date", "is_active", "created_at", "updated_at"])),
    )
    return goal


@router.patch("/goals/{goal_id}", response_model=FinanceGoalOut)
def update_goal(goal_id: int, payload: FinanceGoalUpdate, db: Session = Depends(get_db)):
    goal = db.get(FinanceGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    before = _json_dumps(_model_dict(goal, ["id", "name", "description", "target_amount", "current_amount", "category", "target_date", "is_active", "created_at", "updated_at"]))

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(goal, k, v)
    goal.updated_at = datetime.utcnow()

    db.add(goal)
    db.commit()
    db.refresh(goal)

    _audit(
        db,
        entity_type="goal",
        entity_id=goal.id,
        action="updated",
        before_json=before,
        after_json=_json_dumps(_model_dict(goal, ["id", "name", "description", "target_amount", "current_amount", "category", "target_date", "is_active", "created_at", "updated_at"])),
    )
    return goal


@router.get("/goal-allocations", response_model=list[FinanceGoalAllocationOut])
def list_goal_allocations(goal_id: int | None = None, db: Session = Depends(get_db)):
    stmt = select(FinanceGoalAllocation)
    if goal_id is not None:
        stmt = stmt.where(FinanceGoalAllocation.goal_id == goal_id)
    return db.execute(stmt).scalars().all()


@router.post("/goal-allocations", response_model=FinanceGoalAllocationOut, status_code=201)
def upsert_goal_allocation(payload: FinanceGoalAllocationCreate, db: Session = Depends(get_db)):
    stmt = select(FinanceGoalAllocation).where(
        FinanceGoalAllocation.goal_id == payload.goal_id,
        FinanceGoalAllocation.asset_id == payload.asset_id,
    )
    existing = db.execute(stmt).scalars().first()
    if existing:
        before = _json_dumps(_model_dict(existing, ["id", "goal_id", "asset_id", "allocated_amount", "created_at", "updated_at"]))
        existing.allocated_amount = payload.allocated_amount
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        db.refresh(existing)

        _audit(
            db,
            entity_type="goal_allocation",
            entity_id=existing.id,
            action="updated",
            before_json=before,
            after_json=_json_dumps(_model_dict(existing, ["id", "goal_id", "asset_id", "allocated_amount", "created_at", "updated_at"])),
        )
        return existing

    row = FinanceGoalAllocation(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    _audit(
        db,
        entity_type="goal_allocation",
        entity_id=row.id,
        action="created",
        before_json=None,
        after_json=_json_dumps(_model_dict(row, ["id", "goal_id", "asset_id", "allocated_amount", "created_at", "updated_at"])),
    )
    return row


@router.get("/history", response_model=list[FinanceAuditLogOut])
def list_finance_history(
    entity_type: str | None = None,
    entity_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = max(1, min(200, limit))
    offset = max(0, offset)

    stmt = select(FinanceAuditLog)
    if entity_type:
        stmt = stmt.where(FinanceAuditLog.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(FinanceAuditLog.entity_id == entity_id)

    stmt = stmt.order_by(FinanceAuditLog.created_at.desc(), FinanceAuditLog.id.desc()).limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()


# --- Dashboard / analytics ---
@router.get("/dashboard", response_model=FinanceDashboardOut)
def dashboard(db: Session = Depends(get_db)):
    total_assets = db.execute(select(func.coalesce(func.sum(FinanceAsset.balance), 0))).scalar() or 0
    total_liabilities = db.execute(select(func.coalesce(func.sum(FinanceLiability.balance), 0))).scalar() or 0
    net_worth = total_assets - total_liabilities

    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    income = (
        db.execute(
            select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
                FinanceTransaction.txn_type == "income",
                FinanceTransaction.transacted_at >= month_start,
            )
        ).scalar()
        or 0
    )

    expenses = (
        db.execute(
            select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
                FinanceTransaction.txn_type.in_(["expense", "liability_payment"]),
                FinanceTransaction.transacted_at >= month_start,
            )
        ).scalar()
        or 0
    )

    savings = income - expenses
    savings_rate = float((savings / income) * 100) if income else 0.0

    return FinanceDashboardOut(
        net_worth=net_worth,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        income_this_month=income,
        expenses_this_month=expenses,
        savings_this_month=savings,
        savings_rate=savings_rate,
    )


@router.get("/analytics/category-spend", response_model=list[FinanceCategorySpendOut])
def category_spend(year: int, month: int, db: Session = Depends(get_db)):
    start = datetime(year, month, 1)
    end = datetime(year + (month // 12), ((month % 12) + 1), 1)

    stmt = (
        select(
            FinanceTransaction.category.label("category"),
            func.coalesce(func.sum(FinanceTransaction.amount), 0).label("total"),
            func.count(FinanceTransaction.id).label("count"),
        )
        .where(
            FinanceTransaction.txn_type.in_(["expense", "liability_payment"]),
            FinanceTransaction.transacted_at >= start,
            FinanceTransaction.transacted_at < end,
        )
        .group_by(FinanceTransaction.category)
        .order_by(func.sum(FinanceTransaction.amount).desc())
    )

    rows = db.execute(stmt).all()
    return [FinanceCategorySpendOut(category=r.category, total=r.total, count=r.count) for r in rows]


@router.get("/analytics/cashflow", response_model=list[FinanceCashflowPointOut])
def cashflow(last_n_months: int | None = None, db: Session = Depends(get_db)):
    # Monthly rollup based on UTC timestamps.
    # Default: start from the first transaction month (avoids empty past months).
    now = datetime.utcnow()

    first_txn_at = db.execute(select(func.min(FinanceTransaction.transacted_at))).scalar()
    if not first_txn_at:
        return []

    start_year = first_txn_at.year
    start_month = first_txn_at.month

    if last_n_months is not None:
        last_n_months = max(1, min(240, last_n_months))
        window_year = now.year
        window_month = now.month - (last_n_months - 1)
        while window_month <= 0:
            window_month += 12
            window_year -= 1

        # Use whichever is later: first transaction month OR requested window.
        if (window_year, window_month) > (start_year, start_month):
            start_year, start_month = window_year, window_month

    start = datetime(start_year, start_month, 1)

    ym = func.date_format(FinanceTransaction.transacted_at, "%Y-%m")

    income_stmt = (
        select(ym.label("month"), func.coalesce(func.sum(FinanceTransaction.amount), 0).label("income"))
        .where(FinanceTransaction.txn_type == "income", FinanceTransaction.transacted_at >= start)
        .group_by(ym)
    )

    expense_stmt = (
        select(ym.label("month"), func.coalesce(func.sum(FinanceTransaction.amount), 0).label("expense"))
        .where(
            FinanceTransaction.txn_type.in_(["expense", "liability_payment"]),
            FinanceTransaction.transacted_at >= start,
        )
        .group_by(ym)
    )

    income_rows = {r.month: r.income for r in db.execute(income_stmt).all()}
    expense_rows = {r.month: r.expense for r in db.execute(expense_stmt).all()}

    # build continuous months from start to current month (inclusive)
    out: list[FinanceCashflowPointOut] = []
    months = (now.year - start_year) * 12 + (now.month - start_month) + 1
    months = max(1, min(240, months))

    y, m = start_year, start_month
    for _ in range(months):
        key = f"{y:04d}-{m:02d}"
        inc = income_rows.get(key, 0)
        exp = expense_rows.get(key, 0)
        out.append(FinanceCashflowPointOut(month=key, income=inc, expense=exp, savings=inc - exp))
        m += 1
        if m == 13:
            m = 1
            y += 1

    return out
