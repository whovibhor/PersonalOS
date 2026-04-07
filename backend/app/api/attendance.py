from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.attendance import Attendance
from ..schemas.attendance import AttendanceCreate, AttendanceOut, AttendanceUpdate

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("", response_model=list[AttendanceOut])
def list_attendance(limit: int = 60, db: Session = Depends(get_db)):
    stmt = select(Attendance).order_by(Attendance.attend_date.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


@router.get("/today", response_model=AttendanceOut | None)
def get_today(db: Session = Depends(get_db)):
    return db.execute(
        select(Attendance).where(Attendance.attend_date == date.today())
    ).scalar_one_or_none()


@router.post("", response_model=AttendanceOut, status_code=201)
def upsert_attendance(payload: AttendanceCreate, db: Session = Depends(get_db)):
    """Upsert — if a record already exists for that date, update it."""
    existing = db.execute(
        select(Attendance).where(Attendance.attend_date == payload.attend_date)
    ).scalar_one_or_none()

    if existing:
        existing.status = payload.status
        if payload.reason is not None:
            existing.reason = payload.reason
        db.commit()
        db.refresh(existing)
        return existing

    record = Attendance(
        attend_date=payload.attend_date,
        status=payload.status,
        reason=payload.reason,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{record_id}", response_model=AttendanceOut)
def update_attendance(record_id: int, payload: AttendanceUpdate, db: Session = Depends(get_db)):
    record = db.get(Attendance, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if payload.status is not None:
        record.status = payload.status
    if payload.reason is not None:
        record.reason = payload.reason
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
def delete_attendance(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Attendance, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
