from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


# Assets
class FinanceAssetBase(BaseModel):
    name: str
    asset_type: str
    asset_subtype: str | None = None
    currency: str = "INR"
    notes: str | None = None


class FinanceAssetCreate(FinanceAssetBase):
    balance: Decimal = Field(default=0)
    is_primary: bool = False


class FinanceAssetUpdate(BaseModel):
    name: str | None = None
    asset_type: str | None = None
    asset_subtype: str | None = None
    currency: str | None = None
    balance: Decimal | None = None
    is_primary: bool | None = None
    notes: str | None = None


class FinanceAssetOut(FinanceAssetBase):
    id: int
    balance: Decimal
    is_primary: bool
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


# Liabilities
class FinanceLiabilityBase(BaseModel):
    name: str
    liability_type: str
    notes: str | None = None


class FinanceLiabilityCreate(FinanceLiabilityBase):
    balance: Decimal = Field(default=0)
    credit_limit: Decimal | None = None
    due_day: int | None = None
    minimum_payment: Decimal | None = None
    emi_amount: Decimal | None = None
    interest_rate: Decimal | None = None
    tenure_months_left: int | None = None


class FinanceLiabilityUpdate(BaseModel):
    name: str | None = None
    liability_type: str | None = None
    balance: Decimal | None = None
    credit_limit: Decimal | None = None
    due_day: int | None = None
    minimum_payment: Decimal | None = None
    emi_amount: Decimal | None = None
    interest_rate: Decimal | None = None
    tenure_months_left: int | None = None
    notes: str | None = None


class FinanceLiabilityOut(FinanceLiabilityBase):
    id: int
    balance: Decimal
    credit_limit: Decimal | None
    due_day: int | None
    minimum_payment: Decimal | None
    emi_amount: Decimal | None
    interest_rate: Decimal | None
    tenure_months_left: int | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


# Transactions
TxnType = Literal["income", "expense", "transfer", "liability_payment"]


class FinanceTransactionCreate(BaseModel):
    txn_type: TxnType
    amount: Decimal
    category: str
    description: str | None = None

    transacted_at: datetime

    from_asset_id: int | None = None
    to_asset_id: int | None = None

    liability_id: int | None = None
    recurring_id: int | None = None


class FinanceTransactionUpdate(BaseModel):
    txn_type: TxnType | None = None
    amount: Decimal | None = None
    category: str | None = None
    description: str | None = None

    transacted_at: datetime | None = None

    from_asset_id: int | None = None
    to_asset_id: int | None = None

    liability_id: int | None = None
    recurring_id: int | None = None


class FinanceTransactionOut(BaseModel):
    id: int
    txn_type: str
    amount: Decimal
    category: str
    description: str | None
    transacted_at: datetime
    from_asset_id: int | None
    to_asset_id: int | None
    liability_id: int | None
    recurring_id: int | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


# Recurring
Schedule = Literal["daily", "weekly", "monthly"]


class FinanceRecurringCreate(BaseModel):
    name: str
    txn_type: TxnType
    amount: Decimal
    category: str
    description: str | None = None

    schedule: Schedule
    day_of_month: int | None = None
    day_of_week: int | None = None
    next_due_date: date

    auto_create: bool = False
    is_active: bool = True

    asset_id: int | None = None
    liability_id: int | None = None


class FinanceRecurringOut(BaseModel):
    id: int
    name: str
    txn_type: str
    amount: Decimal
    category: str
    description: str | None
    schedule: str
    day_of_month: int | None
    day_of_week: int | None
    next_due_date: date
    auto_create: bool
    is_active: bool
    asset_id: int | None
    liability_id: int | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class FinanceOccurrenceOut(BaseModel):
    id: int
    recurring_id: int
    due_date: date
    status: str
    transaction_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class FinanceOccurrenceDetailedOut(BaseModel):
    id: int
    recurring_id: int
    due_date: date
    status: str
    transaction_id: int | None
    created_at: datetime

    name: str
    txn_type: str
    amount: Decimal
    category: str


class FinanceAuditLogOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int | None
    action: str
    before_json: str | None
    after_json: str | None
    created_at: datetime

    class Config:
        from_attributes = True



# Budgets
class FinanceMonthlyBudgetCreate(BaseModel):
    year: int
    month: int
    total_budget: Decimal
    rollover_unused: bool = False


class FinanceMonthlyBudgetOut(BaseModel):
    id: int
    year: int
    month: int
    total_budget: Decimal
    rollover_unused: bool
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class FinanceCategoryBudgetCreate(BaseModel):
    year: int
    month: int
    category: str
    limit_amount: Decimal
    rollover_unused: bool = False


class FinanceCategoryBudgetOut(BaseModel):
    id: int
    year: int
    month: int
    category: str
    limit_amount: Decimal
    rollover_unused: bool
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


# Goals
class FinanceGoalCreate(BaseModel):
    name: str
    description: str | None = None
    target_amount: Decimal
    category: str | None = None
    target_date: date | None = None
    is_active: bool = True


class FinanceGoalUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    target_amount: Decimal | None = None
    current_amount: Decimal | None = None
    category: str | None = None
    target_date: date | None = None
    is_active: bool | None = None


class FinanceGoalOut(BaseModel):
    id: int
    name: str
    description: str | None
    target_amount: Decimal
    current_amount: Decimal
    category: str | None
    target_date: date | None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class FinanceGoalAllocationCreate(BaseModel):
    goal_id: int
    asset_id: int
    allocated_amount: Decimal


class FinanceGoalAllocationOut(BaseModel):
    id: int
    goal_id: int
    asset_id: int
    allocated_amount: Decimal
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


# Dashboard / reports
class FinanceDashboardOut(BaseModel):
    net_worth: Decimal
    total_assets: Decimal
    total_liabilities: Decimal
    income_this_month: Decimal
    expenses_this_month: Decimal
    savings_this_month: Decimal
    savings_rate: float


class FinanceCategorySpendOut(BaseModel):
    category: str
    total: Decimal
    count: int


class FinanceCashflowPointOut(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    savings: Decimal
