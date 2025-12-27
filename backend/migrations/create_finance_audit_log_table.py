"""Create finance_audit_log table for tracking finance module changes."""

from sqlalchemy import create_engine, inspect, text
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings

settings = Settings()
engine = create_engine(settings.sqlalchemy_database_uri, echo=True)


def upgrade():
    with engine.connect() as conn:
        inspector = inspect(engine)
        if "finance_audit_log" in inspector.get_table_names():
            print("Table 'finance_audit_log' already exists. Skipping creation.")
            return

        create_table_sql = text(
            """
            CREATE TABLE finance_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                entity_type VARCHAR(40) NOT NULL,
                entity_id INT NULL,
                action VARCHAR(16) NOT NULL,
                before_json TEXT NULL,
                after_json TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_entity_type (entity_type),
                INDEX idx_entity_id (entity_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )

        conn.execute(create_table_sql)
        conn.commit()
        print("Table 'finance_audit_log' created successfully.")


def downgrade():
    with engine.connect() as conn:
        inspector = inspect(engine)
        if "finance_audit_log" not in inspector.get_table_names():
            print("Table 'finance_audit_log' does not exist. Nothing to drop.")
            return

        conn.execute(text("DROP TABLE finance_audit_log"))
        conn.commit()
        print("Table 'finance_audit_log' dropped successfully.")


if __name__ == "__main__":
    print("Running migration: create_finance_audit_log_table")
    upgrade()
