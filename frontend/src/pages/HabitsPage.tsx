import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, BookOpen, CheckCircle2, Circle } from 'lucide-react'

import { Modal } from '../components/Modal'
import type { Attendance, DailyLog, Habit, SleepLog } from '../lib/api'
import {
    checkinHabit,
    createHabit,
    deleteHabit,
    listAttendance,
    listDailyLogs,
    listHabits,
    listSleepLogs,
    saveAttendance,
    saveDailyLog,
    saveSleepLog,
    updateDailyLog,
    updateHabit,
    updateSleepLog,
} from '../lib/api'

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="shrink-0 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                {children}
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
        </div>
    )
}

function RangeSlider({
    label,
    value,
    onChange,
    color = 'accent-violet-500',
}: {
    label: string
    value: number
    onChange: (v: number) => void
    color?: string
}) {
    const pct = ((value - 1) / 9) * 100
    const textColor = value >= 8 ? 'text-emerald-400' : value >= 6 ? 'text-blue-400' : value >= 4 ? 'text-yellow-400' : 'text-red-400'
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 text-xs">{label}</span>
                <span className={`font-semibold text-xs tabular-nums ${textColor}`}>{value}<span className="text-zinc-600">/10</span></span>
            </div>
            <div className="relative h-1.5 rounded-full bg-zinc-800">
                <div className="absolute h-full rounded-full bg-violet-500/60 transition-all" style={{ width: `${pct}%` }} />
                <input
                    type="range" min={1} max={10} step={1} value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`absolute inset-0 w-full opacity-0 cursor-pointer h-full ${color}`}
                />
            </div>
        </div>
    )
}

// ─── SECTION A — Habits ───────────────────────────────────────────────────────

const FREQ_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

type HabitFormProps = {
    initialName?: string
    initialFrequency?: string
    submitLabel: string
    onSubmit: (name: string, frequency: string) => Promise<void>
    onCancel: () => void
}

function HabitForm({ initialName = '', initialFrequency = 'daily', submitLabel, onSubmit, onCancel }: HabitFormProps) {
    const [name, setName] = useState(initialName)
    const [frequency, setFrequency] = useState(initialFrequency)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit() {
        if (!name.trim()) return
        setSaving(true)
        setError(null)
        try { await onSubmit(name.trim(), frequency) }
        catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
        finally { setSaving(false) }
    }

    return (
        <div className="grid gap-3">
            <div>
                <label className="text-xs text-zinc-400">Name</label>
                <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
                    autoFocus placeholder="e.g. Morning workout"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>
            <div>
                <label className="text-xs text-zinc-400">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900">Cancel</button>
                <button type="button" onClick={handleSubmit} disabled={!name.trim() || saving} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-50">
                    {saving ? 'Saving…' : submitLabel}
                </button>
            </div>
        </div>
    )
}

function HabitsSection() {
    const [habits, setHabits] = useState<Habit[]>([])
    const [loading, setLoading] = useState(true)
    const [checkingIn, setCheckingIn] = useState<number | null>(null)
    const [adding, setAdding] = useState(false)
    const [editing, setEditing] = useState<Habit | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function reload() {
        setLoading(true)
        try { setHabits(await listHabits()) }
        catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
        finally { setLoading(false) }
    }

    useEffect(() => { void reload() }, [])

    async function handleCheckin(id: number) {
        setCheckingIn(id)
        try {
            const updated = await checkinHabit(id)
            setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)))
        } finally { setCheckingIn(null) }
    }

    const doneCount = habits.filter((h) => h.done_today).length

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <div className="text-xs text-zinc-400">
                        {loading ? '…' : `${doneCount} / ${habits.length} done today`}
                    </div>
                    {habits.length > 0 && (
                        <div className="h-1 w-28 overflow-hidden rounded-full bg-zinc-800">
                            <div className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${habits.length > 0 ? (doneCount / habits.length) * 100 : 0}%` }} />
                        </div>
                    )}
                </div>
                <button type="button" onClick={() => setAdding(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs transition hover:bg-zinc-800">
                    + Add habit
                </button>
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {habits.map((h) => (
                    <div key={h.id}
                        className={`group relative rounded-xl border px-3 py-2.5 transition ${h.done_today ? 'border-emerald-900/60 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900/10'}`}>
                        <div className="flex items-center gap-2.5">
                            <button type="button" onClick={() => void handleCheckin(h.id)} disabled={checkingIn === h.id}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${h.done_today ? 'border-emerald-600 bg-emerald-700 text-white' : 'border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'}`}>
                                {h.done_today ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                            </button>
                            <div className="min-w-0 flex-1">
                                <div className={`truncate text-sm font-medium ${h.done_today ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{h.name}</div>
                                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                    <span>{FREQ_LABELS[h.frequency] ?? h.frequency}</span>
                                    {h.current_streak > 0 && <span className="text-orange-400 font-semibold">{h.current_streak} streak</span>}
                                </div>
                            </div>
                        </div>
                        <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                            <button type="button" onClick={() => setEditing(h)}
                                className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800">Edit</button>
                            <button type="button" onClick={async () => { await deleteHabit(h.id); setHabits((prev) => prev.filter((x) => x.id !== h.id)) }}
                                className="rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:text-red-400 hover:bg-zinc-800">×</button>
                        </div>
                    </div>
                ))}
                {!loading && habits.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
                        No habits yet — add your first one above.
                    </div>
                )}
            </div>

            <Modal open={adding} title="Add habit" onClose={() => setAdding(false)}>
                <HabitForm submitLabel="Add"
                    onSubmit={async (name, freq) => { await createHabit({ name, frequency: freq }); setAdding(false); void reload() }}
                    onCancel={() => setAdding(false)} />
            </Modal>
            <Modal open={editing !== null} title="Edit habit" onClose={() => setEditing(null)}>
                {editing && (
                    <HabitForm initialName={editing.name} initialFrequency={editing.frequency} submitLabel="Save"
                        onSubmit={async (name, freq) => { await updateHabit(editing.id, { name, frequency: freq }); setEditing(null); void reload() }}
                        onCancel={() => setEditing(null)} />
                )}
            </Modal>
        </div>
    )
}

// ─── SECTION B — Daily Check-in ───────────────────────────────────────────────

const DAILY_QUESTIONS = [
    { key: 'mood',                 label: 'Overall mood' },
    { key: 'energy',               label: 'Energy level' },
    { key: 'focus',                label: 'Focus & clarity' },
    { key: 'productivity',         label: 'Productivity' },
    { key: 'discipline',           label: 'Discipline & routine' },
    { key: 'spending_control',     label: 'Spending control' },
    { key: 'financial_mindfulness',label: 'Financial mindfulness' },
    { key: 'day_satisfaction',     label: 'Day satisfaction' },
] as const

type MetricKey = typeof DAILY_QUESTIONS[number]['key']

function DailyLogSection() {
    const todayStr = new Date().toISOString().split('T')[0]
    const [existing, setExisting] = useState<DailyLog | null>(null)
    const initMetrics = (): Record<MetricKey, number> => ({
        mood: 5, energy: 5, focus: 5, productivity: 5,
        discipline: 5, spending_control: 5, financial_mindfulness: 5, day_satisfaction: 5,
    })
    const [metrics, setMetrics] = useState<Record<MetricKey, number>>(initMetrics)
    const [reflection, setReflection] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        listDailyLogs(7).then((logs) => {
            const todays = logs.find((l) => l.log_date === todayStr)
            if (todays) {
                setExisting(todays)
                setMetrics({
                    mood: todays.mood ?? 5,
                    energy: todays.energy ?? 5,
                    focus: todays.focus ?? 5,
                    productivity: todays.productivity ?? 5,
                    discipline: todays.discipline ?? 5,
                    spending_control: todays.spending_control ?? 5,
                    financial_mindfulness: todays.financial_mindfulness ?? 5,
                    day_satisfaction: todays.day_satisfaction ?? 5,
                })
                setReflection(todays.reflection ?? '')
            }
        }).catch(() => {})
    }, [todayStr])

    const avgScore = parseFloat((Object.values(metrics).reduce((a, b) => a + b, 0) / 8).toFixed(1))
    const scoreColor = avgScore >= 7.5 ? 'text-emerald-400' : avgScore >= 5 ? 'text-blue-400' : avgScore >= 3 ? 'text-yellow-400' : 'text-red-400'

    function setMetric(key: MetricKey, v: number) {
        setMetrics(prev => ({ ...prev, [key]: v }))
    }

    async function handleSave() {
        setSaving(true); setError(null)
        try {
            let result: DailyLog
            if (existing) {
                result = await updateDailyLog(existing.id, { ...metrics, reflection: reflection.trim() || null })
            } else {
                result = await saveDailyLog({ log_date: todayStr, ...metrics, reflection: reflection.trim() || null })
            }
            setExisting(result)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed')
        } finally { setSaving(false) }
    }

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Today's Check-in</div>
                <div className={`text-lg font-bold tabular-nums ${scoreColor}`}>{avgScore}<span className="text-xs font-normal text-zinc-600">/10</span></div>
            </div>

            <div className="space-y-2.5">
                {DAILY_QUESTIONS.map(({ key, label }) => (
                    <RangeSlider key={key} label={label} value={metrics[key]} onChange={(v) => setMetric(key, v)} />
                ))}
            </div>

            <textarea
                value={reflection} onChange={(e) => setReflection(e.target.value)}
                placeholder="Quick reflection…"
                rows={2}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600 placeholder:text-zinc-700"
            />

            {error && <div className="text-xs text-red-400">{error}</div>}
            <button type="button" onClick={handleSave} disabled={saving}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-50">
                {saving ? 'Saving…' : saved ? '✓ Saved' : existing ? 'Update check-in' : 'Save check-in'}
            </button>
        </div>
    )
}

// ─── SECTION C — Sleep ────────────────────────────────────────────────────────

const QUALITY_LABELS: Record<number, string> = { 1: 'Terrible', 2: 'Poor', 3: 'Okay', 4: 'Fine', 5: 'Good', 6: 'Good', 7: 'Great', 8: 'Great', 9: 'Excellent', 10: 'Perfect' }
const SLEEP_TARGET = 7

function SleepSection() {
    const todayStr = new Date().toISOString().split('T')[0]
    const [existing, setExisting] = useState<SleepLog | null>(null)
    const [hours, setHours] = useState('')
    const [quality, setQuality] = useState(6)
    const [wakeTime, setWakeTime] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        listSleepLogs(3).then((logs) => {
            const todays = logs.find((l) => l.sleep_date === todayStr)
            if (todays) {
                setExisting(todays)
                setHours(todays.hours_slept?.toString() ?? '')
                setQuality(todays.quality ?? 6)
                setWakeTime(todays.wake_time ?? '')
            }
        }).catch(() => {})
    }, [todayStr])

    const parsedHours = parseFloat(hours)
    const validHours = !isNaN(parsedHours) && parsedHours >= 0 && parsedHours <= 24
    const debt = validHours ? SLEEP_TARGET - parsedHours : null
    const debtLabel = debt === null ? null : debt <= 0 ? `+${Math.abs(debt).toFixed(1)}h` : `-${debt.toFixed(1)}h`
    const debtColor = debt === null ? '' : debt <= 0 ? 'text-emerald-400' : 'text-orange-400'

    async function handleSave() {
        setSaving(true); setError(null)
        try {
            const payload = { hours_slept: validHours ? parsedHours : null, quality, wake_time: wakeTime || null, notes: null }
            let result: SleepLog
            if (existing) { result = await updateSleepLog(existing.id, payload) }
            else { result = await saveSleepLog({ sleep_date: todayStr, ...payload }) }
            setExisting(result)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
        finally { setSaving(false) }
    }

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Last Night's Sleep</div>
                {debtLabel && <div className={`text-sm font-semibold ${debtColor}`}>{debtLabel}</div>}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-zinc-400">Hours</label>
                    <input type="number" min={0} max={24} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)}
                        placeholder="7.5"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-zinc-600" />
                </div>
                <div>
                    <label className="text-xs text-zinc-400">Wake time</label>
                    <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-zinc-600" />
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Quality</span>
                    <span className="text-zinc-300 font-semibold">{quality}/10 · {QUALITY_LABELS[quality]}</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-zinc-800">
                    <div className="absolute h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${((quality - 1) / 9) * 100}%` }} />
                    <input type="range" min={1} max={10} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                </div>
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}
            <button type="button" onClick={handleSave} disabled={saving}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-sm transition hover:bg-zinc-800 disabled:opacity-50">
                {saving ? 'Saving…' : saved ? '✓ Saved' : existing ? 'Update sleep' : 'Save sleep'}
            </button>
        </div>
    )
}

// ─── SECTION D — Attendance ───────────────────────────────────────────────────

function AttendanceSection() {
    const todayStr = new Date().toISOString().split('T')[0]
    const [existing, setExisting] = useState<Attendance | null>(null)
    const [status, setStatus] = useState<'present' | 'absent' | null>(null)
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [monthPct, setMonthPct] = useState<number | null>(null)
    const [streak, setStreak] = useState<number>(0)

    function computeStats(logs: Attendance[]) {
        const now = new Date()
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const thisMonth = logs.filter((l) => l.attend_date.startsWith(monthStr))
        const presentDays = thisMonth.filter((l) => l.status === 'present').length
        setMonthPct(now.getDate() > 0 ? Math.round((presentDays / now.getDate()) * 100) : null)

        const sorted = [...logs].sort((a, b) => b.attend_date.localeCompare(a.attend_date))
        let s = 0
        const cursor = new Date(now)
        cursor.setHours(0, 0, 0, 0)
        const todayLog = sorted.find((l) => l.attend_date === todayStr)
        if (!todayLog || todayLog.status !== 'present') cursor.setDate(cursor.getDate() - 1)
        for (let i = 0; i < 365; i++) {
            const ds = cursor.toISOString().split('T')[0]
            const entry = sorted.find((l) => l.attend_date === ds)
            if (entry?.status === 'present') { s++; cursor.setDate(cursor.getDate() - 1) }
            else break
        }
        setStreak(s)
    }

    useEffect(() => {
        listAttendance(60).then((logs) => {
            const todays = logs.find((l) => l.attend_date === todayStr)
            if (todays) { setExisting(todays); setStatus(todays.status as 'present' | 'absent'); setReason(todays.reason ?? '') }
            computeStats(logs)
        }).catch(() => {})
    }, [todayStr]) // eslint-disable-line react-hooks/exhaustive-deps

    async function mark(s: 'present' | 'absent') {
        setStatus(s); setSaving(true); setError(null)
        try {
            const result = await saveAttendance({ attend_date: todayStr, status: s, reason: reason.trim() || null })
            setExisting(result)
            listAttendance(60).then(computeStats).catch(() => {})
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
        finally { setSaving(false) }
    }

    async function saveReason() {
        if (!existing) return
        setSaving(true)
        try {
            const result = await saveAttendance({ attend_date: todayStr, status: existing.status as 'present' | 'absent', reason: reason.trim() || null })
            setExisting(result)
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
        finally { setSaving(false) }
    }

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm font-medium text-zinc-200">Attendance</div>
                <div className="flex gap-3 text-xs text-zinc-400">
                    {monthPct !== null && (
                        <span>Month: <span className={`font-semibold ${monthPct >= 80 ? 'text-emerald-400' : monthPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{monthPct}%</span></span>
                    )}
                    {streak > 0 && <span>Streak: <span className="font-semibold text-emerald-400">{streak}d</span></span>}
                </div>
            </div>

            <div className="flex gap-2">
                <button type="button" onClick={() => void mark('present')} disabled={saving}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${status === 'present' ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-emerald-700 hover:text-emerald-400'}`}>
                    Present
                </button>
                <button type="button" onClick={() => void mark('absent')} disabled={saving}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${status === 'absent' ? 'border-red-700 bg-red-950/40 text-red-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-red-800 hover:text-red-400'}`}>
                    Absent
                </button>
            </div>

            {status === 'absent' && (
                <input value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => void saveReason()}
                    placeholder="Reason (optional)…"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-zinc-600" />
            )}
            {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
    )
}

// ─── SECTION E — Quick links ──────────────────────────────────────────────────

function QuickLinks({ inline }: { inline?: boolean }) {
    if (inline) {
        return (
            <div className="hidden sm:flex items-center gap-2">
                <Link to="/calendar"
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition">
                    <Calendar size={12} className="text-violet-400" /> Life Calendar
                </Link>
                <Link to="/reflection"
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition">
                    <BookOpen size={12} className="text-blue-400" /> Reflection
                </Link>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-2 gap-3">
            <Link to="/calendar"
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 hover:border-zinc-600 hover:bg-zinc-800/30 transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
                    <Calendar size={15} className="text-violet-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-zinc-200">Life Calendar</p>
                    <p className="text-xs text-zinc-500">View your year</p>
                </div>
            </Link>
            <Link to="/reflection"
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 hover:border-zinc-600 hover:bg-zinc-800/30 transition">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                    <BookOpen size={15} className="text-blue-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-zinc-200">Weekly Reflection</p>
                    <p className="text-xs text-zinc-500">Review this week</p>
                </div>
            </Link>
        </div>
    )
}

// ─── Main canvas page ─────────────────────────────────────────────────────────

export function HabitsPage() {
    const dateLabel = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Daily Canvas</h1>
                    <div className="text-sm text-zinc-500">{dateLabel}</div>
                </div>
                <QuickLinks inline />
            </div>

            {/* Habits — full width */}
            <section className="space-y-3">
                <SectionTitle>Habits</SectionTitle>
                <HabitsSection />
            </section>

            {/* Wellness split: check-in (2/3) + sleep+attendance (1/3) */}
            <section>
                <SectionTitle>Wellness Check-in</SectionTitle>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <DailyLogSection />
                    </div>
                    <div className="space-y-4">
                        <SleepSection />
                        <AttendanceSection />
                    </div>
                </div>
            </section>
        </div>
    )
}
