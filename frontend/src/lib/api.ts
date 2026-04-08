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
    done_today: boolean
    current_streak: number
    longest_streak: number
    total_done: number
}

export type HabitCreate = {
    name: string
    frequency: string
}

export type HabitUpdate = {
    name?: string
    frequency?: string
}

// --- Finance module types (new) ---

export type FinAccount = {
    id: number
    name: string
    account_type: string  // cash/bank/upi/wallet
    balance: number
    color: string | null
    is_default: boolean
}

export type FinAccountCreate = {
    name: string
    account_type?: string
    balance?: number
    color?: string | null
    is_default?: boolean
}

export type FinCategory = {
    id: number
    name: string
    cat_type: string  // income/expense/both
    color: string
    icon: string
    parent_id: number | null
    is_default: boolean
    sort_order: number
}

export type FinCategoryCreate = {
    name: string
    cat_type?: string
    color?: string
    icon?: string
    parent_id?: number | null
}

export type FinTransaction = {
    id: number
    amount: number
    txn_type: string  // income/expense
    category_id: number | null
    category_name: string | null
    category_color: string | null
    category_icon: string | null
    account_id: number | null
    account_name: string | null
    payment_method: string
    notes: string | null
    txn_date: string
    created_at: string
}

export type FinTransactionCreate = {
    amount: number
    txn_type?: string
    category_id?: number | null
    account_id?: number | null
    payment_method?: string
    notes?: string | null
    txn_date?: string | null
    subscription_id?: number | null
}

export type FinBudget = {
    id: number
    year: number
    month: number
    category_id: number | null
    category_name: string | null
    amount: number
    spent: number
    pct: number
}

export type FinBudgetCreate = {
    year: number
    month: number
    category_id?: number | null
    amount: number
}

export type FinGoal = {
    id: number
    name: string
    target_amount: number
    current_amount: number
    target_date: string | null
    notes: string | null
    color: string
    is_active: boolean
    pct: number
    days_left: number | null
    daily_needed: number | null
}

export type FinGoalCreate = {
    name: string
    target_amount: number
    current_amount?: number
    target_date?: string | null
    notes?: string | null
    color?: string
}

export type FinSubscription = {
    id: number
    name: string
    amount: number
    billing_cycle: string  // monthly/yearly/weekly
    next_billing_date: string
    category_id: number | null
    category_name: string | null
    category_color: string | null
    notes: string | null
    is_active: boolean
    days_until: number
    monthly_equivalent: number
}

export type FinSubscriptionCreate = {
    name: string
    amount: number
    billing_cycle?: string
    next_billing_date: string
    category_id?: number | null
    notes?: string | null
    is_active?: boolean
}

export type FinDashboard = {
    total_balance: number
    today_spent: number
    today_income: number
    this_month_spent: number
    this_month_income: number
    this_month_savings: number
    savings_rate: number
    total_monthly_subs: number
    accounts: FinAccount[]
    recent_transactions: FinTransaction[]
}

export type FinCategorySpend = {
    category_id: number | null
    category_name: string
    category_color: string
    category_icon: string
    total: number
    count: number
    pct: number
}

export type FinDailySpend = {
    date: string
    expense: number
    income: number
}

export type FinInsight = {
    type: string  // info/warning/tip
    title: string
    body: string
}

// --- Dashboard / Today State ---

export type DashTaskItem = {
    id: number
    title: string
    priority: number
    status: string
    due_date: string | null
}

export type DashHabitItem = {
    id: number
    name: string
    frequency: string
    done_today: boolean
    current_streak: number
}

export type DashBillItem = {
    id: number
    name: string
    amount: number
    due_date: string
    days_until: number
}

export type DashDailyLog = {
    id: number
    mood: number | null
    energy: number | null
    focus: number | null
    score: number | null
}

export type DashSleepLog = {
    id: number
    hours_slept: number | null
    quality: number | null
    wake_time: string | null
    sleep_date: string
}

export type DashFinance = {
    net_worth: number
    expenses_this_month: number
    income_this_month: number
    budget_total: number | null
    budget_used_pct: number | null
}

export type DashAttendance = {
    id: number
    status: 'present' | 'absent'
    reason: string | null
}

export type TodayState = {
    date: string
    tasks_pending: number
    tasks_overdue: number
    tasks: DashTaskItem[]
    habits_done: number
    habits_total: number
    habits: DashHabitItem[]
    bills_due: DashBillItem[]
    daily_log: DashDailyLog | null
    last_sleep: DashSleepLog | null
    finance: DashFinance
    attendance: DashAttendance | null
}

export async function getTodayState() {
    return api<TodayState>('/api/dashboard/today')
}

// --- Attendance API ---

export type AttendanceStatus = 'present' | 'absent'

export type Attendance = {
    id: number
    attend_date: string
    status: AttendanceStatus
    reason: string | null
    created_at: string
    updated_at: string
}

export type AttendanceCreate = {
    attend_date?: string
    status: AttendanceStatus
    reason?: string | null
}

export async function listAttendance(limit = 60) {
    return api<Attendance[]>(`/api/attendance?limit=${limit}`)
}

export async function getTodayAttendance() {
    return api<Attendance | null>('/api/attendance/today')
}

export async function saveAttendance(payload: AttendanceCreate) {
    return api<Attendance>('/api/attendance', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateAttendance(id: number, payload: { status?: AttendanceStatus; reason?: string | null }) {
    return api<Attendance>(`/api/attendance/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
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

export async function updateHabit(habitId: number, payload: HabitUpdate) {
    return api<Habit>(`/api/habits/${habitId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteHabit(habitId: number) {
    return api<void>(`/api/habits/${habitId}`, { method: 'DELETE' })
}

export async function checkinHabit(habitId: number) {
    return api<Habit>(`/api/habits/${habitId}/checkin`, { method: 'POST' })
}

// --- Notes API ---

export type NoteType = 'text' | 'checklist'

export type ChecklistItem = {
    id: string
    text: string
    checked: boolean
}

export type Note = {
    id: number
    title: string
    content: string
    tags: string[]
    note_type: NoteType
    checklist_items: string | null   // JSON string of ChecklistItem[]
    color: string | null
    is_pinned: boolean
    is_archived: boolean
    created_at: string
    updated_at: string
}

export type NoteCreate = {
    title?: string
    content?: string
    tags?: string[]
    note_type?: NoteType
    checklist_items?: string | null
    color?: string | null
    is_pinned?: boolean
    is_archived?: boolean
}

export type NoteUpdate = {
    title?: string
    content?: string
    tags?: string[]
    note_type?: NoteType
    checklist_items?: string | null
    color?: string | null
    is_pinned?: boolean
    is_archived?: boolean
}

export async function listNotes(q?: string, tag?: string, color?: string, archived?: boolean) {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (tag) qs.set('tag', tag)
    if (color) qs.set('color', color)
    if (archived) qs.set('archived', 'true')
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return api<Note[]>(`/api/notes${suffix}`)
}

export async function createNote(payload: NoteCreate) {
    return api<Note>('/api/notes', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateNote(noteId: number, payload: NoteUpdate) {
    return api<Note>(`/api/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteNote(noteId: number) {
    return api<void>(`/api/notes/${noteId}`, { method: 'DELETE' })
}

// --- Daily Log API ---

export type DailyLog = {
    id: number
    log_date: string
    mood: number | null
    energy: number | null
    focus: number | null
    productivity: number | null
    spending_control: number | null
    financial_mindfulness: number | null
    discipline: number | null
    day_satisfaction: number | null
    reflection: string | null
    score: number | null
    created_at: string
    updated_at: string
}

export type DailyLogCreate = {
    log_date?: string
    mood?: number | null
    energy?: number | null
    focus?: number | null
    productivity?: number | null
    spending_control?: number | null
    financial_mindfulness?: number | null
    discipline?: number | null
    day_satisfaction?: number | null
    reflection?: string | null
}

export type DailyLogUpdate = {
    mood?: number | null
    energy?: number | null
    focus?: number | null
    productivity?: number | null
    spending_control?: number | null
    financial_mindfulness?: number | null
    discipline?: number | null
    day_satisfaction?: number | null
    reflection?: string | null
}

export async function listDailyLogs(limit = 30) {
    return api<DailyLog[]>(`/api/daily-log?limit=${limit}`)
}

export async function getTodayDailyLog() {
    return api<DailyLog | null>('/api/daily-log/today')
}

export async function saveDailyLog(payload: DailyLogCreate) {
    return api<DailyLog>('/api/daily-log', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateDailyLog(logId: number, payload: DailyLogUpdate) {
    return api<DailyLog>(`/api/daily-log/${logId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

// --- Sleep Log API ---

export type SleepLog = {
    id: number
    sleep_date: string
    hours_slept: number | null
    quality: number | null
    wake_time: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export type SleepLogCreate = {
    sleep_date?: string
    hours_slept?: number | null
    quality?: number | null
    wake_time?: string | null
    notes?: string | null
}

export type SleepLogUpdate = {
    hours_slept?: number | null
    quality?: number | null
    wake_time?: string | null
    notes?: string | null
}

export async function listSleepLogs(limit = 30) {
    return api<SleepLog[]>(`/api/sleep?limit=${limit}`)
}

export async function getTodaySleepLog() {
    return api<SleepLog | null>('/api/sleep/today')
}

export async function saveSleepLog(payload: SleepLogCreate) {
    return api<SleepLog>('/api/sleep', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateSleepLog(logId: number, payload: SleepLogUpdate) {
    return api<SleepLog>(`/api/sleep/${logId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

// --- Finance API (new) ---

export async function getFinanceDashboard() {
    return api<FinDashboard>('/api/finance/dashboard')
}

export async function listFinAccounts() {
    return api<FinAccount[]>('/api/finance/accounts')
}

export async function createFinAccount(payload: FinAccountCreate) {
    return api<FinAccount>('/api/finance/accounts', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinAccount(id: number, payload: FinAccountCreate) {
    return api<FinAccount>(`/api/finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteFinAccount(id: number) {
    return api<void>(`/api/finance/accounts/${id}`, { method: 'DELETE' })
}

export async function listFinCategories(cat_type?: string) {
    const qs = cat_type ? `?cat_type=${cat_type}` : ''
    return api<FinCategory[]>(`/api/finance/categories${qs}`)
}

export async function createFinCategory(payload: FinCategoryCreate) {
    return api<FinCategory>('/api/finance/categories', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinCategory(id: number, payload: FinCategoryCreate) {
    return api<FinCategory>(`/api/finance/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteFinCategory(id: number) {
    return api<void>(`/api/finance/categories/${id}`, { method: 'DELETE' })
}

export async function seedFinCategories() {
    return api<{ seeded: number; message?: string }>('/api/finance/seed-categories', { method: 'POST' })
}

export async function listFinTransactions(params?: {
    limit?: number; offset?: number; txn_type?: string;
    category_id?: number; account_id?: number; search?: string;
    from_date?: string; to_date?: string
}) {
    const qs = new URLSearchParams()
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.offset != null) qs.set('offset', String(params.offset))
    if (params?.txn_type) qs.set('txn_type', params.txn_type)
    if (params?.category_id != null) qs.set('category_id', String(params.category_id))
    if (params?.account_id != null) qs.set('account_id', String(params.account_id))
    if (params?.search) qs.set('search', params.search)
    if (params?.from_date) qs.set('from_date', params.from_date)
    if (params?.to_date) qs.set('to_date', params.to_date)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return api<FinTransaction[]>(`/api/finance/transactions${suffix}`)
}

export async function createFinTransaction(payload: FinTransactionCreate) {
    return api<FinTransaction>('/api/finance/transactions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinTransaction(id: number, payload: FinTransactionCreate) {
    return api<FinTransaction>(`/api/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteFinTransaction(id: number) {
    return api<void>(`/api/finance/transactions/${id}`, { method: 'DELETE' })
}

export async function listFinBudgets(year: number, month: number) {
    return api<FinBudget[]>(`/api/finance/budgets?year=${year}&month=${month}`)
}

export async function upsertFinBudget(payload: FinBudgetCreate) {
    return api<FinBudget>('/api/finance/budgets', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteFinBudget(id: number) {
    return api<void>(`/api/finance/budgets/${id}`, { method: 'DELETE' })
}

export async function listFinGoals() {
    return api<FinGoal[]>('/api/finance/goals')
}

export async function createFinGoal(payload: FinGoalCreate) {
    return api<FinGoal>('/api/finance/goals', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinGoal(id: number, payload: FinGoalCreate) {
    return api<FinGoal>(`/api/finance/goals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function addToFinGoal(id: number, amount: number) {
    return api<FinGoal>(`/api/finance/goals/${id}/add?amount=${amount}`, { method: 'PATCH' })
}

export async function deleteFinGoal(id: number) {
    return api<void>(`/api/finance/goals/${id}`, { method: 'DELETE' })
}

export async function listFinSubscriptions() {
    return api<FinSubscription[]>('/api/finance/subscriptions')
}

export async function createFinSubscription(payload: FinSubscriptionCreate) {
    return api<FinSubscription>('/api/finance/subscriptions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateFinSubscription(id: number, payload: FinSubscriptionCreate) {
    return api<FinSubscription>(`/api/finance/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteFinSubscription(id: number) {
    return api<void>(`/api/finance/subscriptions/${id}`, { method: 'DELETE' })
}

export async function getFinCategorySpend(year: number, month: number) {
    return api<FinCategorySpend[]>(`/api/finance/analytics/category-spend?year=${year}&month=${month}`)
}

export async function getFinDailyTrend(year: number, month: number) {
    return api<FinDailySpend[]>(`/api/finance/analytics/daily-trend?year=${year}&month=${month}`)
}

export async function getFinInsights() {
    return api<FinInsight[]>('/api/finance/analytics/insights')
}

// --- Life Calendar ---

export type CalendarDay = {
    date: string
    composite_score: number | null  // 0–100
    mood: number | null
    energy: number | null
    focus: number | null
    daily_score: number | null
    sleep_hours: number | null
    sleep_quality: number | null
    habits_done: number
    habits_total: number
}

export async function getLifeCalendar(year: number) {
    return api<CalendarDay[]>(`/api/life-calendar?year=${year}`)
}

// --- Weekly Reflection ---

export type WeeklyReflection = {
    id: number
    year: number
    week_number: number
    went_well: string | null
    didnt_go_well: string | null
    improvements: string | null
    highlight: string | null
    gratitude: string | null
    created_at: string
    updated_at: string
}

export type WeeklyReflectionCreate = {
    year: number
    week_number: number
    went_well?: string | null
    didnt_go_well?: string | null
    improvements?: string | null
    highlight?: string | null
    gratitude?: string | null
}

export type WeeklyReflectionUpdate = {
    went_well?: string | null
    didnt_go_well?: string | null
    improvements?: string | null
    highlight?: string | null
    gratitude?: string | null
}

export async function listReflections(limit = 20) {
    return api<WeeklyReflection[]>(`/api/reflections?limit=${limit}`)
}

export async function getThisWeekReflection() {
    return api<WeeklyReflection | null>('/api/reflections/this-week')
}

export async function upsertReflection(payload: WeeklyReflectionCreate) {
    return api<WeeklyReflection>('/api/reflections', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateReflection(id: number, payload: WeeklyReflectionUpdate) {
    return api<WeeklyReflection>(`/api/reflections/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteReflection(id: number) {
    return api<void>(`/api/reflections/${id}`, { method: 'DELETE' })
}

// --- Backup ---

export async function downloadBackup() {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
    const res = await fetch(`${base}/api/backup/export`)
    if (!res.ok) throw new Error('Backup export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `personalos-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
}
