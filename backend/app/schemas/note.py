from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def _tags_to_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [t.strip() for t in raw.split(",") if t.strip()]


def _tags_to_str(tags: list[str]) -> str | None:
    cleaned = [t.strip() for t in tags if t.strip()]
    return ",".join(cleaned) if cleaned else None


class NoteCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    content: str = Field(default="")
    tags: list[str] = Field(default_factory=list)
    note_type: str = Field(default="text")          # 'text' | 'checklist'
    checklist_items: Optional[str] = None           # JSON string
    color: Optional[str] = None
    is_pinned: bool = False
    is_archived: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    note_type: Optional[str] = None
    checklist_items: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    tags: list[str]
    note_type: str
    checklist_items: Optional[str]
    color: Optional[str]
    is_pinned: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_obj(cls, obj: object) -> "NoteOut":
        from ..models.note import Note
        assert isinstance(obj, Note)
        return cls(
            id=obj.id,
            title=obj.title,
            content=obj.content,
            tags=_tags_to_list(obj.tags),
            note_type=getattr(obj, "note_type", "text") or "text",
            checklist_items=getattr(obj, "checklist_items", None),
            color=getattr(obj, "color", None),
            is_pinned=bool(getattr(obj, "is_pinned", False)),
            is_archived=bool(getattr(obj, "is_archived", False)),
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )
