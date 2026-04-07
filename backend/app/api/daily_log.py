from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.daily_log import DailyLog
from ..schemas.daily_log import DailyLogCreate, DailyLogOut, DailyLogUpdate, _compute_score

router = APIRouter(prefix="/daily-log", tags=["daily-log"])


def _to_out(log: DailyLog) -> DailyLogOut:
    return DailyLogOut.model_validate(log)


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

    score = _compute_score(payload.mood, payload.energy, payload.focus)

    if existing:
        if payload.mood is not None:
            existing.mood = payload.mood
        if payload.energy is not None:
            existing.energy = payload.energy
        if payload.focus is not None:
            existing.focus = payload.focus
        if payload.reflection is not None:
            existing.reflection = payload.reflection
        existing.score = _compute_score(existing.mood, existing.energy, existing.focus)
        db.commit()
        db.refresh(existing)
        return _to_out(existing)

    log = DailyLog(
        log_date=payload.log_date,
        mood=payload.mood,
        energy=payload.energy,
        focus=payload.focus,
        reflection=payload.reflection,
        score=score,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _to_out(log)


@router.patch("/{log_id}", response_model=DailyLogOut)
def update_log(log_id: int, payload: DailyLogUpdate, db: Session = Depends(get_db)):
    log = db.get(DailyLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    if payload.mood is not None:
        log.mood = payload.mood
    if payload.energy is not None:
        log.energy = payload.energy
    if payload.focus is not None:
        log.focus = payload.focus
    if payload.reflection is not None:
        log.reflection = payload.reflection

    log.score = _compute_score(log.mood, log.energy, log.focus)
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
