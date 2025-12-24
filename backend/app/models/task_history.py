from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class TaskHistory(Base):
    __tablename__ = "task_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    task_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # created, updated, deleted, completed, uncompleted
    task_title: Mapped[str] = mapped_column(String(200), nullable=False)
    changes: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of changes
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
