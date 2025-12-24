"""Test the API endpoint for creating tasks"""
import requests
import json

API_BASE = "http://localhost:8000/api"

# Test data
task_data = {
    "title": "API Test Task",
    "description": "Testing via API",
    "category": "Development",
    "labels": ["api", "test", "important"],
    "assignee": "Test User",
    "recurrence": "daily",
    "start_date": "2025-12-24",
    "estimated_minutes": 90,
    "due_date": "2025-12-30",
    "priority": 2
}

print("Creating task via API...")
print(f"Request data: {json.dumps(task_data, indent=2)}")

response = requests.post(f"{API_BASE}/tasks", json=task_data)

print(f"\nStatus Code: {response.status_code}")

if response.status_code == 201:
    created_task = response.json()
    print("\n✅ Task created successfully!")
    print(f"Response: {json.dumps(created_task, indent=2)}")
    
    # Verify all fields
    print("\n✅ Verification:")
    print(f"Category: {created_task.get('category')}")
    print(f"Labels: {created_task.get('labels')}")
    print(f"Assignee: {created_task.get('assignee')}")
    print(f"Recurrence: {created_task.get('recurrence')}")
    print(f"Start Date: {created_task.get('start_date')}")
    print(f"Estimated Minutes: {created_task.get('estimated_minutes')}")
else:
    print(f"\n❌ Error: {response.text}")
