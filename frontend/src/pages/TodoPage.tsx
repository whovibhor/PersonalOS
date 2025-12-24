import { useEffect, useMemo, useState } from 'react'

import { Modal } from '../components/Modal'
import { createTask, deleteTask, listTasks, updateTask } from '../lib/api'
import type { Task } from '../lib/api'

type EditState = {
    id: number
    title: string
    description: string
    category: string
    labels: string[]
    assignee: string
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
    startDate: string
    estimatedMinutes: string
    dueDate: string
    priority: 1 | 2 | 3
}

type DateMode = 'today' | 'week' | 'custom'
type ViewMode = 'list' | 'calendar' | 'board'

type StatusFilter = 'all' | 'pending' | 'completed'

const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Finance', 'Home'] as const

const ASSIGNEE_OPTIONS = ['Ashima Batra', 'Divesh Thakur', 'Dheeraj Jha', 'Alipta Dutta', 'Rohit', 'Self'] as const

const TAG_STYLES = [
    'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    'border-sky-500/25 bg-sky-500/10 text-sky-200',
    'border-amber-500/25 bg-amber-500/10 text-amber-200',
    'border-violet-500/25 bg-violet-500/10 text-violet-200',
    'border-rose-500/25 bg-rose-500/10 text-rose-200',
    'border-teal-500/25 bg-teal-500/10 text-teal-200',
] as const

function toneFor(s: string) {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return h % TAG_STYLES.length
}

function tagClass(name: string, selected: boolean) {
    const base = TAG_STYLES[toneFor(name)]
    return `rounded-full border px-3 py-1 text-xs transition ${base} ${selected ? 'ring-1 ring-zinc-600' : 'opacity-80 hover:opacity-100'}`
}

function DateInput({
    value,
    onChange,
    inputClassName,
}: {
    value: string
    onChange: (next: string) => void
    inputClassName: string
}) {
    const empty = !value
    return (
        <div className="relative">
            {empty ? (
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
                    DD-MM-YYYY
                </div>
            ) : null}
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`${inputClassName} ${empty ? 'text-transparent' : ''}`}
            />
        </div>
    )
}

function priorityLabel(p: 1 | 2 | 3) {
    if (p === 1) return 'Low'
    if (p === 2) return 'Medium'
    return 'High'
}

function priorityDot(p: 1 | 2 | 3) {
    if (p === 3) return 'bg-amber-300'
    if (p === 2) return 'bg-sky-300'
    return 'bg-zinc-400'
}

function formatToday() {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

function addDays(yyyyMmDd: string, days: number) {
    const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x))
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + days)
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

function statusBadge(status: Task['status']) {
    switch (status) {
        case 'done':
            return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20'
        case 'overdue':
            return 'bg-red-500/15 text-red-200 border-red-500/20'
        default:
            return 'bg-zinc-500/10 text-zinc-200 border-zinc-500/20'
    }
}

function normalizeLabel(s: string) {
    return s.trim().replace(/\s+/g, ' ')
}

function addLabel(list: string[], next: string) {
    const label = normalizeLabel(next)
    if (!label) return list
    const lower = label.toLowerCase()
    if (list.some((x) => x.toLowerCase() === lower)) return list
    return [...list, label]
}

function removeLabel(list: string[], label: string) {
    const lower = label.toLowerCase()
    return list.filter((x) => x.toLowerCase() !== lower)
}

function fmtEstimate(mins: number | null) {
    if (!mins || mins <= 0) return null
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function IconPencil({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
    )
}

function IconCheck({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}

function IconTrash({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 16h10l1-16" />
        </svg>
    )
}

function formatCountdown(dueYyyyMmDd: string, nowMs: number) {
    const end = new Date(`${dueYyyyMmDd}T23:59:59`)
    const diff = end.getTime() - nowMs
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff <= 0) return 'Due'
    if (diff < hour) {
        const mins = Math.max(1, Math.ceil(diff / minute))
        return `${mins}m left`
    }
    if (diff < day) {
        const hours = Math.floor(diff / hour)
        const mins = Math.floor((diff % hour) / minute)
        return `${hours}h ${mins}m left`
    }
    const days = Math.ceil(diff / day)
    return `${days} day${days === 1 ? '' : 's'} left`
}

function isCompletedOn(t: Task, yyyyMmDd: string) {
    if (t.recurrence && t.recurrence !== 'none') return t.completed_on === yyyyMmDd
    return t.completed_at != null
}

function isActiveInRange(t: Task, start: string, end: string) {
    if (!t.recurrence || t.recurrence === 'none') {
        const s = t.start_date ?? '0000-01-01'
        const e = t.due_date ?? '9999-12-31'
        return s <= end && e >= start
    }

    // For recurring tasks, check if any occurrence falls in range
    const startDate = t.start_date ?? '0000-01-01'
    const endDate = t.due_date ?? '9999-12-31'

    if (start > endDate || end < startDate) return false

    if (t.recurrence === 'daily') return true

    if (t.recurrence === 'weekly') {
        const daysDiff = Math.floor(
            (new Date(start).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysDiff >= 0 && daysDiff % 7 === 0
    }

    if (t.recurrence === 'monthly') {
        const startDay = new Date(startDate).getDate()
        const checkDay = new Date(start).getDate()
        return startDay === checkDay
    }

    return false
}

export function TodoPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState<EditState | null>(null)

    const [dateMode, setDateMode] = useState<DateMode>('today')
    const [customDate, setCustomDate] = useState(formatToday())
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [query, setQuery] = useState('')

    const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
        try {
            const saved = localStorage.getItem('todo-status-filter')
            return saved ? (JSON.parse(saved) as StatusFilter) : 'all'
        } catch {
            return 'all'
        }
    })
    const [categoryFilter, setCategoryFilter] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('todo-category-filter')
            return saved ? JSON.parse(saved) : 'all'
        } catch {
            return 'all'
        }
    })
    const [priorityFilter, setPriorityFilter] = useState<'any' | 1 | 2 | 3>(() => {
        try {
            const saved = localStorage.getItem('todo-priority-filter')
            return saved ? JSON.parse(saved) : 'any'
        } catch {
            return 'any'
        }
    })
    const [labelFilter, setLabelFilter] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('todo-label-filter')
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    const [draftStatusFilter, setDraftStatusFilter] = useState<StatusFilter>(statusFilter)
    const [draftCategoryFilter, setDraftCategoryFilter] = useState<string>(categoryFilter)
    const [draftPriorityFilter, setDraftPriorityFilter] = useState<'any' | 1 | 2 | 3>(priorityFilter)
    const [draftLabelFilter, setDraftLabelFilter] = useState<string[]>(labelFilter)

    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [detailTask, setDetailTask] = useState<Task | null>(null)

    const [addOpen, setAddOpen] = useState(false)
    const [addTitle, setAddTitle] = useState('')
    const [addCategory, setAddCategory] = useState('')
    const [addLabels, setAddLabels] = useState<string[]>([])
    const [addLabelInput, setAddLabelInput] = useState('')
    const [editLabelInput, setEditLabelInput] = useState('')
    const [addStartDate, setAddStartDate] = useState('')
    const [addEstimatedMinutes, setAddEstimatedMinutes] = useState('')
    const [addDueDate, setAddDueDate] = useState('')
    const [addPriority, setAddPriority] = useState<1 | 2 | 3>(2)
    const [addAssignee, setAddAssignee] = useState<(typeof ASSIGNEE_OPTIONS)[number]>('Self')
    const [addRecurrence, setAddRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
    const [addDescription, setAddDescription] = useState('')

    const [nowMs, setNowMs] = useState(() => Date.now())

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            const data = await listTasks('all')
            setTasks(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
        return () => window.clearInterval(id)
    }, [])

    useEffect(() => {
        localStorage.setItem('todo-status-filter', JSON.stringify(statusFilter))
    }, [statusFilter])

    useEffect(() => {
        localStorage.setItem('todo-category-filter', JSON.stringify(categoryFilter))
    }, [categoryFilter])

    useEffect(() => {
        localStorage.setItem('todo-priority-filter', JSON.stringify(priorityFilter))
    }, [priorityFilter])

    useEffect(() => {
        localStorage.setItem('todo-label-filter', JSON.stringify(labelFilter))
    }, [labelFilter])

    function startEdit(t: Task) {
        setEditLabelInput('')
        setEditing({
            id: t.id,
            title: t.title,
            description: t.description ?? '',
            category: t.category ?? '',
            labels: [...(t.labels ?? [])],
            assignee: (t.assignee ?? '').trim(),
            recurrence: t.recurrence ?? 'none',
            startDate: t.start_date ?? '',
            estimatedMinutes: t.estimated_minutes != null ? String(t.estimated_minutes) : '',
            dueDate: t.due_date ?? '',
            priority: t.priority,
        })
    }

    function startEditById(taskId: number) {
        const task = tasks.find((x) => x.id === taskId)
        if (task) {
            startEdit(task)
        } else {
            setError('Task not found')
        }
    }

    function openDetails(t: Task) {
        setSelectedId(t.id)
        setDetailTask(t)
    }

    async function saveEdit() {
        if (!editing) return
        const title = editing.title.trim()
        if (!title) return

        setLoading(true)
        setError(null)
        try {
            await updateTask(editing.id, {
                title,
                description: editing.description.trim().length > 0 ? editing.description.trim() : null,
                category: editing.category.trim().length > 0 ? editing.category.trim() : null,
                labels: editing.labels,
                assignee: editing.assignee.trim().length > 0 ? editing.assignee.trim() : null,
                recurrence: editing.recurrence,
                start_date: editing.startDate.trim().length > 0 ? editing.startDate : null,
                estimated_minutes:
                    editing.estimatedMinutes.trim().length > 0
                        ? Number(editing.estimatedMinutes)
                        : null,
                due_date: editing.dueDate.trim().length > 0 ? editing.dueDate : null,
                priority: editing.priority,
            })
            setEditing(null)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update task')
        } finally {
            setLoading(false)
        }
    }

    async function toggleComplete(t: Task) {
        setLoading(true)
        setError(null)
        try {
            const done = isCompletedOn(t, today)
            await updateTask(t.id, { completed: !done })
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update task')
        } finally {
            setLoading(false)
        }
    }

    async function remove(t: Task) {
        setLoading(true)
        setError(null)
        try {
            await deleteTask(t.id)
            if (selectedId === t.id) setSelectedId(null)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete task')
        } finally {
            setLoading(false)
        }
    }

    async function markDone(t: Task) {
        if (isCompletedOn(t, today)) return
        setLoading(true)
        setError(null)
        try {
            await updateTask(t.id, { completed: true })
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update task')
        } finally {
            setLoading(false)
        }
    }

    async function quickAdd() {
        const title = addTitle.trim()
        if (!title) return

        const est = addEstimatedMinutes.trim().length > 0 ? Number(addEstimatedMinutes) : null
        const estValid = est == null || (Number.isFinite(est) && est > 0)
        if (!estValid) return

        setLoading(true)
        setError(null)
        try {
            await createTask({
                title,
                due_date: addDueDate.trim().length > 0 ? addDueDate : undefined,
                priority: addPriority,
                description: addDescription.trim().length > 0 ? addDescription.trim() : undefined,
                category: addCategory.trim().length > 0 ? addCategory.trim() : undefined,
                labels: addLabels,
                assignee: addAssignee.trim().length > 0 ? addAssignee : undefined,
                recurrence: addRecurrence,
                start_date: addStartDate.trim().length > 0 ? addStartDate : undefined,
                estimated_minutes: est != null ? est : undefined,
            })
            setAddTitle('')
            setAddCategory('')
            setAddLabels([])
            setAddLabelInput('')
            setAddStartDate('')
            setAddEstimatedMinutes('')
            setAddDueDate('')
            setAddPriority(2)
            setAddAssignee('Self')
            setAddRecurrence('none')
            setAddDescription('')
            setAddOpen(false)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create task')
        } finally {
            setLoading(false)
        }
    }

    const today = useMemo(() => formatToday(), [])

    // Reusable filter helpers
    const taskMatchesDateMode = useMemo(() => {
        return (t: Task, mode: DateMode, customDay: string, todayDay: string) => {
            const hasRecurrence = t.recurrence && t.recurrence !== 'none'

            if (hasRecurrence) {
                if (mode === 'today') return isActiveInRange(t, todayDay, todayDay)
                if (mode === 'custom') return isActiveInRange(t, customDay, customDay)
                return isActiveInRange(t, todayDay, addDays(todayDay, 6))
            }

            const due = t.due_date
            if (mode === 'today') return due == null || due <= todayDay
            if (mode === 'custom') return due != null && due === customDay
            return due != null && due >= todayDay && due <= addDays(todayDay, 6)
        }
    }, [])

    const taskMatchesFilters = useMemo(() => {
        return (t: Task, q: string, completionDay: string) => {
            const isCompleted = isCompletedOn(t, completionDay)
            if (statusFilter === 'completed' && !isCompleted) return false
            if (statusFilter === 'pending' && isCompleted) return false

            if (categoryFilter !== 'all' && (t.category ?? '') !== categoryFilter) return false
            if (priorityFilter !== 'any' && t.priority !== priorityFilter) return false

            if (labelFilter.length > 0) {
                const set = new Set((t.labels ?? []).map((x) => x.toLowerCase()))
                const any = labelFilter.some((x) => set.has(x.toLowerCase()))
                if (!any) return false
            }

            if (q) {
                const hay = `${t.title} ${t.description ?? ''} ${t.category ?? ''} ${(t.labels ?? []).join(' ')}`.toLowerCase()
                if (!hay.includes(q)) return false
            }

            return true
        }
    }, [statusFilter, categoryFilter, priorityFilter, labelFilter])

    const availableCategories = useMemo(() => {
        const set = new Set<string>()
        for (const t of tasks) {
            const c = (t.category ?? '').trim()
            if (c) set.add(c)
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b))
    }, [tasks])

    const availableLabels = useMemo(() => {
        const set = new Set<string>()
        for (const t of tasks) {
            for (const lab of t.labels ?? []) {
                const n = normalizeLabel(lab)
                if (n) set.add(n)
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b))
    }, [tasks])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        const completionDay = dateMode === 'custom' ? customDate : today

        return tasks
            .filter((t) => {
                if (!taskMatchesDateMode(t, dateMode, customDate, today)) return false
                return taskMatchesFilters(t, q, completionDay)
            })
            .sort((a, b) => {
                const aDone = isCompletedOn(a, completionDay)
                const bDone = isCompletedOn(b, completionDay)
                if (aDone && !bDone) return 1
                if (!aDone && bDone) return -1

                const aDue = a.due_date ?? '9999-12-31'
                const bDue = b.due_date ?? '9999-12-31'
                if (aDue !== bDue) return aDue.localeCompare(bDue)

                return b.created_at.localeCompare(a.created_at)
            })
    }, [tasks, dateMode, customDate, today, query, taskMatchesDateMode, taskMatchesFilters])

    const insights = useMemo(() => {
        const q = query.trim().toLowerCase()
        const completionDay = dateMode === 'custom' ? customDate : today

        const visibleMain = tasks.filter((t) => {
            if (!taskMatchesDateMode(t, dateMode, customDate, today)) return false
            return taskMatchesFilters(t, q, completionDay)
        })

        // Add ongoing tasks to today scope
        const scope =
            dateMode === 'today'
                ? visibleMain.concat(
                    tasks.filter((t) => {
                        const hasRecurrence = t.recurrence && t.recurrence !== 'none'
                        if (hasRecurrence) return false
                        if (isCompletedOn(t, completionDay)) return false
                        if (statusFilter === 'completed') return false

                        if (!t.start_date || !t.due_date) return false
                        if (!(t.start_date <= today && t.due_date > today)) return false
                        if (!(t.start_date < t.due_date)) return false

                        return taskMatchesFilters(t, q, completionDay)
                    })
                )
                : visibleMain

        const done = scope.filter((t) => isCompletedOn(t, completionDay)).length
        const pending = scope.filter((t) => !isCompletedOn(t, completionDay)).length
        const pct = scope.length === 0 ? 0 : Math.round((done / scope.length) * 100)

        return {
            tasksToday: scope.length,
            doneToday: done,
            pendingToday: pending,
            pct,
        }
    }, [tasks, dateMode, customDate, today, query, statusFilter, taskMatchesDateMode, taskMatchesFilters])

    const upcomingPanel = useMemo(() => {
        return tasks
            .filter((t) => {
                const hasRecurrence = t.recurrence && t.recurrence !== 'none'
                return !hasRecurrence && t.completed_at == null && !!t.due_date && t.due_date > today
            })
            .sort((a, b) => {
                const aDue = a.due_date ?? '9999-12-31'
                const bDue = b.due_date ?? '9999-12-31'
                if (aDue !== bDue) return aDue.localeCompare(bDue)
                return b.created_at.localeCompare(a.created_at)
            })
            .slice(0, 8)
    }, [tasks, today])

    const completedPanel = useMemo(() => {
        return tasks
            .filter((t) => isCompletedOn(t, today))
            .sort((a, b) => {
                const aDone = a.completed_at ?? (a.completed_on ? `${a.completed_on}T23:59:59` : '')
                const bDone = b.completed_at ?? (b.completed_on ? `${b.completed_on}T23:59:59` : '')
                if (aDone !== bDone) return bDone.localeCompare(aDone)
                return b.updated_at.localeCompare(a.updated_at)
            })
            .slice(0, 8)
    }, [tasks, today])

    const ongoingToday = useMemo(() => {
        if (dateMode !== 'today') return []

        const q = query.trim().toLowerCase()
        return tasks
            .filter((t) => {
                const hasRecurrence = t.recurrence && t.recurrence !== 'none'
                if (hasRecurrence) return false

                if (isCompletedOn(t, today)) return false
                if (statusFilter === 'completed') return false

                if (!t.start_date || !t.due_date) return false
                if (!(t.start_date <= today && t.due_date > today)) return false
                if (!(t.start_date < t.due_date)) return false

                return taskMatchesFilters(t, q, today)
            })
            .sort((a, b) => {
                const aDue = a.due_date ?? '9999-12-31'
                const bDue = b.due_date ?? '9999-12-31'
                if (aDue !== bDue) return aDue.localeCompare(bDue)
                return b.created_at.localeCompare(a.created_at)
            })
    }, [dateMode, tasks, today, query, statusFilter, taskMatchesFilters])

    const todayTasks = useMemo(() => {
        if (dateMode !== 'today') return []

        const q = query.trim().toLowerCase()
        return tasks
            .filter((t) => {
                const hasRecurrence = t.recurrence && t.recurrence !== 'none'
                const isRecurringToday = hasRecurrence && isActiveInRange(t, today, today)
                const isDueToday = !hasRecurrence && t.due_date != null && t.due_date === today

                if (!isRecurringToday && !isDueToday) return false

                return taskMatchesFilters(t, q, today)
            })
            .sort((a, b) => {
                const aDone = isCompletedOn(a, today)
                const bDone = isCompletedOn(b, today)
                if (aDone && !bDone) return 1
                if (!aDone && bDone) return -1
                const aDue = a.due_date ?? '9999-12-31'
                const bDue = b.due_date ?? '9999-12-31'
                if (aDue !== bDue) return aDue.localeCompare(bDue)
                return b.created_at.localeCompare(a.created_at)
            })
    }, [dateMode, tasks, today, query, taskMatchesFilters])

    const listItems = useMemo(() => {
        if (dateMode !== 'today') return filtered
        const hidden = new Set<number>()
        for (const t of todayTasks) hidden.add(t.id)
        for (const t of ongoingToday) hidden.add(t.id)
        if (editing?.id != null) hidden.delete(editing.id)
        return filtered.filter((t) => !hidden.has(t.id))
    }, [dateMode, editing?.id, filtered, ongoingToday, todayTasks])

    const board = useMemo(() => {
        const hasRecurrence = (t: Task) => t.recurrence && t.recurrence !== 'none'
        const pending = filtered.filter((t) => !isCompletedOn(t, today) && (!t.due_date || t.due_date > today || hasRecurrence(t)))
        const inProgress = filtered.filter(
            (t) => !hasRecurrence(t) && !isCompletedOn(t, today) && !!t.due_date && t.due_date >= today && t.due_date <= addDays(today, 6)
        )
        const completed = filtered.filter((t) => isCompletedOn(t, today))
        return { pending, inProgress, completed }
    }, [filtered, today])

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 px-4 py-3 text-xs text-zinc-400">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">Today: {insights.tasksToday}</div>
                        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">Completed: {insights.doneToday}</div>
                        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">Pending: {insights.pendingToday}</div>
                        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">{insights.pct}%</div>
                    </div>
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/10 p-1">
                        <button
                            type="button"
                            onClick={() => {
                                setDateMode('today')
                            }}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${dateMode === 'today' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setDateMode('week')
                            }}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${dateMode === 'week' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            This Week
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setDateMode('custom')
                            }}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${dateMode === 'custom' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            Custom
                        </button>
                    </div>

                    {dateMode === 'custom' ? (
                        <DateInput
                            value={customDate}
                            onChange={setCustomDate}
                            inputClassName="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                        />
                    ) : null}

                    <div className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/10 p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${viewMode === 'list' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            List
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('calendar')}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${viewMode === 'calendar' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            Calendar
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('board')}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${viewMode === 'board' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            Board
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tasks…"
                        className="h-10 w-[min(360px,90vw)] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm outline-none focus:border-zinc-600"
                    />

                    <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="h-10 rounded-lg border border-emerald-600/40 bg-emerald-600/15 px-3 text-sm text-emerald-100 transition hover:bg-emerald-600/20"
                    >
                        + Add Task
                    </button>
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-12">
                <aside className="min-h-0 overflow-y-auto lg:col-span-2">
                    <div className="space-y-3">
                        <div>
                            <div className="mb-2 text-xs font-medium text-zinc-400">Filters</div>
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-2">
                                <div className="space-y-3 p-2">
                                    <div>
                                        <label className="text-xs text-zinc-400">Status</label>
                                        <div className="relative mt-1">
                                            <select
                                                value={draftStatusFilter}
                                                onChange={(e) => setDraftStatusFilter(e.target.value as StatusFilter)}
                                                className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                            >
                                                <option value="all">All</option>
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                                ▾
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-zinc-400">Category</label>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDraftCategoryFilter('all')}
                                                className={`rounded-full border px-3 py-1 text-xs transition ${draftCategoryFilter === 'all'
                                                    ? 'border-zinc-600 bg-zinc-800 text-zinc-50 ring-1 ring-zinc-600'
                                                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                All
                                            </button>
                                            {availableCategories.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setDraftCategoryFilter(c)}
                                                    className={tagClass(c, draftCategoryFilter === c)}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-zinc-400">Priority</label>
                                        <div className="relative mt-1">
                                            <select
                                                value={draftPriorityFilter}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setDraftPriorityFilter(v === 'any' ? 'any' : (Number(v) as 1 | 2 | 3))
                                                }}
                                                className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                            >
                                                <option value="any">Any</option>
                                                <option value={1}>Low</option>
                                                <option value={2}>Medium</option>
                                                <option value={3}>High</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                                ▾
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-zinc-400">Labels</label>
                                        {availableLabels.length === 0 ? (
                                            <div className="mt-2 text-sm text-zinc-500">No labels yet.</div>
                                        ) : (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {availableLabels.map((lab) => {
                                                    const active = draftLabelFilter.some((x) => x.toLowerCase() === lab.toLowerCase())
                                                    return (
                                                        <button
                                                            key={lab}
                                                            type="button"
                                                            onClick={() =>
                                                                setDraftLabelFilter((prev) =>
                                                                    active ? removeLabel(prev, lab) : addLabel(prev, lab)
                                                                )
                                                            }
                                                            className={tagClass(lab, active)}
                                                        >
                                                            {lab}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftStatusFilter('all')
                                                setDraftCategoryFilter('all')
                                                setDraftPriorityFilter('any')
                                                setDraftLabelFilter([])

                                                setStatusFilter('all')
                                                setCategoryFilter('all')
                                                setPriorityFilter('any')
                                                setLabelFilter([])
                                            }}
                                            className="h-10 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-sm text-rose-200 transition hover:bg-rose-500/15"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter(draftStatusFilter)
                                                setCategoryFilter(draftCategoryFilter)
                                                setPriorityFilter(draftPriorityFilter)
                                                setLabelFilter(draftLabelFilter)
                                            }}
                                            className="h-10 rounded-lg border border-emerald-600/40 bg-emerald-600/15 px-3 text-sm text-emerald-100 transition hover:bg-emerald-600/20"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="min-h-0 overflow-y-auto lg:col-span-7">
                    {viewMode === 'calendar' ? (
                        <div className="space-y-2">
                            {(() => {
                                const days: { date: string; label: string; tasks: Task[] }[] = []
                                const startDate = dateMode === 'custom' ? customDate : dateMode === 'today' ? today : today
                                const range = dateMode === 'week' ? 7 : dateMode === 'custom' ? 1 : 7

                                for (let i = 0; i < range; i++) {
                                    const d = addDays(startDate, i)
                                    const dt = new Date(d + 'T00:00:00')
                                    const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                    const dayTasks = filtered.filter((t) => {
                                        const hasRecurrence = t.recurrence && t.recurrence !== 'none'
                                        if (hasRecurrence) {
                                            return isActiveInRange(t, d, d)
                                        }
                                        if (t.due_date === d) return true
                                        if (t.start_date && t.due_date && t.start_date <= d && t.due_date >= d) return true
                                        return false
                                    })
                                    days.push({ date: d, label, tasks: dayTasks })
                                }

                                return days.map((day) => (
                                    <div key={day.date} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-xs font-medium text-zinc-400">{day.label}</div>
                                            <div className="text-xs text-zinc-500">{day.tasks.length} task{day.tasks.length === 1 ? '' : 's'}</div>
                                        </div>
                                        {day.tasks.length === 0 ? (
                                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-xs text-zinc-500">
                                                No tasks
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {day.tasks.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => void openDetails(t)}
                                                        className={`group flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left transition hover:bg-zinc-900 ${selectedId === t.id ? 'ring-1 ring-zinc-600' : ''}`}
                                                    >
                                                        <div className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(t.priority)}`} />
                                                        <div className={`min-w-0 flex-1 truncate text-sm ${isCompletedOn(t, day.date) ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                                                            {t.title}
                                                        </div>
                                                        {t.recurrence && t.recurrence !== 'none' ? (
                                                            <span className="shrink-0 text-xs text-zinc-500">{t.recurrence.charAt(0).toUpperCase() + t.recurrence.slice(1)}</span>
                                                        ) : null}
                                                        {isCompletedOn(t, day.date) ? (
                                                            <span className="shrink-0 text-xs text-emerald-400">✓</span>
                                                        ) : null}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            })()}
                        </div>
                    ) : null}

                    {viewMode === 'board' ? (
                        <div className="grid gap-3 md:grid-cols-3">
                            {([
                                { title: 'Pending', items: board.pending },
                                { title: 'In Progress', items: board.inProgress },
                                { title: 'Completed', items: board.completed },
                            ] as const).map((col) => (
                                <div key={col.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                                    <div className="mb-2 text-xs font-medium text-zinc-400">{col.title}</div>
                                    <div className="space-y-2">
                                        {col.items.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => void openDetails(t)}
                                                className={`block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm transition hover:bg-zinc-900 ${selectedId === t.id ? 'ring-1 ring-zinc-600' : ''}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="truncate text-zinc-100">{t.title}</div>
                                                    <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(t.priority)}`} />
                                                </div>
                                                <div className="mt-1 text-xs text-zinc-500">
                                                    {t.due_date ? `Due ${t.due_date}` : 'No due date'}
                                                </div>
                                            </button>
                                        ))}
                                        {col.items.length === 0 ? (
                                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-xs text-zinc-500">
                                                Empty
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {viewMode === 'list' ? (
                        <div className="space-y-2">
                            {dateMode === 'today' && todayTasks.length > 0 ? (
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                                    <div className="mb-2 text-xs font-medium text-zinc-400">Today</div>
                                    <div className="space-y-2">
                                        {todayTasks.map((t) => (
                                            <div
                                                key={t.id}
                                                className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => void toggleComplete(t)}
                                                    className={`h-6 w-6 shrink-0 rounded border ${isCompletedOn(t, today) ? 'border-emerald-400 bg-emerald-400/20' : 'border-zinc-600 bg-transparent'} transition-transform duration-150 ease-out hover:scale-105 active:scale-95`}
                                                    aria-label="Toggle complete"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void openDetails(t)
                                                    }}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <div className={`truncate text-sm font-medium ${isCompletedOn(t, today) ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{t.title}</div>
                                                </button>

                                                <div className="shrink-0 text-xs text-zinc-500">
                                                    {t.recurrence && t.recurrence !== 'none'
                                                        ? isCompletedOn(t, today)
                                                            ? 'Done'
                                                            : t.recurrence.charAt(0).toUpperCase() + t.recurrence.slice(1)
                                                        : t.due_date
                                                            ? `Due ${t.due_date}`
                                                            : ''}
                                                </div>

                                                <div className="hidden shrink-0 items-center gap-2 group-hover:flex">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void startEditById(t.id)
                                                        }}
                                                        aria-label="Edit"
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 transition-all duration-150 ease-out hover:scale-105 hover:bg-zinc-900 active:scale-95"
                                                    >
                                                        <IconPencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void markDone(t)
                                                        }}
                                                        aria-label="Mark as done"
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-100 transition-all duration-150 ease-out hover:scale-105 hover:bg-emerald-600/15 active:scale-95"
                                                    >
                                                        <IconCheck className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void remove(t)
                                                        }}
                                                        aria-label="Delete"
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 transition-all duration-150 ease-out hover:scale-105 hover:bg-rose-500/15 active:scale-95"
                                                    >
                                                        <IconTrash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {dateMode === 'today' && ongoingToday.length > 0 ? (
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                                    <div className="mb-2 text-xs font-medium text-zinc-400">Ongoing</div>
                                    <div className="space-y-2">
                                        {ongoingToday.map((t) => (
                                            <div
                                                key={t.id}
                                                className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => void toggleComplete(t)}
                                                    className={`h-6 w-6 shrink-0 rounded border ${isCompletedOn(t, today) ? 'border-emerald-400 bg-emerald-400/20' : 'border-zinc-600 bg-transparent'} transition-transform duration-150 ease-out hover:scale-105 active:scale-95`}
                                                    aria-label="Toggle complete"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void openDetails(t)
                                                    }}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="truncate text-sm font-medium text-zinc-100">{t.title}</div>
                                                        {t.category ? (
                                                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                                {t.category}
                                                            </span>
                                                        ) : null}
                                                        {t.estimated_minutes != null ? (
                                                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                                {fmtEstimate(t.estimated_minutes)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {t.labels && t.labels.length > 0 ? (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {t.labels.slice(0, 3).map((lab) => (
                                                                <span
                                                                    key={lab}
                                                                    className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300"
                                                                >
                                                                    {lab}
                                                                </span>
                                                            ))}
                                                            {t.labels.length > 3 ? (
                                                                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-500">
                                                                    +{t.labels.length - 3}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </button>

                                                <div className="shrink-0 text-xs text-zinc-500">{t.due_date ? formatCountdown(t.due_date, nowMs) : ''}</div>

                                                <div className="hidden shrink-0 items-center gap-2 group-hover:flex">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void startEditById(t.id)
                                                        }}
                                                        aria-label="Edit"
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 transition-all duration-150 ease-out hover:scale-105 hover:bg-zinc-900 active:scale-95"
                                                    >
                                                        <IconPencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void markDone(t)
                                                        }}
                                                        aria-label="Mark as done"
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-100 transition-all duration-150 ease-out hover:scale-105 hover:bg-emerald-600/15 active:scale-95"
                                                    >
                                                        <IconCheck className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            void remove(t)
                                                        }}
                                                        aria-label="Delete"
                                                        className="grid h-9 w-9 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 transition-all duration-150 ease-out hover:scale-105 hover:bg-rose-500/15 active:scale-95"
                                                    >
                                                        <IconTrash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {listItems.map((t) => (
                                <div
                                    key={t.id}
                                    className={`group rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/20 active:translate-y-0 ${selectedId === t.id ? 'ring-1 ring-zinc-600' : ''}`}
                                >
                                    {editing?.id === t.id ? (
                                        <div className="space-y-3">
                                            <div className="grid gap-2 md:grid-cols-12">
                                                <div className="md:col-span-6">
                                                    <label className="text-xs text-zinc-400">Title</label>
                                                    <input
                                                        value={editing.title}
                                                        onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-zinc-400">Priority</label>
                                                    <div className="relative mt-1">
                                                        <select
                                                            value={editing.priority}
                                                            onChange={(e) =>
                                                                setEditing({
                                                                    ...editing,
                                                                    priority: Number(e.target.value) as 1 | 2 | 3,
                                                                })
                                                            }
                                                            className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                                        >
                                                            <option value={1}>Low</option>
                                                            <option value={2}>Medium</option>
                                                            <option value={3}>High</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                                            ▾
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-zinc-400">Assigned</label>
                                                    <div className="relative mt-1">
                                                        <select
                                                            value={editing.assignee}
                                                            onChange={(e) => setEditing({ ...editing, assignee: e.target.value })}
                                                            className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                                        >
                                                            <option value="">Unassigned</option>
                                                            {(() => {
                                                                const current = editing.assignee.trim()
                                                                const hasCustom =
                                                                    current.length > 0 &&
                                                                    !ASSIGNEE_OPTIONS.some((x) => x.toLowerCase() === current.toLowerCase())
                                                                return (
                                                                    <>
                                                                        {hasCustom ? (
                                                                            <option value={current}>{current}</option>
                                                                        ) : null}
                                                                        {ASSIGNEE_OPTIONS.map((name) => (
                                                                            <option key={name} value={name}>
                                                                                {name}
                                                                            </option>
                                                                        ))}
                                                                    </>
                                                                )
                                                            })()}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                                            ▾
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-zinc-400">Description</label>
                                                <textarea
                                                    value={editing.description}
                                                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                                    rows={3}
                                                    className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                                />
                                            </div>

                                            <div className="grid gap-2 md:grid-cols-12">
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-zinc-400">Due date</label>
                                                    <DateInput
                                                        value={editing.dueDate}
                                                        onChange={(next) => setEditing({ ...editing, dueDate: next })}
                                                        inputClassName="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-zinc-400">Start date</label>
                                                    <DateInput
                                                        value={editing.startDate}
                                                        onChange={(next) => setEditing({ ...editing, startDate: next })}
                                                        inputClassName="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-zinc-400">Estimate (mins)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="1440"
                                                        value={editing.estimatedMinutes}
                                                        onChange={(e) => setEditing({ ...editing, estimatedMinutes: e.target.value })}
                                                        placeholder="30"
                                                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                                    />
                                                </div>

                                                <div className="md:col-span-3">
                                                    <label className="text-xs text-zinc-400">Repeat</label>
                                                    <div className="relative mt-1">
                                                        <select
                                                            value={editing.recurrence}
                                                            onChange={(e) => setEditing({ ...editing, recurrence: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' })}
                                                            className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                                        >
                                                            <option value="none">None</option>
                                                            <option value="daily">Daily</option>
                                                            <option value="weekly">Weekly</option>
                                                            <option value="monthly">Monthly</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                                            ▾
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-zinc-400">Category</label>
                                                <div className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap rounded-xl bg-zinc-950/40 p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditing({ ...editing, category: '' })}
                                                        className={`rounded-full border px-3 py-1 text-xs transition ${editing.category.trim().length === 0
                                                            ? 'border-zinc-600 bg-zinc-800 text-zinc-50 ring-1 ring-zinc-600'
                                                            : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
                                                            }`}
                                                    >
                                                        None
                                                    </button>
                                                    {(() => {
                                                        const current = editing.category.trim()
                                                        const lower = current.toLowerCase()
                                                        const hasCustom =
                                                            current.length > 0 &&
                                                            !DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === lower)
                                                        return hasCustom ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditing({ ...editing, category: current })}
                                                                className={tagClass(current, true)}
                                                            >
                                                                {current}
                                                            </button>
                                                        ) : null
                                                    })()}
                                                    {DEFAULT_CATEGORIES.map((c) => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => setEditing({ ...editing, category: c })}
                                                            className={tagClass(c, editing.category.trim().toLowerCase() === c.toLowerCase())}
                                                        >
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-zinc-400">Labels</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {editing.labels.map((lab) => (
                                                        <button
                                                            key={lab}
                                                            type="button"
                                                            onClick={() =>
                                                                setEditing({
                                                                    ...editing,
                                                                    labels: removeLabel(editing.labels, lab),
                                                                })
                                                            }
                                                            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                                        >
                                                            {lab} ×
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    value={editLabelInput}
                                                    onChange={(e) => setEditLabelInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            const next = addLabel(editing.labels, editLabelInput)
                                                            setEditing({ ...editing, labels: next })
                                                            setEditLabelInput('')
                                                        }
                                                    }}
                                                    placeholder="Type a label and press Enter…"
                                                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing(null)}
                                                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={loading || editing.title.trim().length === 0}
                                                    onClick={() => void saveEdit()}
                                                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-60"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-4">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    void toggleComplete(t)
                                                }}
                                                className={`mt-0.5 h-6 w-6 shrink-0 rounded border ${isCompletedOn(t, dateMode === 'custom' ? customDate : today) ? 'border-emerald-400 bg-emerald-400/20' : 'border-zinc-600 bg-transparent'} transition-transform duration-150 ease-out hover:scale-105 active:scale-95`}
                                                aria-label="Toggle complete"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void openDetails(t)
                                                }}
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div
                                                        className={`min-w-0 truncate text-sm font-medium ${isCompletedOn(t, dateMode === 'custom' ? customDate : today) ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}
                                                    >
                                                        {t.title}
                                                    </div>

                                                    <span className={`rounded-md border px-2 py-0.5 text-xs ${statusBadge(t.status)}`}>
                                                        {t.status}
                                                    </span>

                                                    <span className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                        <span className={`h-2 w-2 rounded-full ${priorityDot(t.priority)}`} />
                                                        {priorityLabel(t.priority)}
                                                    </span>

                                                    {t.due_date ? (
                                                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                            Due {t.due_date}
                                                        </span>
                                                    ) : null}

                                                    {t.category ? (
                                                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                            {t.category}
                                                        </span>
                                                    ) : null}

                                                    {t.estimated_minutes != null ? (
                                                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                            {fmtEstimate(t.estimated_minutes)}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {t.labels && t.labels.length > 0 ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {t.labels.slice(0, 4).map((lab) => (
                                                            <span
                                                                key={lab}
                                                                className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                                                            >
                                                                {lab}
                                                            </span>
                                                        ))}
                                                        {t.labels.length > 4 ? (
                                                            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">
                                                                +{t.labels.length - 4}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}

                                                {t.description ? (
                                                    <div className="mt-2 line-clamp-2 text-sm text-zinc-400">{t.description}</div>
                                                ) : null}
                                            </button>

                                            <div className="hidden shrink-0 items-center gap-2 group-hover:flex">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void startEditById(t.id)
                                                    }}
                                                    aria-label="Edit"
                                                    className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 transition-all duration-150 ease-out hover:scale-105 hover:bg-zinc-900 active:scale-95"
                                                >
                                                    <IconPencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void markDone(t)
                                                    }}
                                                    aria-label="Mark as done"
                                                    className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-100 transition-all duration-150 ease-out hover:scale-105 hover:bg-emerald-600/15 active:scale-95"
                                                >
                                                    <IconCheck className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void remove(t)
                                                    }}
                                                    aria-label="Delete"
                                                    className="grid h-10 w-10 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 transition-all duration-150 ease-out hover:scale-105 hover:bg-rose-500/15 active:scale-95"
                                                >
                                                    <IconTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {!loading && filtered.length === 0 ? (
                                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                                    No tasks match this view.
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </section>

                <aside className="min-h-0 overflow-y-auto lg:col-span-3">
                    <div className="space-y-3">
                        <div>
                            <div className="mb-2 text-xs font-medium text-zinc-400">Upcoming Deadlines</div>
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-2">
                                {upcomingPanel.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                                        No upcoming tasks.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {upcomingPanel.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    void openDetails(t)
                                                }}
                                                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${selectedId === t.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 truncate">{t.title}</div>
                                                    <div className="shrink-0 text-xs text-zinc-500">{t.due_date ? formatCountdown(t.due_date, nowMs) : ''}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 text-xs font-medium text-zinc-400">Completed Tasks</div>
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-2">
                                {completedPanel.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                                        No completed tasks.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {completedPanel.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    void openDetails(t)
                                                }}
                                                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${selectedId === t.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 truncate">{t.title}</div>
                                                    <div className="shrink-0 text-xs text-zinc-500">{isCompletedOn(t, today) ? 'Done' : ''}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <Modal open={addOpen} title="Add task" onClose={() => {
                setAddOpen(false)
                setAddTitle('')
                setAddCategory('')
                setAddLabels([])
                setAddLabelInput('')
                setAddStartDate('')
                setAddEstimatedMinutes('')
                setAddDueDate('')
                setAddPriority(2)
                setAddAssignee('Self')
                setAddRecurrence('none')
                setAddDescription('')
            }} maxWidthClassName="w-[min(720px,calc(100%-2rem))]">
                <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-12">
                        <div className="md:col-span-6">
                            <label className="text-xs text-zinc-400">Title</label>
                            <input
                                value={addTitle}
                                onChange={(e) => setAddTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void quickAdd()
                                }}
                                placeholder="New task…"
                                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-400">Priority</label>
                            <div className="relative mt-1">
                                <select
                                    value={addPriority}
                                    onChange={(e) => setAddPriority(Number(e.target.value) as 1 | 2 | 3)}
                                    className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                >
                                    <option value={1}>Low</option>
                                    <option value={2}>Medium</option>
                                    <option value={3}>High</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                    ▾
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-400">Assigned</label>
                            <div className="relative mt-1">
                                <select
                                    value={addAssignee}
                                    onChange={(e) => setAddAssignee(e.target.value as (typeof ASSIGNEE_OPTIONS)[number])}
                                    className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                >
                                    {ASSIGNEE_OPTIONS.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                    ▾
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400">Description</label>
                        <textarea
                            value={addDescription}
                            onChange={(e) => setAddDescription(e.target.value)}
                            rows={3}
                            className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                    </div>

                    <div>
                        <div className="grid gap-2 md:grid-cols-12">
                            <div className="md:col-span-3">
                                <label className="text-xs text-zinc-400">Due date</label>
                                <DateInput
                                    value={addDueDate}
                                    onChange={setAddDueDate}
                                    inputClassName="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-xs text-zinc-400">Start date</label>
                                <DateInput
                                    value={addStartDate}
                                    onChange={setAddStartDate}
                                    inputClassName="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-xs text-zinc-400">Estimate (mins)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1440"
                                    value={addEstimatedMinutes}
                                    onChange={(e) => setAddEstimatedMinutes(e.target.value)}
                                    placeholder="30"
                                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="text-xs text-zinc-400">Repeat</label>
                                <div className="relative mt-1">
                                    <select
                                        value={addRecurrence}
                                        onChange={(e) => setAddRecurrence(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly')}
                                        className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 pr-10 text-sm outline-none focus:border-zinc-600"
                                    >
                                        <option value="none">None</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                                        ▾
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400">Category</label>
                        <div className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap rounded-xl bg-zinc-950/40 p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <button
                                type="button"
                                onClick={() => setAddCategory('')}
                                className={`rounded-full border px-3 py-1 text-xs transition ${addCategory.trim().length === 0
                                    ? 'border-zinc-600 bg-zinc-800 text-zinc-50 ring-1 ring-zinc-600'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
                                    }`}
                            >
                                None
                            </button>
                            {DEFAULT_CATEGORIES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setAddCategory(c)}
                                    className={tagClass(c, addCategory.trim().toLowerCase() === c.toLowerCase())}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400">Labels</label>
                        <div className="flex flex-wrap gap-2">
                            {addLabels.map((lab) => (
                                <button
                                    key={lab}
                                    type="button"
                                    onClick={() => setAddLabels((prev) => removeLabel(prev, lab))}
                                    className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                >
                                    {lab} ×
                                </button>
                            ))}
                        </div>
                        <input
                            value={addLabelInput}
                            onChange={(e) => setAddLabelInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    setAddLabels((prev) => addLabel(prev, addLabelInput))
                                    setAddLabelInput('')
                                }
                            }}
                            placeholder="Type a label and press Enter…"
                            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setAddOpen(false)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loading || addTitle.trim().length === 0}
                            onClick={() => void quickAdd()}
                            className="rounded-lg border border-emerald-600/40 bg-emerald-600/15 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-600/20 disabled:opacity-60"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal open={detailTask != null} title="Task details" onClose={() => setDetailTask(null)}>
                {detailTask ? (
                    <div className="space-y-3 text-sm">
                        <div className="text-base font-semibold text-zinc-50">{detailTask.title}</div>

                        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                                Created {new Date(detailTask.created_at).toLocaleString()}
                            </span>
                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                                Updated {new Date(detailTask.updated_at).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`rounded-md border px-2 py-0.5 ${statusBadge(detailTask.status)}`}>{detailTask.status}</span>
                            <span className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">
                                <span className={`h-2 w-2 rounded-full ${priorityDot(detailTask.priority)}`} />
                                {priorityLabel(detailTask.priority)}
                            </span>
                            {detailTask.recurrence === 'daily' ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">Repeats daily</span>
                            ) : null}
                            {detailTask.recurrence === 'weekly' ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">Repeats weekly</span>
                            ) : null}
                            {detailTask.recurrence === 'monthly' ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">Repeats monthly</span>
                            ) : null}
                            {detailTask.recurrence === 'daily' ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">
                                    {detailTask.completed_on === today ? 'Done today' : 'Not done today'}
                                </span>
                            ) : null}
                            {detailTask.due_date ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">Due {detailTask.due_date}</span>
                            ) : (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-500">No due date</span>
                            )}
                            {detailTask.start_date ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">Start {detailTask.start_date}</span>
                            ) : null}
                            {detailTask.category ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">{detailTask.category}</span>
                            ) : null}
                            {detailTask.assignee ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">Assigned {detailTask.assignee}</span>
                            ) : null}
                            {detailTask.estimated_minutes != null ? (
                                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300">
                                    {fmtEstimate(detailTask.estimated_minutes)}
                                </span>
                            ) : null}
                        </div>

                        {detailTask.labels && detailTask.labels.length > 0 ? (
                            <div>
                                <div className="text-xs text-zinc-400">Labels</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {detailTask.labels.map((lab) => (
                                        <span
                                            key={lab}
                                            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                                        >
                                            {lab}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div>
                            <div className="text-xs text-zinc-400">Description</div>
                            <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200">
                                {(detailTask.description ?? '').trim().length > 0 ? detailTask.description : 'No description.'}
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    )
}
