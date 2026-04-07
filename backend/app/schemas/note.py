from __future__ import annotations

from datetime import datetime

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


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = None
    tags: list[str] | None = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    tags: list[str]
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
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )
