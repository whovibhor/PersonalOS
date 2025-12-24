from app.db.session import SessionLocal
from app.models.task import Task

db = SessionLocal()
all_tasks = db.query(Task).all()

print(f'Total tasks: {len(all_tasks)}')
print('=' * 60)

for t in all_tasks[:10]:
    print(f'\nTask {t.id}: {t.title}')
    print(f'  Category: {t.category}')
    print(f'  Labels: {t.labels}')
    print(f'  Assignee: {t.assignee}')
    print(f'  Start: {t.start_date}')
    print(f'  Estimated Minutes: {t.estimated_minutes}')
    print(f'  Recurrence: {t.recurrence}')

db.close()
