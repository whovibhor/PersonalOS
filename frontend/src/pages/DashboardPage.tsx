import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { checkinHabit, getTodayState, updateTask } from '../lib/api'
import type { DashHabitItem, DashTaskItem, TodayState } from '../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function greet() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
    3: { label: 'High', color: 'text-red-400' },
    2: { label: 'Med', color: 'text-yellow-400' },
    1: { label: 'Low', color: 'text-zinc-500' },
}

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const SLEEP_EMOJI = (h: number | null) => (h === null ? '—' : h >= 7 ? '😴' : h >= 5 ? '🥱' : '😵')

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
    label,
    value,
    sub,
    accent,
    to,
}: {
    label: string
    value: string | number
    sub?: string
    accent?: string
    to: string
}) {
    return (
        <Link
            to={to}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 transition hover:border-zinc-700 hover:bg-zinc-900/30"
        >
            <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</div>
            <div className={`mt-2 text-3xl font-bold ${accent ?? 'text-zinc-100'}`}>{value}</div>
            {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
        </Link>
    )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, to }: { title: string; to: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-200">{title}</div>
            <Link to={to} className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                View all →
            </Link>
        </div>
    )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
    task,
    onDone,
}: {
    task: DashTaskItem
    onDone: (id: number) => void
}) {
    const [marking, setMarking] = useState(false)
    const p = PRIORITY_LABEL[task.priority] ?? PRIORITY_LABEL[2]

    async function markDone() {
        setMarking(true)
        try {
            await updateTask(task.id, { completed: true })
            onDone(task.id)
        } finally {
            setMarking(false)
        }
    }

    return (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <button
                type="button"
                onClick={markDone}
                disabled={marking}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-600 transition hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-40"
                title="Mark done"
            >
                {marking ? '…' : '○'}
            </button>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-zinc-100">{task.title}</div>
                <div className="mt-0.5 flex gap-2 text-xs">
                    <span className={p.color}>{p.label}</span>
                    {task.status === 'overdue' && <span className="text-red-400">Overdue</span>}
                    {task.due_date && task.status !== 'overdue' && (
                        <span className="text-zinc-600">Due {task.due_date}</span>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Habit row ────────────────────────────────────────────────────────────────

function HabitRow({
    habit,
    onToggle,
}: {
    habit: DashHabitItem
    onToggle: (updated: DashHabitItem) => void
}) {
    const [toggling, setToggling] = useState(false)

    async function toggle() {
        setToggling(true)
        try {
            const updated = await checkinHabit(habit.id)
            onToggle({ ...habit, done_today: updated.done_today, current_streak: updated.current_streak })
        } finally {
            setToggling(false)
        }
    }

    return (
        <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                habit.done_today
                    ? 'border-emerald-900/50 bg-emerald-950/20'
                    : 'border-zinc-800 bg-zinc-950'
            }`}
        >
            <button
                type="button"
                onClick={toggle}
                disabled={toggling}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition disabled:opacity-40 ${
                    habit.done_today
                        ? 'border-emerald-600 bg-emerald-700 text-white'
                        : 'border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
                }`}
            >
                {habit.done_today ? '✓' : '○'}
            </button>
            <div className="min-w-0 flex-1">
                <div className={`truncate text-sm ${habit.done_today ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                    {habit.name}
                </div>
            </div>
            {habit.current_streak > 0 && (
                <span className="shrink-0 text-xs font-semibold text-orange-400">🔥 {habit.current_streak}</span>
            )}
        </div>
    )
}

// ─── Bill row ─────────────────────────────────────────────────────────────────

function BillRow({ bill }: { bill: TodayState['bills_due'][0] }) {
    const urgent = bill.days_until <= 1
    const soon = bill.days_until <= 3

    return (
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="min-w-0">
                <div className="truncate text-sm text-zinc-100">{bill.name}</div>
                <div className={`mt-0.5 text-xs ${urgent ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-zinc-500'}`}>
                    {bill.days_until === 0
                        ? 'Due today'
                        : bill.days_until === 1
                        ? 'Due tomorrow'
                        : `Due in ${bill.days_until} days`}
                </div>
            </div>
            <div className="ml-4 shrink-0 text-sm font-semibold text-zinc-200">
                ₹{bill.amount.toLocaleString('en-IN')}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
    const [state, setState] = useState<TodayState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getTodayState()
            .then((s) => { if (!cancelled) { setState(s); setLoading(false) } })
            .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) } })
        return () => { cancelled = true }
    }, [])

    function handleTaskDone(taskId: number) {
        setState((prev) =>
            prev
                ? {
                      ...prev,
                      tasks: prev.tasks.filter((t) => t.id !== taskId),
                      tasks_pending: Math.max(0, prev.tasks_pending - 1),
                  }
                : prev
        )
    }

    function handleHabitToggle(updated: DashHabitItem) {
        setState((prev) => {
            if (!prev) return prev
            const habits = prev.habits.map((h) => (h.id === updated.id ? updated : h))
            const habits_done = habits.filter((h) => h.done_today).length
            return { ...prev, habits, habits_done }
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-sm text-zinc-500">
                Loading your day…
            </div>
        )
    }

    if (error || !state) {
        return (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-300">
                {error ?? 'Failed to load dashboard'}
            </div>
        )
    }

    const habitsColor =
        state.habits_total === 0
            ? 'text-zinc-500'
            : state.habits_done === state.habits_total
            ? 'text-emerald-400'
            : state.habits_done > 0
            ? 'text-yellow-400'
            : 'text-zinc-100'

    const tasksColor = state.tasks_overdue > 0 ? 'text-red-400' : 'text-zinc-100'

    const nwFormatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(state.finance.net_worth)

    return (
        <div className="space-y-8">
            {/* Greeting */}
            <div>
                <div className="text-2xl font-bold text-zinc-100">{greet()}</div>
                <div className="mt-0.5 text-sm text-zinc-500">{today()}</div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                    label="Tasks left"
                    value={state.tasks_pending + state.tasks_overdue}
                    sub={state.tasks_overdue > 0 ? `${state.tasks_overdue} overdue` : 'all on track'}
                    accent={tasksColor}
                    to="/todo"
                />
                <KpiCard
                    label="Habits"
                    value={`${state.habits_done}/${state.habits_total}`}
                    sub="done today"
                    accent={habitsColor}
                    to="/habits"
                />
                <KpiCard
                    label="Net worth"
                    value={nwFormatted}
                    sub={
                        state.finance.budget_used_pct !== null
                            ? `Budget ${state.finance.budget_used_pct}% used`
                            : undefined
                    }
                    to="/expense"
                />
                <KpiCard
                    label="Daily score"
                    value={state.daily_log?.score != null ? state.daily_log.score.toFixed(1) : '—'}
                    sub={state.daily_log ? `Mood ${state.daily_log.mood ?? '?'} · Energy ${state.daily_log.energy ?? '?'} · Focus ${state.daily_log.focus ?? '?'}` : 'Not logged yet'}
                    accent={
                        state.daily_log?.score != null
                            ? state.daily_log.score >= 4
                                ? 'text-emerald-400'
                                : state.daily_log.score >= 3
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            : 'text-zinc-500'
                    }
                    to="/habits"
                />
            </div>

            {/* Main 2-col grid */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* Tasks */}
                <section className="space-y-3">
                    <SectionHeader title="Today's tasks" to="/todo" />
                    {state.tasks.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
                            All clear — no pending tasks 🎉
                        </div>
                    ) : (
                        state.tasks.map((t) => (
                            <TaskRow key={t.id} task={t} onDone={handleTaskDone} />
                        ))
                    )}
                    {state.tasks_pending + state.tasks_overdue > state.tasks.length && (
                        <Link to="/todo" className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition">
                            + {state.tasks_pending + state.tasks_overdue - state.tasks.length} more tasks →
                        </Link>
                    )}
                </section>

                {/* Habits */}
                <section className="space-y-3">
                    <SectionHeader title="Today's habits" to="/habits" />
                    {state.habits.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
                            No habits yet.{' '}
                            <Link to="/habits" className="text-zinc-400 underline">Add one →</Link>
                        </div>
                    ) : (
                        state.habits.map((h) => (
                            <HabitRow key={h.id} habit={h} onToggle={handleHabitToggle} />
                        ))
                    )}
                </section>

                {/* Bills due */}
                <section className="space-y-3">
                    <SectionHeader title="Bills due soon" to="/expense/bills" />
                    {state.bills_due.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
                            No bills due in the next 7 days.
                        </div>
                    ) : (
                        state.bills_due.map((b) => <BillRow key={b.id} bill={b} />)
                    )}
                </section>

                {/* Wellness snapshot */}
                <section className="space-y-3">
                    <div className="text-sm font-semibold text-zinc-200">Wellness snapshot</div>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Daily log */}
                        <Link
                            to="/habits"
                            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                        >
                            <div className="text-xs text-zinc-500 uppercase tracking-wide">Today's mood</div>
                            <div className="mt-2 text-2xl">
                                {state.daily_log?.mood ? MOOD_EMOJI[state.daily_log.mood] : '—'}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                                {state.daily_log
                                    ? `Energy ${state.daily_log.energy ?? '?'} · Focus ${state.daily_log.focus ?? '?'}`
                                    : 'Tap to log'}
                            </div>
                        </Link>

                        {/* Sleep */}
                        <Link
                            to="/habits"
                            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                        >
                            <div className="text-xs text-zinc-500 uppercase tracking-wide">Last sleep</div>
                            <div className="mt-2 text-2xl">
                                {SLEEP_EMOJI(state.last_sleep?.hours_slept ?? null)}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                                {state.last_sleep
                                    ? `${state.last_sleep.hours_slept ?? '?'}h · Quality ${state.last_sleep.quality ?? '?'}/5`
                                    : 'Tap to log'}
                            </div>
                        </Link>
                    </div>

                    {/* Finance row */}
                    <Link
                        to="/expense"
                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-zinc-700"
                    >
                        <div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wide">This month</div>
                            <div className="mt-0.5 text-sm text-zinc-200">
                                Spent{' '}
                                <span className="font-semibold text-zinc-100">
                                    ₹{state.finance.expenses_this_month.toLocaleString('en-IN')}
                                </span>
                                {state.finance.budget_total && (
                                    <span className="text-zinc-500">
                                        {' '}/ ₹{state.finance.budget_total.toLocaleString('en-IN')} budget
                                    </span>
                                )}
                            </div>
                        </div>
                        {state.finance.budget_used_pct !== null && (
                            <div
                                className={`text-sm font-bold ${
                                    state.finance.budget_used_pct >= 90
                                        ? 'text-red-400'
                                        : state.finance.budget_used_pct >= 70
                                        ? 'text-yellow-400'
                                        : 'text-emerald-400'
                                }`}
                            >
                                {state.finance.budget_used_pct}%
                            </div>
                        )}
                    </Link>
                </section>
            </div>
        </div>
    )
}
