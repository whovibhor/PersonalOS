"""Database migration script to add missing columns to tasks table."""

import sys
from pathlib import Path

# Add parent directory to path so we can import from app
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import engine
from sqlalchemy import text


def run_migration():
    """Run the database migration to add missing columns."""
    
    migration_sql = """
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS labels TEXT NULL,
    ADD COLUMN IF NOT EXISTS start_date DATE NULL,
    ADD COLUMN IF NOT EXISTS estimated_minutes INT NULL,
    ADD COLUMN IF NOT EXISTS assignee VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS recurrence_completed_on DATE NULL;
    """
    
    print("Running database migration...")
    print("Adding columns: category, labels, start_date, estimated_minutes, assignee, recurrence, recurrence_completed_on")
    
    try:
        with engine.connect() as conn:
            # MySQL doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN
            # So we'll check and add each column individually
            columns_to_add = [
                ("category", "VARCHAR(100) NULL"),
                ("labels", "TEXT NULL"),
                ("start_date", "DATE NULL"),
                ("estimated_minutes", "INT NULL"),
                ("assignee", "VARCHAR(100) NULL"),
                ("recurrence", "VARCHAR(20) NULL"),
                ("recurrence_completed_on", "DATE NULL"),
            ]
            
            for column_name, column_def in columns_to_add:
                # Check if column exists
                check_sql = text("""
                    SELECT COUNT(*) as count
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'tasks'
                    AND COLUMN_NAME = :column_name
                """)
                
                result = conn.execute(check_sql, {"column_name": column_name})
                exists = result.scalar() > 0
                
                if exists:
                    print(f"  ✓ Column '{column_name}' already exists, skipping")
                else:
                    # Add the column
                    add_sql = text(f"ALTER TABLE tasks ADD COLUMN {column_name} {column_def}")
                    conn.execute(add_sql)
                    conn.commit()
                    print(f"  ✓ Added column '{column_name}'")
            
            # Show final schema
            print("\nCurrent tasks table schema:")
            result = conn.execute(text("DESCRIBE tasks"))
            for row in result:
                print(f"  - {row[0]}: {row[1]}")
            
            print("\n✅ Migration completed successfully!")
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(run_migration())
