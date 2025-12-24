from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.router import router
from .core.config import settings
from .db.session import engine
from .models import Base
from .models import expense as _expense_model  # ensure model is registered
from .models import habit as _habit_model  # ensure model is registered
from .models import task as _task_model  # ensure model is registered
from .models import task_history as _task_history_model  # ensure model is registered

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def _create_tables() -> None:
    Base.metadata.create_all(bind=engine)

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
