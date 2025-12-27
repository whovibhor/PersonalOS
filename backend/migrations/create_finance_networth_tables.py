"""Create tables for the /expense (Net Worth) module.

This migration is idempotent (safe to run multiple times).
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import text

# Add parent directory to path so we can import from app
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import engine


def _table_exists(conn, table_name: str) -> bool:
    result = conn.execute(
        text(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return (result.scalar() or 0) > 0


def run_migration() -> int:
    tables = [
        "finance_assets",
        "finance_liabilities",
        "finance_recurring_rules",
        "finance_recurring_occurrences",
        "finance_transactions",
        "finance_monthly_budgets",
        "finance_category_budgets",
        "finance_goals",
        "finance_goal_allocations",
    ]

    print("Running Net Worth (finance) migration...")

    try:
        with engine.begin() as conn:
            # Assets
            if not _table_exists(conn, "finance_assets"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_assets (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(120) NOT NULL,
                            asset_type VARCHAR(32) NOT NULL,
                            asset_subtype VARCHAR(80) NULL,
                            currency VARCHAR(8) NOT NULL DEFAULT 'INR',
                            balance DECIMAL(14,2) NOT NULL DEFAULT 0,
                            is_primary TINYINT(1) NOT NULL DEFAULT 0,
                            notes TEXT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_assets_type ON finance_assets(asset_type)"))
                conn.execute(text("CREATE INDEX idx_finance_assets_primary ON finance_assets(is_primary)"))
                print("  ✓ Created finance_assets")
            else:
                print("  ✓ finance_assets exists")

            # Liabilities
            if not _table_exists(conn, "finance_liabilities"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_liabilities (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(120) NOT NULL,
                            liability_type VARCHAR(32) NOT NULL,
                            balance DECIMAL(14,2) NOT NULL DEFAULT 0,
                            credit_limit DECIMAL(14,2) NULL,
                            due_day TINYINT NULL,
                            minimum_payment DECIMAL(14,2) NULL,
                            emi_amount DECIMAL(14,2) NULL,
                            interest_rate DECIMAL(6,3) NULL,
                            tenure_months_left INT NULL,
                            notes TEXT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_liabilities_type ON finance_liabilities(liability_type)"))
                print("  ✓ Created finance_liabilities")
            else:
                print("  ✓ finance_liabilities exists")

            # Recurring rules
            if not _table_exists(conn, "finance_recurring_rules"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_recurring_rules (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(140) NOT NULL,
                            txn_type VARCHAR(16) NOT NULL,
                            amount DECIMAL(14,2) NOT NULL,
                            category VARCHAR(80) NOT NULL,
                            description TEXT NULL,
                            schedule VARCHAR(16) NOT NULL,
                            day_of_month TINYINT NULL,
                            day_of_week TINYINT NULL,
                            next_due_date DATE NOT NULL,
                            auto_create TINYINT(1) NOT NULL DEFAULT 0,
                            is_active TINYINT(1) NOT NULL DEFAULT 1,
                            asset_id INT NULL,
                            liability_id INT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL,
                            CONSTRAINT fk_finance_recurring_asset
                                FOREIGN KEY (asset_id) REFERENCES finance_assets(id)
                                ON DELETE SET NULL,
                            CONSTRAINT fk_finance_recurring_liability
                                FOREIGN KEY (liability_id) REFERENCES finance_liabilities(id)
                                ON DELETE SET NULL
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_recurring_next_due ON finance_recurring_rules(next_due_date)"))
                conn.execute(text("CREATE INDEX idx_finance_recurring_active ON finance_recurring_rules(is_active)"))
                print("  ✓ Created finance_recurring_rules")
            else:
                print("  ✓ finance_recurring_rules exists")

            # Recurring occurrences
            if not _table_exists(conn, "finance_recurring_occurrences"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_recurring_occurrences (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            recurring_id INT NOT NULL,
                            due_date DATE NOT NULL,
                            status VARCHAR(16) NOT NULL DEFAULT 'pending',
                            transaction_id INT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT fk_finance_occurrence_rule
                                FOREIGN KEY (recurring_id) REFERENCES finance_recurring_rules(id)
                                ON DELETE CASCADE
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_occurrence_due ON finance_recurring_occurrences(due_date)"))
                conn.execute(text("CREATE INDEX idx_finance_occurrence_status ON finance_recurring_occurrences(status)"))
                print("  ✓ Created finance_recurring_occurrences")
            else:
                print("  ✓ finance_recurring_occurrences exists")

            # Transactions
            if not _table_exists(conn, "finance_transactions"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_transactions (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            txn_type VARCHAR(16) NOT NULL,
                            amount DECIMAL(14,2) NOT NULL,
                            category VARCHAR(80) NOT NULL,
                            description TEXT NULL,
                            transacted_at DATETIME NOT NULL,
                            from_asset_id INT NULL,
                            to_asset_id INT NULL,
                            liability_id INT NULL,
                            recurring_id INT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL,
                            CONSTRAINT fk_finance_txn_from_asset
                                FOREIGN KEY (from_asset_id) REFERENCES finance_assets(id)
                                ON DELETE SET NULL,
                            CONSTRAINT fk_finance_txn_to_asset
                                FOREIGN KEY (to_asset_id) REFERENCES finance_assets(id)
                                ON DELETE SET NULL,
                            CONSTRAINT fk_finance_txn_liability
                                FOREIGN KEY (liability_id) REFERENCES finance_liabilities(id)
                                ON DELETE SET NULL,
                            CONSTRAINT fk_finance_txn_recurring
                                FOREIGN KEY (recurring_id) REFERENCES finance_recurring_rules(id)
                                ON DELETE SET NULL
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_txn_date ON finance_transactions(transacted_at)"))
                conn.execute(text("CREATE INDEX idx_finance_txn_type ON finance_transactions(txn_type)"))
                conn.execute(text("CREATE INDEX idx_finance_txn_category ON finance_transactions(category)"))
                print("  ✓ Created finance_transactions")
            else:
                print("  ✓ finance_transactions exists")

            # Budgets
            if not _table_exists(conn, "finance_monthly_budgets"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_monthly_budgets (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            year INT NOT NULL,
                            month INT NOT NULL,
                            total_budget DECIMAL(14,2) NOT NULL,
                            rollover_unused TINYINT(1) NOT NULL DEFAULT 0,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL,
                            UNIQUE KEY uq_finance_monthly_budget (year, month)
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                print("  ✓ Created finance_monthly_budgets")
            else:
                print("  ✓ finance_monthly_budgets exists")

            if not _table_exists(conn, "finance_category_budgets"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_category_budgets (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            year INT NOT NULL,
                            month INT NOT NULL,
                            category VARCHAR(80) NOT NULL,
                            limit_amount DECIMAL(14,2) NOT NULL,
                            rollover_unused TINYINT(1) NOT NULL DEFAULT 0,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL,
                            UNIQUE KEY uq_finance_category_budget (year, month, category)
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_category_budget_period ON finance_category_budgets(year, month)"))
                print("  ✓ Created finance_category_budgets")
            else:
                print("  ✓ finance_category_budgets exists")

            # Goals
            if not _table_exists(conn, "finance_goals"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_goals (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(140) NOT NULL,
                            description TEXT NULL,
                            target_amount DECIMAL(14,2) NOT NULL,
                            current_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
                            category VARCHAR(80) NULL,
                            target_date DATE NULL,
                            is_active TINYINT(1) NOT NULL DEFAULT 1,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                conn.execute(text("CREATE INDEX idx_finance_goals_active ON finance_goals(is_active)"))
                print("  ✓ Created finance_goals")
            else:
                print("  ✓ finance_goals exists")

            if not _table_exists(conn, "finance_goal_allocations"):
                conn.execute(
                    text(
                        """
                        CREATE TABLE finance_goal_allocations (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            goal_id INT NOT NULL,
                            asset_id INT NOT NULL,
                            allocated_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NULL,
                            UNIQUE KEY uq_finance_goal_asset (goal_id, asset_id),
                            CONSTRAINT fk_finance_goal_alloc_goal
                                FOREIGN KEY (goal_id) REFERENCES finance_goals(id)
                                ON DELETE CASCADE,
                            CONSTRAINT fk_finance_goal_alloc_asset
                                FOREIGN KEY (asset_id) REFERENCES finance_assets(id)
                                ON DELETE CASCADE
                        ) ENGINE=InnoDB;
                        """
                    )
                )
                print("  ✓ Created finance_goal_allocations")
            else:
                print("  ✓ finance_goal_allocations exists")

        print("\n✅ Finance migration complete.")
        return 0

    except Exception as exc:
        print(f"\n❌ Migration failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(run_migration())
