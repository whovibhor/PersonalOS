"""Drop estimated_minutes column from tasks table"""
from app.db.session import engine
from sqlalchemy import text

def drop_estimated_minutes_column():
    with engine.begin() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tasks'
            AND COLUMN_NAME = 'estimated_minutes'
        """))
        
        exists = result.fetchone()[0] > 0
        
        if exists:
            print("Dropping estimated_minutes column...")
            conn.execute(text("ALTER TABLE tasks DROP COLUMN estimated_minutes"))
            print("✓ Dropped column 'estimated_minutes'")
        else:
            print("Column 'estimated_minutes' does not exist, skipping")
    
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    drop_estimated_minutes_column()
