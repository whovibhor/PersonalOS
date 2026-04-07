import { useEffect, useRef, useState } from 'react'

import { Modal } from '../components/Modal'
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
import type { Attendance, DailyLog, Habit, SleepLog } from '../lib/api'

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
    sublabels,
}: {
    label: string
    value: number
    onChange: (v: number) => void
    sublabels: Record<number, string>
}) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <span className="font-semibold text-zinc-200">
                    {value}/5 · {sublabels[value]}
                </span>
            </div>
            <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-violet-500"
            />
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
                    autoFocus
                    placeholder="e.g. Morning workout"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>
            <div>
                <label className="text-xs text-zinc-400">Frequency</label>
                <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                >
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <div className="text-sm text-zinc-400">
                        {loading ? '…' : `${doneCount} / ${habits.length} done today`}
                    </div>
                    {habits.length > 0 && (
                        <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${habits.length > 0 ? (doneCount / habits.length) * 100 : 0}%` }}
                            />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs transition hover:bg-zinc-800"
                >
                    + Add habit
                </button>
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {habits.map((h) => (
                    <div
                        key={h.id}
                        className={`group relative rounded-2xl border p-4 transition ${
                            h.done_today ? 'border-emerald-900/60 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900/10'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => void handleCheckin(h.id)}
                                disabled={checkingIn === h.id}
                                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm transition disabled:opacity-40 ${
                                    h.done_today
                                        ? 'border-emerald-600 bg-emerald-700 text-white'
                                        : 'border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
                                }`}
                            >
                                {h.done_today ? '✓' : '○'}
                            </button>
                            <div className="min-w-0 flex-1">
                                <div className={`truncate text-sm font-medium ${h.done_today ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                                    {h.name}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                                    <span>{FREQ_LABELS[h.frequency] ?? h.frequency}</span>
                                    {h.current_streak > 0 && (
                                        <span className="text-orange-400 font-semibold">🔥 {h.current_streak}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* edit / delete appear on hover */}
                        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                            <button
                                type="button"
                                onClick={() => setEditing(h)}
                                className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await deleteHabit(h.id)
                                    setHabits((prev) => prev.filter((x) => x.id !== h.id))
                                }}
                                className="rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:text-red-400 hover:bg-zinc-800"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}

                {!loading && habits.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
                        No habits yet — add your first one above.
                    </div>
                )}
            </div>

            <Modal open={adding} title="Add habit" onClose={() => setAdding(false)}>
                <HabitForm
                    submitLabel="Add"
                    onSubmit={async (name, freq) => { await createHabit({ name, frequency: freq }); setAdding(false); void reload() }}
                    onCancel={() => setAdding(false)}
                />
            </Modal>
            <Modal open={editing !== null} title="Edit habit" onClose={() => setEditing(null)}>
                {editing && (
                    <HabitForm
                        initialName={editing.name}
                        initialFrequency={editing.frequency}
                        submitLabel="Save"
                        onSubmit={async (name, freq) => { await updateHabit(editing.id, { name, frequency: freq }); setEditing(null); void reload() }}
                        onCancel={() => setEditing(null)}
                    />
                )}
            </Modal>
        </div>
    )
}

// ─── SECTION B — Daily Log ────────────────────────────────────────────────────

const MOOD_LABELS: Record<number, string> = { 1: 'Terrible', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' }
const ENERGY_LABELS: Record<number, string> = { 1: 'Drained', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Peak' }
const FOCUS_LABELS: Record<number, string> = { 1: 'Scattered', 2: 'Poor', 3: 'Okay', 4: 'Sharp', 5: 'Deep' }

function DailyLogSection() {
    const todayStr = new Date().toISOString().split('T')[0]
    const [existing, setExisting] = useState<DailyLog | null>(null)
    const [mood, setMood] = useState(3)
    const [energy, setEnergy] = useState(3)
    const [focus, setFocus] = useState(3)
    const [reflection, setReflection] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        listDailyLogs(7).then((logs) => {
            const todays = logs.find((l) => l.log_date === todayStr)
            if (todays) {
                setExisting(todays)
                setMood(todays.mood ?? 3)
                setEnergy(todays.energy ?? 3)
                setFocus(todays.focus ?? 3)
                setReflection(todays.reflection ?? '')
            }
        }).catch(() => {})
    }, [todayStr])

    const previewScore = parseFloat(((mood + energy + focus) / 3).toFixed(1))
    const scoreColor = previewScore >= 4 ? 'text-emerald-400' : previewScore >= 3 ? 'text-yellow-400' : 'text-red-400'

    async function handleSave() {
        setSaving(true)
        setError(null)
        try {
            let result: DailyLog
            if (existing) {
                result = await updateDailyLog(existing.id, { mood, energy, focus, reflection: reflection.trim() || null })
            } else {
                result = await saveDailyLog({ log_date: todayStr, mood, energy, focus, reflection: reflection.trim() || null })
            }
            setExisting(result)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Today's Check-in</div>
                <div className={`text-2xl font-bold ${scoreColor}`}>{previewScore}</div>
            </div>

            <RangeSlider label="Mood" value={mood} onChange={setMood} sublabels={MOOD_LABELS} />
            <RangeSlider label="Energy" value={energy} onChange={setEnergy} sublabels={ENERGY_LABELS} />
            <RangeSlider label="Focus" value={focus} onChange={setFocus} sublabels={FOCUS_LABELS} />

            <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Quick reflection… what's on your mind?"
                rows={2}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600 placeholder:text-zinc-700"
            />

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-50"
            >
                {saving ? 'Saving…' : saved ? '✓ Saved' : existing ? 'Update log' : 'Save log'}
            </button>
        </div>
    )
}

// ─── SECTION C — Sleep ────────────────────────────────────────────────────────

const QUALITY_LABELS: Record<number, string> = { 1: 'Terrible', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Great' }
const SLEEP_TARGET = 7

function SleepSection() {
    const todayStr = new Date().toISOString().split('T')[0]
    const [existing, setExisting] = useState<SleepLog | null>(null)
    const [hours, setHours] = useState('')
    const [quality, setQuality] = useState(3)
    const [wakeTime, setWakeTime] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        listSleepLogs(3).then((logs) => {
            const todays = logs.find((l) => l.sleep_date === todayStr)
            if (todays) {
                setExisting(todays)
                setHours(todays.hours_slept?.toString() ?? '')
                setQuality(todays.quality ?? 3)
                setWakeTime(todays.wake_time ?? '')
                setNotes(todays.notes ?? '')
            }
        }).catch(() => {})
    }, [todayStr])

    const parsedHours = parseFloat(hours)
    const validHours = !isNaN(parsedHours) && parsedHours >= 0 && parsedHours <= 24
    const debt = validHours ? SLEEP_TARGET - parsedHours : null
    const debtLabel = debt === null ? null : debt <= 0 ? `+${Math.abs(debt).toFixed(1)}h surplus` : `-${debt.toFixed(1)}h debt`
    const debtColor = debt === null ? '' : debt <= 0 ? 'text-emerald-400' : 'text-orange-400'

    async function handleSave() {
        setSaving(true)
        setError(null)
        try {
            const payload = {
                hours_slept: validHours ? parsedHours : null,
                quality,
                wake_time: wakeTime || null,
                notes: notes.trim() || null,
            }
            let result: SleepLog
            if (existing) {
                result = await updateSleepLog(existing.id, payload)
            } else {
                result = await saveSleepLog({ sleep_date: todayStr, ...payload })
            }
            setExisting(result)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Last Night's Sleep</div>
                {debtLabel && <div className={`text-sm font-semibold ${debtColor}`}>{debtLabel}</div>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-zinc-400">Hours slept</label>
                    <input
                        type="number" min={0} max={24} step={0.5}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="7.5"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>
                <div>
                    <label className="text-xs text-zinc-400">Wake time</label>
                    <input
                        type="time"
                        value={wakeTime}
                        onChange={(e) => setWakeTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>
            </div>

            <RangeSlider label="Sleep quality" value={quality} onChange={setQuality} sublabels={QUALITY_LABELS} />

            <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes… woke up twice, felt groggy…"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600 placeholder:text-zinc-700"
            />

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-50"
            >
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

    useEffect(() => {
        listAttendance(3).then((logs) => {
            const todays = logs.find((l) => l.attend_date === todayStr)
            if (todays) {
                setExisting(todays)
                setStatus(todays.status as 'present' | 'absent')
                setReason(todays.reason ?? '')
            }
        }).catch(() => {})
    }, [todayStr])

    async function mark(s: 'present' | 'absent') {
        setStatus(s)
        setSaving(true)
        setError(null)
        try {
            const result = await saveAttendance({
                attend_date: todayStr,
                status: s,
                reason: reason.trim() || null,
            })
            setExisting(result)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed')
        } finally {
            setSaving(false)
        }
    }

    async function saveReason() {
        if (!existing) return
        setSaving(true)
        try {
            const result = await saveAttendance({
                attend_date: todayStr,
                status: existing.status as 'present' | 'absent',
                reason: reason.trim() || null,
            })
            setExisting(result)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
            <div className="text-sm font-medium text-zinc-200">Attendance</div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => void mark('present')}
                    disabled={saving}
                    className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition ${
                        status === 'present'
                            ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-emerald-700 hover:text-emerald-400'
                    }`}
                >
                    ✓ Present
                </button>
                <button
                    type="button"
                    onClick={() => void mark('absent')}
                    disabled={saving}
                    className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition ${
                        status === 'absent'
                            ? 'border-red-700 bg-red-950/40 text-red-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-red-800 hover:text-red-400'
                    }`}
                >
                    ✗ Absent
                </button>
            </div>

            {status === 'absent' && (
                <div className="flex gap-2">
                    <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        onBlur={() => void saveReason()}
                        placeholder="Reason (optional)…"
                        className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>
            )}

            {error && <div className="text-xs text-red-400">{error}</div>}

            {status && (
                <div className={`text-xs ${status === 'present' ? 'text-emerald-500' : 'text-red-500'}`}>
                    Marked {status} for today.
                </div>
            )}
        </div>
    )
}

// ─── Main canvas page ─────────────────────────────────────────────────────────

export function HabitsPage() {
    const dateLabel = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
    })

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-zinc-100">Daily Canvas</h1>
                <div className="mt-0.5 text-sm text-zinc-500">{dateLabel}</div>
            </div>

            {/* ── Habits grid ─────────────────────────────────────────── */}
            <section className="space-y-4">
                <SectionTitle>Habits</SectionTitle>
                <HabitsSection />
            </section>

            {/* ── Daily log + Sleep side by side ───────────────────────── */}
            <section className="space-y-4">
                <SectionTitle>Wellness Check-in</SectionTitle>
                <div className="grid gap-4 md:grid-cols-2">
                    <DailyLogSection />
                    <SleepSection />
                </div>
            </section>

            {/* ── Attendance ───────────────────────────────────────────── */}
            <section className="space-y-4">
                <SectionTitle>Attendance</SectionTitle>
                <AttendanceSection />
            </section>
        </div>
    )
}
