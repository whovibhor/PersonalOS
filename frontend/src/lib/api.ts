export type TaskStatus = 'todo' | 'overdue' | 'done'

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export type Task = {
    id: number
    title: string
    description: string | null
    category: string | null
    labels: string[]
    assignee: string | null
    recurrence: TaskRecurrence
    completed_on: string | null
    start_date: string | null
    due_date: string | null
    priority: 1 | 2 | 3
    created_at: string
    updated_at: string
    completed_at: string | null
    status: TaskStatus
}

export type TaskCreate = {
    title: string
    description?: string
    category?: string | null
    labels?: string[]
    assignee?: string | null
    recurrence?: TaskRecurrence
    start_date?: string | null
    due_date?: string
    priority?: 1 | 2 | 3
}

export type TaskUpdate = {
    title?: string
    description?: string | null
    category?: string | null
    labels?: string[]
    assignee?: string | null
    recurrence?: TaskRecurrence
    start_date?: string | null
    due_date?: string | null
    priority?: 1 | 2 | 3
    completed?: boolean
}

export type TaskHistoryAction = 'created' | 'updated' | 'deleted' | 'completed' | 'uncompleted'

export type TaskHistory = {
    id: number
    task_id: number
    action: TaskHistoryAction
    task_title: string
    changes: string | null
    created_at: string
}

export type Habit = {
    id: number
    name: string
    frequency: string
    created_at: string
    updated_at: string
}

export type HabitCreate = {
    name: string
    frequency: string
}

// --- Net Worth (Finance) module types ---
export type FinanceAsset = {
    id: number
    name: string
    asset_type: string
    asset_subtype: string | null
    currency: string
    balance: number
    is_primary: boolean
    notes: string | null
    created_at: string
    updated_at: string | null
}

export type FinanceAssetCreate = {
    name: string
    asset_type: string
    asset_subtype?: string | null
    currency?: string
    balance?: number
    is_primary?: boolean
    notes?: string | null
}

export type FinanceAssetUpdate = {
    name?: string
    asset_type?: string
    asset_subtype?: string | null
    currency?: string
    balance?: number
    is_primary?: boolean
    notes?: string | null
}

export type FinanceLiability = {
    id: number
    name: string
    liability_type: string
    balance: number
    credit_limit: number | null
    due_day: number | null
    minimum_payment: number | null
    emi_amount: number | null
    interest_rate: number | null
    tenure_months_left: number | null
    notes: string | null
    created_at: string
    updated_at: string | null
}

export type FinanceLiabilityCreate = {
    name: string
    liability_type: string
    balance?: number
    credit_limit?: number | null
    due_day?: number | null
    minimum_payment?: number | null
    emi_amount?: number | null
    interest_rate?: number | null
    tenure_months_left?: number | null
    notes?: string | null
}

export type FinanceLiabilityUpdate = Partial<FinanceLiabilityCreate>

export type FinanceTransactionType = 'income' | 'expense' | 'transfer' | 'liability_payment'

export type FinanceTransaction = {
    id: number
    txn_type: FinanceTransactionType
    amount: number
    category: string
    description: string | null
    transacted_at: string
    from_asset_id: number | null
    to_asset_id: number | null
    liability_id: number | null
    recurring_id: number | null
    created_at: string
    updated_at: string | null
}

export type FinanceTransactionCreate = {
    txn_type: FinanceTransactionType
    amount: number
    category: string
    description?: string | null
    transacted_at: string
    from_asset_id?: number | null
    to_asset_id?: number | null
    liability_id?: number | null
    recurring_id?: number | null
}

export type FinanceTransactionUpdate = {
    txn_type?: FinanceTransactionType
    amount?: number
    category?: string
    description?: string | null
    transacted_at?: string
    from_asset_id?: number | null
    to_asset_id?: number | null
    liability_id?: number | null
    recurring_id?: number | null
}

export type FinanceAuditLog = {
    id: number
    entity_type: string
    entity_id: number | null
    action: 'created' | 'updated' | 'deleted' | string
    before_json: string | null
    after_json: string | null
    created_at: string
}

export type FinanceOccurrence = {
    id: number
    recurring_id: number
    due_date: string
    status: string
    transaction_id: number | null
    created_at: string

    // Returned by backend for richer dashboard widgets
    name?: string
    txn_type?: string
    amount?: number
    category?: string
}

export type FinanceRecurringRule = {
    id: number
    name: string
    txn_type: FinanceTransactionType
    amount: number
    category: string
    description: string | null
    schedule: 'daily' | 'weekly' | 'monthly'
    day_of_month: number | null
    day_of_week: number | null
    next_due_date: string
    auto_create: boolean
    is_active: boolean
    asset_id: number | null
    liability_id: number | null
    created_at: string
    updated_at: string | null
}

export type FinanceRecurringCreate = {
    name: string
    txn_type: FinanceTransactionType
    amount: number
    category: string
    description?: string | null
    schedule: 'daily' | 'weekly' | 'monthly'
    day_of_month?: number | null
    day_of_week?: number | null
    next_due_date: string
    auto_create?: boolean
    is_active?: boolean
    asset_id?: number | null
    liability_id?: number | null
}

export type FinanceGoal = {
    id: number
    name: string
    description: string | null
    target_amount: number
    current_amount: number
    category: string | null
    target_date: string | null
    is_active: boolean
    created_at: string
    updated_at: string | null
}

export type FinanceGoalCreate = {
    name: string
    description?: string | null
    target_amount: number
    category?: string | null
    target_date?: string | null
    is_active?: boolean
}

export type FinanceGoalUpdate = {
    name?: string
    description?: string | null
    target_amount?: number
    current_amount?: number
    category?: string | null
    target_date?: string | null
    is_active?: boolean
}

export type FinanceMonthlyBudget = {
    id: number
    year: number
    month: number
    total_budget: number
    rollover_unused: boolean
    created_at: string
    updated_at: string | null
}

export type FinanceMonthlyBudgetCreate = {
    year: number
    month: number
    total_budget: number
    rollover_unused?: boolean
}

export type FinanceCategoryBudget = {
    id: number
    year: number
    month: number
    category: string
    limit_amount: number
    rollover_unused: boolean
    created_at: string
    updated_at: string | null
}

export type FinanceCategoryBudgetCreate = {
    year: number
    month: number
    category: string
    limit_amount: number
    rollover_unused?: boolean
}

export type FinanceDashboard = {
    net_worth: number
    total_assets: number
    total_liabilities: number
    income_this_month: number
    expenses_this_month: number
    savings_this_month: number
    savings_rate: number
}

export type FinanceCategorySpend = {
    category: string
    total: number
    count: number
}

export type FinanceCashflowPoint = {
    month: string
    income: number
    expense: number
    savings: number
}

function getApiBaseUrl() {
    const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
    return fromEnv.trim().length > 0 ? fromEnv : ''
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        const maybeProxyError =
            res.status === 500 &&
            (text.includes('Error occurred while trying to proxy') ||
                text.includes('ECONNREFUSED') ||
                text.includes('connect ECONNREFUSED') ||
                text.includes('socket hang up'))

        if (maybeProxyError) {
            throw new Error(
                'Backend API is not reachable. Start FastAPI on http://127.0.0.1:8000 then retry.'
            )
        }
        throw new Error(text || `HTTP ${res.status}`)
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
}

export async function listTasks(view: 'all' | 'today') {
    return api<Task[]>(`/api/tasks?view=${view}`)
}

export async function getTask(taskId: number) {
    return api<Task>(`/api/tasks/${taskId}`)
}

export async function createTask(payload: TaskCreate) {
    return api<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateTask(taskId: number, payload: TaskUpdate) {
    return api<Task>(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteTask(taskId: number) {
    return api<void>(`/api/tasks/${taskId}`, { method: 'DELETE' })
}

export async function getTaskHistory(limit = 50) {
    return api<TaskHistory[]>(`/api/task-history?limit=${limit}`)
}

export async function listHabits() {
    return api<Habit[]>('/api/habits')
}

export async function createHabit(payload: HabitCreate) {
    return api<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(payload) })
}

// --- Finance (Net Worth) API ---
export async function listFinanceAssets() {
    return api<FinanceAsset[]>('/api/expense/assets')
}

export async function createFinanceAsset(payload: FinanceAssetCreate) {
    return api<FinanceAsset>('/api/expense/assets', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinanceAsset(assetId: number, payload: FinanceAssetUpdate) {
    return api<FinanceAsset>(`/api/expense/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function listFinanceLiabilities() {
    return api<FinanceLiability[]>('/api/expense/liabilities')
}

export async function createFinanceLiability(payload: FinanceLiabilityCreate) {
    return api<FinanceLiability>('/api/expense/liabilities', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinanceLiability(liabilityId: number, payload: FinanceLiabilityUpdate) {
    return api<FinanceLiability>(`/api/expense/liabilities/${liabilityId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function listFinanceTransactions() {
    return api<FinanceTransaction[]>('/api/expense/transactions')
}

export async function createFinanceTransaction(payload: FinanceTransactionCreate) {
    return api<FinanceTransaction>('/api/expense/transactions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinanceTransaction(txnId: number, payload: FinanceTransactionUpdate) {
    return api<FinanceTransaction>(`/api/expense/transactions/${txnId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteFinanceTransaction(txnId: number) {
    return api<void>(`/api/expense/transactions/${txnId}`, { method: 'DELETE' })
}

export async function listFinanceOccurrences(status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return api<FinanceOccurrence[]>(`/api/expense/occurrences${qs}`)
}

export async function listFinanceRecurring() {
    return api<FinanceRecurringRule[]>('/api/expense/recurring')
}

export async function createFinanceRecurring(payload: FinanceRecurringCreate) {
    return api<FinanceRecurringRule>('/api/expense/recurring', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getFinanceDashboard() {
    return api<FinanceDashboard>('/api/expense/dashboard')
}

export async function getFinanceCategorySpend(year: number, month: number) {
    return api<FinanceCategorySpend[]>(`/api/expense/analytics/category-spend?year=${year}&month=${month}`)
}

export async function getFinanceCashflow(lastNMonths = 6) {
    return api<FinanceCashflowPoint[]>(`/api/expense/analytics/cashflow?last_n_months=${lastNMonths}`)
}

export async function listFinanceHistory(params?: { entity_type?: string; entity_id?: number; limit?: number; offset?: number }) {
    const qs = new URLSearchParams()
    if (params?.entity_type) qs.set('entity_type', params.entity_type)
    if (params?.entity_id != null) qs.set('entity_id', String(params.entity_id))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.offset != null) qs.set('offset', String(params.offset))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return api<FinanceAuditLog[]>(`/api/expense/history${suffix}`)
}

export async function listFinanceGoals(_includeInactive?: boolean) {
    // Backend currently returns all goals; keep param for UI convenience.
    return api<FinanceGoal[]>('/api/expense/goals')
}

export async function createFinanceGoal(payload: FinanceGoalCreate) {
    return api<FinanceGoal>('/api/expense/goals', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinanceGoal(goalId: number, payload: FinanceGoalUpdate) {
    return api<FinanceGoal>(`/api/expense/goals/${goalId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function listFinanceMonthlyBudgets() {
    return api<FinanceMonthlyBudget[]>('/api/expense/budgets/monthly')
}

export async function upsertFinanceMonthlyBudget(payload: FinanceMonthlyBudgetCreate) {
    return api<FinanceMonthlyBudget>('/api/expense/budgets/monthly', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listFinanceCategoryBudgets(year: number, month: number) {
    return api<FinanceCategoryBudget[]>(`/api/expense/budgets/category?year=${year}&month=${month}`)
}

export async function upsertFinanceCategoryBudget(payload: FinanceCategoryBudgetCreate) {
    return api<FinanceCategoryBudget>('/api/expense/budgets/category', { method: 'POST', body: JSON.stringify(payload) })
}
