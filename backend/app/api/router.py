from fastapi import APIRouter

from .expenses import router as expenses_router
from .habits import router as habits_router
from .tasks import router as tasks_router

router = APIRouter()

router.include_router(tasks_router)
router.include_router(habits_router)
router.include_router(expenses_router)


@router.get("/health")
def health_check():
    return {"status": "ok"}
