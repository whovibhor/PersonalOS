import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .api.router import router
from .core.config import settings
from .db.session import engine
from .models import Base  # importing Base also registers all models via __init__.py

app = FastAPI(title=settings.app_name)


def _ensure_daily_log_schema() -> None:
    """Add extended daily metrics columns if missing."""
    try:
        insp = inspect(engine)
        if not insp.has_table("daily_logs"):
            return
        cols = {c.get("name") for c in insp.get_columns("daily_logs")}
        new_cols = {
            "productivity": "INT NULL",
            "spending_control": "INT NULL",
            "financial_mindfulness": "INT NULL",
            "discipline": "INT NULL",
            "day_satisfaction": "INT NULL",
        }
        additions = []
        for col, definition in new_cols.items():
            if col not in cols:
                additions.append(f"ALTER TABLE daily_logs ADD COLUMN {col} {definition}")
        if additions:
            with engine.begin() as conn:
                for sql in additions:
                    conn.execute(text(sql))
            logging.getLogger(__name__).info("daily_logs schema updated: %s columns added", len(additions))
    except Exception:
        logging.getLogger(__name__).exception("daily_logs schema check failed")


def _ensure_notes_schema() -> None:
    """Additive migration: add Google Keep fields to existing notes table."""
    try:
        insp = inspect(engine)
        if not insp.has_table("notes"):
            return
        cols = {c.get("name") for c in insp.get_columns("notes")}
        additions = []
        if "note_type" not in cols:
            additions.append("ALTER TABLE notes ADD COLUMN note_type VARCHAR(20) NOT NULL DEFAULT 'text'")
        if "checklist_items" not in cols:
            additions.append("ALTER TABLE notes ADD COLUMN checklist_items LONGTEXT NULL")
        if "color" not in cols:
            additions.append("ALTER TABLE notes ADD COLUMN color VARCHAR(30) NULL")
        if "is_pinned" not in cols:
            additions.append("ALTER TABLE notes ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0")
        if "is_archived" not in cols:
            additions.append("ALTER TABLE notes ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0")
        if additions:
            with engine.begin() as conn:
                for sql in additions:
                    conn.execute(text(sql))
            logging.getLogger(__name__).info("Notes schema updated: %s", additions)
    except Exception:
        logging.getLogger(__name__).exception("Notes schema check failed")


def _auto_seed_categories() -> None:
    """Seed default finance categories if table is empty."""
    try:
        from .api.finance_new import DEFAULT_CATEGORIES
        from .db.session import SessionLocal
        from .models.fin_category import FinCategory
        db = SessionLocal()
        try:
            if db.query(FinCategory).count() == 0:
                for (name, cat_type, color, icon, sort_order) in DEFAULT_CATEGORIES:
                    db.add(FinCategory(name=name, cat_type=cat_type, color=color, icon=icon,
                                       sort_order=sort_order, is_default=True))
                db.commit()
                logging.getLogger(__name__).info("Seeded default finance categories")
        finally:
            db.close()
    except Exception:
        logging.getLogger(__name__).exception("Category seed failed")


@app.on_event("startup")
def _create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_daily_log_schema()
    _ensure_notes_schema()
    _auto_seed_categories()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
