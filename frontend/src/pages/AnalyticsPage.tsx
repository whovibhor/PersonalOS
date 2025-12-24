import { useEffect, useMemo, useState } from 'react'
import { listTasks, type Task } from '../lib/api'

function parseDateOnly(s: string | null | undefined) {
    if (!s) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
    const d = new Date(`${s}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

function addDays(d: Date, days: number) {
    const x = new Date(d)
    x.setDate(x.getDate() + days)
    return x
}

function Card({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
            <div className="text-xs text-zinc-400">{title}</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-50">{value}</div>
            {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
        </div>
    )
}

export function AnalyticsPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        setLoading(true)
        setError(null)

        listTasks('all')
            .then((t: Task[]) => {
                if (!alive) return
                setTasks(t)
            })
            .catch((e: any) => {
                if (!alive) return
                setError(typeof e?.message === 'string' ? e.message : 'Failed to load tasks')
            })
            .finally(() => {
                if (!alive) return
                setLoading(false)
            })

        return () => {
            alive = false
        }
    }, [])

    const stats = useMemo(() => {
        const today = startOfToday()
        const tomorrow = addDays(today, 1)
        const in7 = addDays(today, 7)

        const total = tasks.length
        const completed = tasks.filter((t) => t.status === 'done').length
        const pending = total - completed

        const overdue = tasks.filter((t) => {
            if (t.status === 'done') return false
            const due = parseDateOnly(t.due_date)
            return due != null && due < today
        }).length

        const dueToday = tasks.filter((t) => {
            if (t.status === 'done') return false
            const due = parseDateOnly(t.due_date)
            return due != null && due >= today && due < tomorrow
        }).length

        const due7d = tasks.filter((t) => {
            if (t.status === 'done') return false
            const due = parseDateOnly(t.due_date)
            return due != null && due >= today && due < in7
        }).length

        const noDue = tasks.filter((t) => !t.due_date).length
        const p1 = tasks.filter((t) => t.priority === 1).length
        const p2 = tasks.filter((t) => t.priority === 2).length
        const p3 = tasks.filter((t) => t.priority === 3).length

        const completedBeforeDue = tasks.filter((t) => {
            if (t.status !== 'done') return false
            const due = parseDateOnly(t.due_date)
            const done = t.completed_at ? new Date(t.completed_at) : null
            if (!due || !done || Number.isNaN(done.getTime())) return false
            return done.getTime() <= addDays(due, 1).getTime()
        }).length

        return { total, completed, pending, overdue, dueToday, due7d, noDue, p1, p2, p3, completedBeforeDue }
    }, [tasks])

    const completionPct = useMemo(() => {
        if (stats.total === 0) return 0
        return Math.round((stats.completed / stats.total) * 100)
    }, [stats.completed, stats.total])

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-lg font-semibold text-zinc-50">Analytics</div>
                    <div className="mt-1 text-sm text-zinc-400">To‑Do only (tasks)</div>
                </div>
                <div className="text-sm text-zinc-500">{loading ? 'Loading…' : `${tasks.length} tasks`}</div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-3">
                    <Card title="Total tasks" value={stats.total} />
                </div>
                <div className="md:col-span-3">
                    <Card title="Completed" value={stats.completed} hint={`${completionPct}%`} />
                </div>
                <div className="md:col-span-3">
                    <Card title="Pending" value={stats.pending} />
                </div>
                <div className="md:col-span-3">
                    <Card title="Overdue" value={stats.overdue} />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                    <Card title="Due today" value={stats.dueToday} />
                </div>
                <div className="md:col-span-4">
                    <Card title="Due in 7 days" value={stats.due7d} hint="Excludes completed" />
                </div>
                <div className="md:col-span-4">
                    <Card title="No due date" value={stats.noDue} />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-8">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="text-xs text-zinc-400">Priority mix</div>
                        <div className="mt-3 space-y-2">
                            {(
                                [
                                    { label: 'P1', value: stats.p1 },
                                    { label: 'P2', value: stats.p2 },
                                    { label: 'P3', value: stats.p3 },
                                ] as const
                            ).map((row) => {
                                const pct = stats.total ? Math.round((row.value / stats.total) * 100) : 0
                                return (
                                    <div key={row.label} className="flex items-center gap-3">
                                        <div className="w-10 text-xs text-zinc-300">{row.label}</div>
                                        <div className="h-2 flex-1 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                                            <div className="h-full bg-zinc-200/20" style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="w-20 text-right text-xs text-zinc-400">
                                            {row.value} ({pct}%)
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
                <div className="md:col-span-4">
                    <Card title="Completed before due" value={stats.completedBeforeDue} hint="Best effort (date-based)" />
                </div>
            </div>
        </div>
    )
}
