"""Add payment_mode column to finance_transactions for recording Cash/UPI/etc."""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

# Add the app directory to the path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings

settings = Settings()
engine = create_engine(settings.sqlalchemy_database_uri, echo=True)


def upgrade():
    with engine.connect() as conn:
        inspector = inspect(engine)
        if "finance_transactions" not in inspector.get_table_names():
            print("Table 'finance_transactions' does not exist. Nothing to alter.")
            return

        cols = {c["name"] for c in inspector.get_columns("finance_transactions")}
        if "payment_mode" in cols:
            print("Column 'payment_mode' already exists. Skipping.")
            return

        conn.execute(
            text(
                """
                ALTER TABLE finance_transactions
                ADD COLUMN payment_mode VARCHAR(32) NULL AFTER category
                """
            )
        )
        conn.commit()
        print("Added column 'payment_mode' to finance_transactions.")


def downgrade():
    with engine.connect() as conn:
        inspector = inspect(engine)
        if "finance_transactions" not in inspector.get_table_names():
            print("Table 'finance_transactions' does not exist. Nothing to alter.")
            return

        cols = {c["name"] for c in inspector.get_columns("finance_transactions")}
        if "payment_mode" not in cols:
            print("Column 'payment_mode' does not exist. Nothing to drop.")
            return

        conn.execute(text("ALTER TABLE finance_transactions DROP COLUMN payment_mode"))
        conn.commit()
        print("Dropped column 'payment_mode' from finance_transactions.")


if __name__ == "__main__":
    print("Running migration: alter_finance_transactions_add_payment_mode")
    upgrade()
