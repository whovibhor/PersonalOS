from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Comma-separated tags stored as plain string for simplicity
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Google Keep-style fields (additive — migrated in main.py startup)
    note_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")  # 'text' | 'checklist'
    checklist_items: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array [{id,text,checked}]
    color: Mapped[str | None] = mapped_column(String(30), nullable=True)  # e.g. 'red', 'blue', etc.
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
