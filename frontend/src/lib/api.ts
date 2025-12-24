export type TaskStatus = 'todo' | 'overdue' | 'done'

export type Task = {
    id: number
    title: string
    description: string | null
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
    due_date?: string
    priority?: 1 | 2 | 3
}

export type TaskUpdate = {
    title?: string
    description?: string | null
    due_date?: string | null
    priority?: 1 | 2 | 3
    completed?: boolean
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

export type Expense = {
    id: number
    amount: number
    category: string
    description: string | null
    spent_on: string
    created_at: string
}

export type ExpenseCreate = {
    amount: number
    category: string
    description?: string | null
    spent_on?: string
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

export async function createTask(payload: TaskCreate) {
    return api<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateTask(taskId: number, payload: TaskUpdate) {
    return api<Task>(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteTask(taskId: number) {
    return api<void>(`/api/tasks/${taskId}`, { method: 'DELETE' })
}

export async function listHabits() {
    return api<Habit[]>('/api/habits')
}

export async function createHabit(payload: HabitCreate) {
    return api<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listExpenses() {
    return api<Expense[]>('/api/expenses')
}

export async function createExpense(payload: ExpenseCreate) {
    return api<Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(payload) })
}
