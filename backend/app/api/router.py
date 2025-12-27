from fastapi import APIRouter

from .finance import router as finance_router
from .habits import router as habits_router
from .task_history import router as task_history_router
from .tasks import router as tasks_router

router = APIRouter()

router.include_router(tasks_router)
router.include_router(habits_router)
router.include_router(finance_router)
router.include_router(task_history_router)


@router.get("/health")
def health_check():
    return {"status": "ok"}
