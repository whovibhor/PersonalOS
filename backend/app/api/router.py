from fastapi import APIRouter

from .attendance import router as attendance_router
from .daily_log import router as daily_log_router
from .dashboard import router as dashboard_router
from .finance import router as finance_router
from .habits import router as habits_router
from .notes import router as notes_router
from .sleep_log import router as sleep_log_router
from .task_history import router as task_history_router
from .tasks import router as tasks_router

router = APIRouter()

router.include_router(dashboard_router)
router.include_router(tasks_router)
router.include_router(habits_router)
router.include_router(attendance_router)
router.include_router(notes_router)
router.include_router(daily_log_router)
router.include_router(sleep_log_router)
router.include_router(finance_router)
router.include_router(task_history_router)


@router.get("/health")
def health_check():
    return {"status": "ok"}
