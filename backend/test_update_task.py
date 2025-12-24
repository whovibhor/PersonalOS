"""Test updating an existing task with new fields"""
import requests
import json

API_BASE = "http://localhost:8000/api"

# Get all tasks first
print("Fetching existing tasks...")
response = requests.get(f"{API_BASE}/tasks")
tasks = response.json()

if tasks:
    task = tasks[0]  # Get the first task
    print(f"\nOriginal task (ID {task['id']}):")
    print(f"  Title: {task['title']}")
    print(f"  Category: {task.get('category')}")
    print(f"  Labels: {task.get('labels')}")
    print(f"  Assignee: {task.get('assignee')}")
    
    # Update with new fields
    update_data = {
        "category": "Updated Category",
        "labels": ["label1", "label2"],
        "assignee": "Updated Assignee",
        "recurrence": "weekly",
        "start_date": "2025-12-20",
        "estimated_minutes": 60
    }
    
    print(f"\nUpdating task with new fields...")
    response = requests.patch(f"{API_BASE}/tasks/{task['id']}", json=update_data)
    
    if response.status_code == 200:
        updated = response.json()
        print("\n✅ Task updated successfully!")
        print(f"  Category: {updated.get('category')}")
        print(f"  Labels: {updated.get('labels')}")
        print(f"  Assignee: {updated.get('assignee')}")
        print(f"  Recurrence: {updated.get('recurrence')}")
        print(f"  Start Date: {updated.get('start_date')}")
        print(f"  Estimated Minutes: {updated.get('estimated_minutes')}")
    else:
        print(f"❌ Update failed: {response.text}")
else:
    print("No tasks found to update")
