from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.daily_log import DailyLog
from ..schemas.daily_log import DailyLogCreate, DailyLogOut, DailyLogUpdate, _compute_score

router = APIRouter(prefix="/daily-log", tags=["daily-log"])

ALL_METRIC_FIELDS = [
    "mood", "energy", "focus",
    "productivity", "spending_control", "financial_mindfulness",
    "discipline", "day_satisfaction",
]


def _to_out(log: DailyLog) -> DailyLogOut:
    return DailyLogOut.model_validate(log)


def _recalc_score(log: DailyLog) -> None:
    log.score = _compute_score(*[getattr(log, f) for f in ALL_METRIC_FIELDS])


@router.get("", response_model=list[DailyLogOut])
def list_logs(limit: int = 30, db: Session = Depends(get_db)):
    stmt = select(DailyLog).order_by(DailyLog.log_date.desc()).limit(limit)
    return [_to_out(r) for r in db.execute(stmt).scalars().all()]


@router.get("/today", response_model=DailyLogOut | None)
def get_today(db: Session = Depends(get_db)):
    today = date.today()
    log = db.execute(
        select(DailyLog).where(DailyLog.log_date == today)
    ).scalar_one_or_none()
    return _to_out(log) if log else None


@router.post("", response_model=DailyLogOut, status_code=201)
def create_or_update_log(payload: DailyLogCreate, db: Session = Depends(get_db)):
    """Upsert: if a log already exists for the given date, update it."""
    existing = db.execute(
        select(DailyLog).where(DailyLog.log_date == payload.log_date)
    ).scalar_one_or_none()

    if existing:
        for field in ALL_METRIC_FIELDS:
            val = getattr(payload, field, None)
            if val is not None:
                setattr(existing, field, val)
        if payload.reflection is not None:
            existing.reflection = payload.reflection
        _recalc_score(existing)
        db.commit()
        db.refresh(existing)
        return _to_out(existing)

    log = DailyLog(
        log_date=payload.log_date,
        **{f: getattr(payload, f) for f in ALL_METRIC_FIELDS},
        reflection=payload.reflection,
    )
    _recalc_score(log)
    db.add(log)
    db.commit()
    db.refresh(log)
    return _to_out(log)


@router.patch("/{log_id}", response_model=DailyLogOut)
def update_log(log_id: int, payload: DailyLogUpdate, db: Session = Depends(get_db)):
    log = db.get(DailyLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    for field in ALL_METRIC_FIELDS:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(log, field, val)
    if payload.reflection is not None:
        log.reflection = payload.reflection

    _recalc_score(log)
    db.commit()
    db.refresh(log)
    return _to_out(log)


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.get(DailyLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
