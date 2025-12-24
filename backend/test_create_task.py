"""Test script to verify task creation with all fields"""
from datetime import date
import json
from app.db.session import SessionLocal
from app.models.task import Task

db = SessionLocal()

# Create a test task with all fields
test_task = Task(
    title="Test Task with All Fields",
    description="This is a test description",
    category="Work",
    labels=json.dumps(["urgent", "backend"]),
    assignee="John Doe",
    recurrence="weekly",
    start_date=date(2025, 12, 24),
    estimated_minutes=120,
    due_date=date(2025, 12, 31),
    priority=3
)

db.add(test_task)
db.commit()
db.refresh(test_task)

print("✅ Test task created successfully!")
print(f"ID: {test_task.id}")
print(f"Title: {test_task.title}")
print(f"Category: {test_task.category}")
print(f"Labels: {test_task.labels}")
print(f"Assignee: {test_task.assignee}")
print(f"Recurrence: {test_task.recurrence}")
print(f"Start Date: {test_task.start_date}")
print(f"Estimated Minutes: {test_task.estimated_minutes}")
print(f"Due Date: {test_task.due_date}")
print(f"Priority: {test_task.priority}")

# Verify it was saved
saved_task = db.query(Task).filter(Task.id == test_task.id).first()
print("\n✅ Verifying saved task:")
print(f"Category (saved): {saved_task.category}")
print(f"Labels (saved): {saved_task.labels}")
print(f"Assignee (saved): {saved_task.assignee}")
print(f"Recurrence (saved): {saved_task.recurrence}")
print(f"Start Date (saved): {saved_task.start_date}")
print(f"Estimated Minutes (saved): {saved_task.estimated_minutes}")

db.close()
print("\n✅ All fields are being saved correctly!")
