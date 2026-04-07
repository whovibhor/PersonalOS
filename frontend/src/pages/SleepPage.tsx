import { useEffect, useState } from 'react'

import { listSleepLogs, saveSleepLog, updateSleepLog } from '../lib/api'
import type { SleepLog } from '../lib/api'

// ─── Quality labels ───────────────────────────────────────────────────────────

const QUALITY_LABELS: Record<number, string> = {
    1: 'Terrible',
    2: 'Poor',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
}

const QUALITY_COLORS: Record<number, string> = {
    1: 'text-red-400',
    2: 'text-orange-400',
    3: 'text-yellow-400',
    4: 'text-emerald-400',
    5: 'text-emerald-300',
}

// ─── Sleep debt helper ────────────────────────────────────────────────────────

const SLEEP_TARGET = 7 // hours

function sleepDebtLabel(hours: number | null): { label: string; color: string } {
    if (hours === null) return { label: '—', color: 'text-zinc-500' }
    const debt = SLEEP_TARGET - hours
    if (debt <= 0) return { label: `+${Math.abs(debt).toFixed(1)}h surplus`, color: 'text-emerald-400' }
    return { label: `-${debt.toFixed(1)}h debt`, color: 'text-orange-400' }
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ log }: { log: SleepLog }) {
    const debt = sleepDebtLabel(log.hours_slept)
    return (
        <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 px-4 py-3">
            <div className="w-24 shrink-0">
                <div className="text-sm font-medium text-zinc-200">
                    {new Date(log.sleep_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                    })}
                </div>
                <div className="text-lg font-bold text-zinc-100">
                    {log.hours_slept !== null ? `${log.hours_slept}h` : '—'}
                </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                    {log.quality !== null && (
                        <span className={QUALITY_COLORS[log.quality] ?? 'text-zinc-400'}>
                            {QUALITY_LABELS[log.quality]} ({log.quality}/5)
                        </span>
                    )}
                    {log.wake_time && <span>Wake {log.wake_time}</span>}
                    <span className={debt.color}>{debt.label}</span>
                </div>
                {log.notes && (
                    <div className="text-sm text-zinc-500 line-clamp-1 italic">"{log.notes}"</div>
                )}
            </div>
        </div>
    )
}

// ─── Today form ───────────────────────────────────────────────────────────────

type TodayFormProps = {
    existing: SleepLog | null
    onSaved: (log: SleepLog) => void
}

function TodayForm({ existing, onSaved }: TodayFormProps) {
    const [hours, setHours] = useState<string>(existing?.hours_slept?.toString() ?? '')
    const [quality, setQuality] = useState(existing?.quality ?? 3)
    const [wakeTime, setWakeTime] = useState(existing?.wake_time ?? '')
    const [notes, setNotes] = useState(existing?.notes ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const parsedHours = parseFloat(hours)
    const validHours = !isNaN(parsedHours) && parsedHours >= 0 && parsedHours <= 24
    const debt = sleepDebtLabel(validHours ? parsedHours : null)

    async function handleSave() {
        setSaving(true)
        setError(null)
        try {
            const today = new Date().toISOString().split('T')[0]
            const payload = {
                hours_slept: validHours ? parsedHours : null,
                quality,
                wake_time: wakeTime.trim() || null,
                notes: notes.trim() || null,
            }
            let result: SleepLog
            if (existing) {
                result = await updateSleepLog(existing.id, payload)
            } else {
                result = await saveSleepLog({ sleep_date: today, ...payload })
            }
            onSaved(result)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-5">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-zinc-100">Last Night's Sleep</div>
                {validHours && (
                    <div className={`text-sm font-semibold ${debt.color}`}>{debt.label}</div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-zinc-400">Hours slept</label>
                    <input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="e.g. 7.5"
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

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400">Sleep quality</label>
                    <span className={`text-sm font-semibold ${QUALITY_COLORS[quality] ?? 'text-zinc-400'}`}>
                        {quality}/5 — {QUALITY_LABELS[quality]}
                    </span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-zinc-600">
                    {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
                </div>
            </div>

            <div>
                <label className="text-xs text-zinc-400">Notes (optional)</label>
                <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Woke up twice, felt groggy…"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                    Target: {SLEEP_TARGET}h/night
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : existing ? 'Update' : 'Save'}
                </button>
            </div>
        </div>
    )
}

// ─── 7-day summary ────────────────────────────────────────────────────────────

function WeekSummary({ logs }: { logs: SleepLog[] }) {
    const recent = logs.slice(0, 7)
    if (recent.length === 0) return null

    const hoursArr = recent.map((l) => l.hours_slept ?? 0).filter((h) => h > 0)
    const avgHours = hoursArr.length ? hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length : null
    const qualityArr = recent.map((l) => l.quality ?? 0).filter((q) => q > 0)
    const avgQuality = qualityArr.length ? qualityArr.reduce((a, b) => a + b, 0) / qualityArr.length : null

    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                <div className="text-xs text-zinc-500">Avg sleep (7d)</div>
                <div className={`mt-1 text-2xl font-bold ${avgHours && avgHours >= SLEEP_TARGET ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {avgHours !== null ? `${avgHours.toFixed(1)}h` : '—'}
                </div>
                <div className="text-xs text-zinc-600">target {SLEEP_TARGET}h</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                <div className="text-xs text-zinc-500">Avg quality (7d)</div>
                <div className={`mt-1 text-2xl font-bold ${avgQuality ? (QUALITY_COLORS[Math.round(avgQuality)] ?? 'text-zinc-100') : 'text-zinc-500'}`}>
                    {avgQuality !== null ? `${avgQuality.toFixed(1)}/5` : '—'}
                </div>
                <div className="text-xs text-zinc-600">
                    {avgQuality ? (QUALITY_LABELS[Math.round(avgQuality)] ?? '') : 'no data'}
                </div>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SleepPage() {
    const [logs, setLogs] = useState<SleepLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const todayStr = new Date().toISOString().split('T')[0]
    const todayLog = logs.find((l) => l.sleep_date === todayStr) ?? null
    const historyLogs = logs.filter((l) => l.sleep_date !== todayStr)

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            setLogs(await listSleepLogs(60))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load sleep logs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void reload() }, [])

    function handleSaved(log: SleepLog) {
        setLogs((prev) => {
            const without = prev.filter((l) => l.sleep_date !== log.sleep_date)
            return [log, ...without].sort((a, b) => b.sleep_date.localeCompare(a.sleep_date))
        })
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-lg font-semibold">Sleep Tracker</h1>
                <div className="text-sm text-zinc-500">Log your sleep to track quality and debt</div>
            </div>

            {error && <div className="text-sm text-red-300">{error}</div>}

            {!loading && <TodayForm existing={todayLog} onSaved={handleSaved} />}

            {logs.length > 0 && <WeekSummary logs={logs} />}

            {historyLogs.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">History</div>
                    {historyLogs.map((log) => (
                        <HistoryRow key={log.id} log={log} />
                    ))}
                </div>
            )}

            {!loading && logs.length === 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                    No sleep logs yet. Log last night's sleep above.
                </div>
            )}
        </div>
    )
}
