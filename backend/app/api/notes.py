from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.note import Note
from ..schemas.note import NoteCreate, NoteOut, NoteUpdate, _tags_to_str

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(
    q: str | None = Query(default=None, description="Search title and content"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    color: str | None = Query(default=None, description="Filter by color"),
    archived: bool = Query(default=False, description="Show archived notes"),
    db: Session = Depends(get_db),
):
    stmt = select(Note).where(Note.is_archived == archived)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Note.title.ilike(like), Note.content.ilike(like), Note.checklist_items.ilike(like)))

    if tag:
        stmt = stmt.where(Note.tags.ilike(f"%{tag.strip()}%"))

    if color:
        stmt = stmt.where(Note.color == color)

    # Pinned notes first, then by updated_at desc
    stmt = stmt.order_by(Note.is_pinned.desc(), Note.updated_at.desc())

    notes = db.execute(stmt).scalars().all()
    return [NoteOut.from_orm_obj(n) for n in notes]


@router.post("", response_model=NoteOut, status_code=201)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    note = Note(
        title=payload.title.strip(),
        content=payload.content.strip(),
        tags=_tags_to_str(payload.tags),
        note_type=payload.note_type or "text",
        checklist_items=payload.checklist_items,
        color=payload.color,
        is_pinned=payload.is_pinned,
        is_archived=payload.is_archived,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteOut.from_orm_obj(note)


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteOut.from_orm_obj(note)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, payload: NoteUpdate, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if payload.title is not None:
        note.title = payload.title.strip()
    if payload.content is not None:
        note.content = payload.content.strip()
    if payload.tags is not None:
        note.tags = _tags_to_str(payload.tags)
    if payload.note_type is not None:
        note.note_type = payload.note_type
    if payload.checklist_items is not None:
        note.checklist_items = payload.checklist_items
    if payload.color is not None:
        # Allow clearing color by passing empty string
        note.color = payload.color if payload.color else None
    if payload.is_pinned is not None:
        note.is_pinned = payload.is_pinned
    if payload.is_archived is not None:
        note.is_archived = payload.is_archived

    db.commit()
    db.refresh(note)
    return NoteOut.from_orm_obj(note)


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
