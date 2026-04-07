from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.sleep_log import SleepLog
from ..schemas.sleep_log import SleepLogCreate, SleepLogOut, SleepLogUpdate

router = APIRouter(prefix="/sleep", tags=["sleep"])


@router.get("", response_model=list[SleepLogOut])
def list_logs(limit: int = 30, db: Session = Depends(get_db)):
    stmt = select(SleepLog).order_by(SleepLog.sleep_date.desc()).limit(limit)
    return [SleepLogOut.from_orm_obj(r) for r in db.execute(stmt).scalars().all()]


@router.get("/today", response_model=SleepLogOut | None)
def get_today(db: Session = Depends(get_db)):
    today = date.today()
    log = db.execute(
        select(SleepLog).where(SleepLog.sleep_date == today)
    ).scalar_one_or_none()
    return SleepLogOut.from_orm_obj(log) if log else None


@router.post("", response_model=SleepLogOut, status_code=201)
def create_or_update_log(payload: SleepLogCreate, db: Session = Depends(get_db)):
    """Upsert: if a log already exists for the given date, update it."""
    existing = db.execute(
        select(SleepLog).where(SleepLog.sleep_date == payload.sleep_date)
    ).scalar_one_or_none()

    if existing:
        if payload.hours_slept is not None:
            existing.hours_slept = payload.hours_slept
        if payload.quality is not None:
            existing.quality = payload.quality
        if payload.wake_time is not None:
            existing.wake_time = payload.wake_time
        if payload.notes is not None:
            existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return SleepLogOut.from_orm_obj(existing)

    log = SleepLog(
        sleep_date=payload.sleep_date,
        hours_slept=payload.hours_slept,
        quality=payload.quality,
        wake_time=payload.wake_time,
        notes=payload.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return SleepLogOut.from_orm_obj(log)


@router.patch("/{log_id}", response_model=SleepLogOut)
def update_log(log_id: int, payload: SleepLogUpdate, db: Session = Depends(get_db)):
    log = db.get(SleepLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Sleep log not found")

    if payload.hours_slept is not None:
        log.hours_slept = payload.hours_slept
    if payload.quality is not None:
        log.quality = payload.quality
    if payload.wake_time is not None:
        log.wake_time = payload.wake_time
    if payload.notes is not None:
        log.notes = payload.notes

    db.commit()
    db.refresh(log)
    return SleepLogOut.from_orm_obj(log)


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.get(SleepLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    db.delete(log)
    db.commit()
