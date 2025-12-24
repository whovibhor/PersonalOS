"""
Create task_history table for tracking all task operations
"""

from sqlalchemy import create_engine, text, inspect
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings

settings = Settings()
engine = create_engine(settings.sqlalchemy_database_uri, echo=True)

def upgrade():
    """Create task_history table"""
    with engine.connect() as conn:
        # Check if table already exists
        inspector = inspect(engine)
        if 'task_history' in inspector.get_table_names():
            print("Table 'task_history' already exists. Skipping creation.")
            return

        # Create table
        create_table_sql = text("""
            CREATE TABLE task_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                action VARCHAR(50) NOT NULL,
                task_title VARCHAR(200) NOT NULL,
                changes TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_task_id (task_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        conn.execute(create_table_sql)
        conn.commit()
        print("Table 'task_history' created successfully.")

def downgrade():
    """Drop task_history table"""
    with engine.connect() as conn:
        # Check if table exists
        inspector = inspect(engine)
        if 'task_history' not in inspector.get_table_names():
            print("Table 'task_history' does not exist. Nothing to drop.")
            return

        drop_table_sql = text("DROP TABLE task_history")
        conn.execute(drop_table_sql)
        conn.commit()
        print("Table 'task_history' dropped successfully.")

if __name__ == "__main__":
    print("Running migration: create_task_history_table")
    upgrade()
