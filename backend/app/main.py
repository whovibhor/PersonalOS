import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .api.router import router
from .core.config import settings
from .db.session import engine
from .models import Base
from .models import expense as _expense_model  # ensure model is registered
from .models import finance_asset as _finance_asset_model  # ensure model is registered
from .models import finance_budget as _finance_budget_model  # ensure model is registered
from .models import finance_goal as _finance_goal_model  # ensure model is registered
from .models import finance_liability as _finance_liability_model  # ensure model is registered
from .models import finance_recurring as _finance_recurring_model  # ensure model is registered
from .models import finance_transaction as _finance_transaction_model  # ensure model is registered
from .models import finance_audit_log as _finance_audit_log_model  # ensure model is registered
from .models import habit as _habit_model  # ensure model is registered
from .models import task as _task_model  # ensure model is registered
from .models import task_history as _task_history_model  # ensure model is registered

app = FastAPI(title=settings.app_name)


def _ensure_finance_schema() -> None:
    """Best-effort lightweight migrations for local/dev installs.

    We keep this intentionally small and additive (no destructive changes).
    """

    try:
        insp = inspect(engine)
        if not insp.has_table("finance_transactions"):
            return

        cols = {c.get("name") for c in insp.get_columns("finance_transactions")}
        if "payment_mode" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE finance_transactions ADD COLUMN payment_mode VARCHAR(32) NULL"))
            logging.getLogger(__name__).info("Added missing column finance_transactions.payment_mode")
    except Exception:
        # Never fail app startup because of an optional migration.
        logging.getLogger(__name__).exception("Finance schema check failed")


@app.on_event("startup")
def _create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_finance_schema()

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
