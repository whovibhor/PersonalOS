from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.weekly_reflection import WeeklyReflection
from ..schemas.weekly_reflection import WeeklyReflectionCreate, WeeklyReflectionOut, WeeklyReflectionUpdate

router = APIRouter(prefix="/reflections", tags=["reflections"])


def _current_iso_week() -> tuple[int, int]:
    """Return (year, week_number) for today using ISO week numbering."""
    today = date.today()
    iso = today.isocalendar()
    return iso.year, iso.week


@router.get("", response_model=list[WeeklyReflectionOut])
def list_reflections(limit: int = 20, db: Session = Depends(get_db)):
    rows = (
        db.query(WeeklyReflection)
        .order_by(WeeklyReflection.year.desc(), WeeklyReflection.week_number.desc())
        .limit(limit)
        .all()
    )
    return rows


@router.get("/this-week", response_model=Optional[WeeklyReflectionOut])
def get_this_week(db: Session = Depends(get_db)):
    year, week = _current_iso_week()
    row = db.query(WeeklyReflection).filter_by(year=year, week_number=week).first()
    return row


@router.post("", response_model=WeeklyReflectionOut)
def upsert_reflection(payload: WeeklyReflectionCreate, db: Session = Depends(get_db)):
    """Create or update the reflection for a given year+week."""
    existing = db.query(WeeklyReflection).filter_by(
        year=payload.year, week_number=payload.week_number
    ).first()

    if existing:
        for field in ("went_well", "didnt_go_well", "improvements", "highlight", "gratitude"):
            val = getattr(payload, field)
            if val is not None:
                setattr(existing, field, val)
        db.commit()
        db.refresh(existing)
        return existing

    row = WeeklyReflection(
        year=payload.year,
        week_number=payload.week_number,
        went_well=payload.went_well,
        didnt_go_well=payload.didnt_go_well,
        improvements=payload.improvements,
        highlight=payload.highlight,
        gratitude=payload.gratitude,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{reflection_id}", response_model=WeeklyReflectionOut)
def update_reflection(reflection_id: int, payload: WeeklyReflectionUpdate, db: Session = Depends(get_db)):
    row = db.query(WeeklyReflection).filter_by(id=reflection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Reflection not found")
    for field in ("went_well", "didnt_go_well", "improvements", "highlight", "gratitude"):
        val = getattr(payload, field)
        if val is not None:
            setattr(row, field, val)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{reflection_id}", status_code=204)
def delete_reflection(reflection_id: int, db: Session = Depends(get_db)):
    row = db.query(WeeklyReflection).filter_by(id=reflection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Reflection not found")
    db.delete(row)
    db.commit()
