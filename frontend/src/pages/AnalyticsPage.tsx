import { useEffect, useMemo, useState } from 'react'
import type { DailyLog, FinCategorySpend, FinDashboard, Habit, SleepLog, Task } from '../lib/api'
import {
    getFinCategorySpend,
    getFinanceDashboard,
    listDailyLogs,
    listHabits,
    listSleepLogs,
    listTasks,
} from '../lib/api'

// ── helpers ───────────────────────────────────────────────────────────────────

function parseDateOnly(s: string | null | undefined) {
    if (!s) return null
    const d = new Date(`${s}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function addDays(d: Date, n: number) {
    const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function money(n: number) {
    return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
function avg(arr: number[]) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function Tile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2.5">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${accent ?? 'text-zinc-100'}`}>{value}</div>
            {sub && <div className="mt-0.5 text-xs text-zinc-600">{sub}</div>}
        </div>
    )
}

// ── Horizontal bar row ────────────────────────────────────────────────────────

function BarRow({ label, value, max, barClass, right }: {
    label: string; value: number; max: number; barClass: string; right?: string
}) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
    return (
        <div className="flex items-center gap-2">
            <div className="w-32 shrink-0 truncate text-xs text-zinc-400">{label}</div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div className={`h-full rounded-full ${barClass} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-16 shrink-0 text-right text-xs text-zinc-500 tabular-nums">{right ?? String(value)}</div>
        </div>
    )
}

// ── Sparkline (mini bars) ─────────────────────────────────────────────────────

function Sparkline({ points, barClass, max: forcedMax, target }: {
    points: number[]; barClass: string; max?: number; target?: number
}) {
    if (points.length === 0) return <div className="flex h-12 text-xs text-zinc-600 items-center justify-center">No data yet</div>
    const max = forcedMax ?? Math.max(...points, 1)
    return (
        <div className="relative flex items-end gap-px h-12">
            {target && (
                <div className="absolute inset-x-0 border-t border-dashed border-zinc-600/50 pointer-events-none"
                    style={{ bottom: `${(target / max) * 48}px` }} />
            )}
            {points.map((v, i) => (
                <div key={i} className={`flex-1 rounded-t-sm transition-all ${v > 0 ? barClass : 'bg-zinc-800/50'}`}
                    style={{ height: `${Math.max(2, Math.round((v / max) * 48))}px` }} />
            ))}
        </div>
    )
}

// ── Metric bar (10-scale) ─────────────────────────────────────────────────────

function MetricBar({ label, value }: { label: string; value: number }) {
    const pct = ((value - 1) / 9) * 100
    const barColor = value >= 8 ? 'bg-emerald-500' : value >= 6 ? 'bg-blue-500' : value >= 4 ? 'bg-yellow-500' : 'bg-red-500'
    const textColor = value >= 8 ? 'text-emerald-400' : value >= 6 ? 'text-blue-400' : value >= 4 ? 'text-yellow-400' : 'text-red-400'
    return (
        <div className="flex items-center gap-2">
            <div className="w-36 shrink-0 truncate text-xs text-zinc-400">{label}</div>
            <div className="h-2 flex-1 rounded-full bg-zinc-800">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`w-10 text-right text-xs font-semibold tabular-nums ${textColor}`}>{value.toFixed(1)}</span>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function TasksSection({ tasks }: { tasks: Task[] }) {
    const today = startOfToday()
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'done').length
    const overdue = tasks.filter(t => {
        if (t.status === 'done') return false
        const due = parseDateOnly(t.due_date)
        return due !== null && due < today
    }).length
    const dueToday = tasks.filter(t => {
        if (t.status === 'done') return false
        const due = parseDateOnly(t.due_date)
        return due !== null && due >= today && due < addDays(today, 1)
    }).length
    const noDue = tasks.filter(t => !t.due_date).length
    const p1 = tasks.filter(t => t.priority === 1).length
    const p2 = tasks.filter(t => t.priority === 2).length
    const p3 = tasks.filter(t => t.priority === 3).length
    const completionPct = total ? Math.round((completed / total) * 100) : 0

    const cats = useMemo(() => {
        const map: Record<string, number> = {}
        tasks.forEach(t => { const k = t.category ?? 'Uncategorized'; map[k] = (map[k] ?? 0) + 1 })
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
    }, [tasks])

    return (
        <div className="space-y-5">
            {/* Overview tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile label="Total tasks" value={total} />
                <Tile label="Completed" value={completed} sub={`${completionPct}% done`} accent={completionPct >= 70 ? 'text-emerald-400' : 'text-zinc-100'} />
                <Tile label="Overdue" value={overdue} accent={overdue > 0 ? 'text-red-400' : 'text-zinc-100'} />
                <Tile label="Due today" value={dueToday} accent={dueToday > 0 ? 'text-amber-400' : 'text-zinc-100'} />
            </div>

            {/* Completion bar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Overall completion</span>
                    <span className="text-xs font-semibold text-zinc-300">{completionPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-zinc-600 pt-1">
                    <span>{completed} done</span>
                    <span>{total - completed} remaining</span>
                    <span>{noDue} no due date</span>
                </div>
            </div>

            {/* Priority breakdown */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-2">
                <div className="text-xs text-zinc-500 mb-2">Priority breakdown</div>
                <BarRow label="High priority (P1)" value={p1} max={total} barClass="bg-red-500/60" right={`${p1} · ${total ? Math.round(p1/total*100) : 0}%`} />
                <BarRow label="Medium priority (P2)" value={p2} max={total} barClass="bg-amber-500/60" right={`${p2} · ${total ? Math.round(p2/total*100) : 0}%`} />
                <BarRow label="Low priority (P3)" value={p3} max={total} barClass="bg-zinc-500/40" right={`${p3} · ${total ? Math.round(p3/total*100) : 0}%`} />
            </div>

            {/* Categories */}
            {cats.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-2">
                    <div className="text-xs text-zinc-500 mb-2">Top categories</div>
                    {cats.map(([cat, count]) => (
                        <BarRow key={cat} label={cat} value={count} max={cats[0][1]} barClass="bg-violet-500/50" right={String(count)} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// WELLNESS SECTION
// ─────────────────────────────────────────────────────────────────────────────

const METRIC_CONFIG = [
    { key: 'mood',                  label: 'Mood' },
    { key: 'energy',                label: 'Energy' },
    { key: 'focus',                 label: 'Focus' },
    { key: 'productivity',          label: 'Productivity' },
    { key: 'discipline',            label: 'Discipline' },
    { key: 'spending_control',      label: 'Spending Control' },
    { key: 'financial_mindfulness', label: 'Financial Mindfulness' },
    { key: 'day_satisfaction',      label: 'Day Satisfaction' },
] as const

type MetricKey = typeof METRIC_CONFIG[number]['key']

function WellnessSection({ logs, sleepLogs, habits }: { logs: DailyLog[]; sleepLogs: SleepLog[]; habits: Habit[] }) {
    const sorted = useMemo(() => [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date)), [logs])
    const last30 = sorted.slice(-30)

    // Per-metric averages
    const metricAvgs = useMemo(() => {
        const result: Record<MetricKey, number> = {} as Record<MetricKey, number>
        for (const { key } of METRIC_CONFIG) {
            const vals = last30.map(l => l[key]).filter((v): v is number => v !== null)
            result[key] = vals.length ? avg(vals) : 0
        }
        return result
    }, [last30])

    // Overall daily score sparkline
    const scorePoints = useMemo(() => last30.map(l => l.score ?? 0), [last30])

    // Sleep sparklines
    const sleepSorted = useMemo(() => [...sleepLogs].sort((a, b) => a.sleep_date.localeCompare(b.sleep_date)).slice(-30), [sleepLogs])
    const sleepHrPoints = useMemo(() => sleepSorted.map(l => l.hours_slept ?? 0), [sleepSorted])
    const sleepQPoints = useMemo(() => sleepSorted.map(l => l.quality ?? 0), [sleepSorted])

    // Averages
    const avgScore = scorePoints.filter(v => v > 0)
    const avgScoreVal = avgScore.length ? avg(avgScore) : 0
    const avgSleepHr = sleepHrPoints.filter(v => v > 0)
    const avgSleepVal = avgSleepHr.length ? avg(avgSleepHr) : 0
    const avgSleepQ = sleepQPoints.filter(v => v > 0)
    const avgSleepQVal = avgSleepQ.length ? avg(avgSleepQ) : 0
    const checkInDays = last30.filter(l => l.score !== null).length

    return (
        <div className="space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile label="Avg daily score" value={avgScoreVal > 0 ? avgScoreVal.toFixed(1) : '—'} sub="out of 10" accent="text-violet-400" />
                <Tile label="Check-ins (30d)" value={checkInDays} sub={`${last30.length > 0 ? Math.round(checkInDays/30*100) : 0}% consistency`} />
                <Tile label="Avg sleep" value={avgSleepVal > 0 ? `${avgSleepVal.toFixed(1)}h` : '—'} sub="target: 7h" accent={avgSleepVal >= 7 ? 'text-emerald-400' : avgSleepVal > 0 ? 'text-amber-400' : 'text-zinc-100'} />
                <Tile label="Sleep quality" value={avgSleepQVal > 0 ? `${avgSleepQVal.toFixed(1)}/10` : '—'} />
            </div>

            {/* Daily score sparkline */}
            {scorePoints.some(v => v > 0) && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-500">Daily score — last 30 check-ins</span>
                        <span className="text-xs text-violet-400 font-semibold">{avgScoreVal.toFixed(1)}/10 avg</span>
                    </div>
                    <Sparkline points={scorePoints} barClass="bg-violet-500/70" max={10} />
                    <div className="mt-1 flex justify-between text-xs text-zinc-700">
                        <span>30 days ago</span><span>Today</span>
                    </div>
                </div>
            )}

            {/* Per-metric averages */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-2.5">
                <div className="text-xs text-zinc-500 mb-3">Average scores (last 30 days) — out of 10</div>
                {METRIC_CONFIG.map(({ key, label }) => (
                    metricAvgs[key] > 0
                        ? <MetricBar key={key} label={label} value={metricAvgs[key]} />
                        : null
                ))}
                {Object.values(metricAvgs).every(v => v === 0) && (
                    <div className="text-xs text-zinc-600 text-center py-2">Start your daily check-in to see trends here.</div>
                )}
            </div>

            {/* Sleep trends */}
            {sleepHrPoints.some(v => v > 0) && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-500">Sleep hours</span>
                            <span className="text-xs text-blue-400 font-semibold">{avgSleepVal.toFixed(1)}h avg</span>
                        </div>
                        <Sparkline points={sleepHrPoints} barClass="bg-blue-500/60" max={10} target={7} />
                        <div className="mt-1 text-xs text-zinc-700">dashed = 7h target</div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-500">Sleep quality</span>
                            <span className="text-xs text-cyan-400 font-semibold">{avgSleepQVal.toFixed(1)}/10</span>
                        </div>
                        <Sparkline points={sleepQPoints} barClass="bg-cyan-500/60" max={10} />
                    </div>
                </div>
            )}

            {/* Habits */}
            {habits.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-2.5">
                    <div className="text-xs text-zinc-500 mb-2">Habit performance</div>
                    {habits.slice(0, 8).map(h => (
                        <div key={h.id} className="flex items-center gap-2">
                            <div className="w-32 shrink-0 truncate text-xs text-zinc-300">{h.name}</div>
                            <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                                <div className="h-full rounded-full bg-emerald-500/60 transition-all"
                                    style={{ width: `${Math.min(100, h.current_streak * 3.33)}%` }} />
                            </div>
                            <div className="w-28 shrink-0 text-right text-xs text-zinc-500 tabular-nums">
                                {h.current_streak}d streak · {h.total_done} total
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE SECTION
// ─────────────────────────────────────────────────────────────────────────────

function FinanceSection({ dash, catSpend }: { dash: FinDashboard | null; catSpend: FinCategorySpend[] }) {
    const topCats = useMemo(() => [...catSpend].sort((a, b) => b.total - a.total).slice(0, 6), [catSpend])
    const maxCat = topCats[0]?.total ?? 1

    if (!dash && catSpend.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
                <p className="text-sm text-zinc-600">No finance data yet. Add transactions to see insights here.</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {dash && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Tile label="Total balance" value={money(dash.total_balance)} accent="text-zinc-100" />
                        <Tile label="Month income" value={money(dash.this_month_income)} accent="text-emerald-400" />
                        <Tile label="Month expenses" value={money(dash.this_month_spent)} accent="text-red-400" />
                        <Tile label="Savings rate" value={`${dash.savings_rate}%`} accent={dash.savings_rate >= 20 ? 'text-emerald-400' : dash.savings_rate >= 0 ? 'text-amber-400' : 'text-red-400'} />
                    </div>

                    {/* Income vs Expense visual */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-3">
                        <div className="text-xs text-zinc-500 mb-1">Income vs Expenses — this month</div>
                        <div className="flex items-center gap-2">
                            <span className="w-20 text-xs text-emerald-400">Income</span>
                            <div className="h-2 flex-1 rounded-full bg-zinc-800">
                                <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${Math.min(100, (dash.this_month_income / Math.max(dash.this_month_income, dash.this_month_spent, 1)) * 100)}%` }} />
                            </div>
                            <span className="w-20 text-right text-xs text-zinc-400 tabular-nums">{money(dash.this_month_income)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-20 text-xs text-red-400">Expenses</span>
                            <div className="h-2 flex-1 rounded-full bg-zinc-800">
                                <div className="h-full rounded-full bg-red-500/60" style={{ width: `${Math.min(100, (dash.this_month_spent / Math.max(dash.this_month_income, dash.this_month_spent, 1)) * 100)}%` }} />
                            </div>
                            <span className="w-20 text-right text-xs text-zinc-400 tabular-nums">{money(dash.this_month_spent)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                            <span className="text-xs text-zinc-500">Savings this month</span>
                            <span className={`text-sm font-semibold tabular-nums ${dash.this_month_savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {dash.this_month_savings >= 0 ? '+' : ''}{money(dash.this_month_savings)}
                            </span>
                        </div>
                    </div>

                    {/* Subscriptions cost */}
                    {dash.total_monthly_subs > 0 && (
                        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3">
                            <div>
                                <p className="text-xs text-zinc-500">Monthly subscriptions</p>
                                <p className="text-sm font-semibold text-zinc-300">₹{dash.total_monthly_subs.toFixed(2)}/mo</p>
                            </div>
                            <div className="text-xs text-zinc-600">≈ {money(dash.total_monthly_subs * 12)}/yr</div>
                        </div>
                    )}
                </>
            )}

            {/* Category breakdown */}
            {topCats.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 space-y-2">
                    <div className="text-xs text-zinc-500 mb-2">Spending by category — this month</div>
                    {topCats.map(c => (
                        <div key={c.category_name} className="flex items-center gap-2">
                            <div className="w-28 shrink-0 truncate text-xs text-zinc-400">{c.category_name}</div>
                            <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                                <div className="h-full rounded-full bg-red-500/50 transition-all" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                            </div>
                            <div className="w-8 shrink-0 text-right text-xs text-zinc-600">{c.pct}%</div>
                            <div className="w-20 shrink-0 text-right text-xs text-zinc-400 tabular-nums">{money(c.total)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'tasks' | 'wellness' | 'finance'

export function AnalyticsPage() {
    const [tab, setTab] = useState<Tab>('wellness')
    const [tasks, setTasks] = useState<Task[]>([])
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
    const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([])
    const [habits, setHabits] = useState<Habit[]>([])
    const [finDash, setFinDash] = useState<FinDashboard | null>(null)
    const [catSpend, setCatSpend] = useState<FinCategorySpend[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true); setError(null)
        const now = new Date()
        Promise.all([
            listTasks('all'),
            listDailyLogs(60),
            listSleepLogs(60),
            listHabits(),
            getFinanceDashboard().catch(() => null),
            getFinCategorySpend(now.getFullYear(), now.getMonth() + 1).catch(() => []),
        ])
            .then(([t, dl, sl, h, fd, cs]) => {
                setTasks(t); setDailyLogs(dl); setSleepLogs(sl); setHabits(h)
                setFinDash(fd); setCatSpend(cs)
            })
            .catch(e => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
            .finally(() => setLoading(false))
    }, [])

    const tabs: { id: Tab; label: string }[] = [
        { id: 'wellness', label: 'Wellness' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'finance', label: 'Finance' },
    ]

    return (
        <div className="space-y-5 max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
                    <p className="mt-0.5 text-sm text-zinc-500">Cross-module insights & trends</p>
                </div>
                {loading && <div className="text-xs text-zinc-500">Loading…</div>}
            </div>

            {error && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-300">{error}</div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/20 p-1 w-fit">
                {tabs.map(t => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {!loading && tab === 'wellness' && <WellnessSection logs={dailyLogs} sleepLogs={sleepLogs} habits={habits} />}
            {!loading && tab === 'tasks' && <TasksSection tasks={tasks} />}
            {!loading && tab === 'finance' && <FinanceSection dash={finDash} catSpend={catSpend} />}
        </div>
    )
}
