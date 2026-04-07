import { useEffect, useState } from 'react'

import { listDailyLogs, saveDailyLog, updateDailyLog } from '../lib/api'
import type { DailyLog } from '../lib/api'

// ─── Slider ───────────────────────────────────────────────────────────────────

const MOOD_LABELS: Record<number, string> = { 1: 'Terrible', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' }
const ENERGY_LABELS: Record<number, string> = { 1: 'Drained', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Peak' }
const FOCUS_LABELS: Record<number, string> = { 1: 'Scattered', 2: 'Poor', 3: 'Okay', 4: 'Sharp', 5: 'Deep' }

function ScoreSlider({
    label,
    sublabels,
    value,
    onChange,
}: {
    label: string
    sublabels: Record<number, string>
    value: number
    onChange: (v: number) => void
}) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{label}</span>
                <span className="text-sm font-semibold text-zinc-100">
                    {value}/5 — {sublabels[value]}
                </span>
            </div>
            <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-zinc-600">
                {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n}>{n}</span>
                ))}
            </div>
        </div>
    )
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number | null }) {
    if (score === null) return null
    const pct = ((score - 1) / 4) * 100
    const color =
        pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'
    return (
        <div className={`text-center ${color}`}>
            <div className="text-4xl font-bold">{score.toFixed(1)}</div>
            <div className="text-xs text-zinc-500">Daily score</div>
        </div>
    )
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ log }: { log: DailyLog }) {
    const scoreColor =
        log.score === null
            ? 'text-zinc-500'
            : log.score >= 4
            ? 'text-emerald-400'
            : log.score >= 3
            ? 'text-yellow-400'
            : 'text-red-400'

    return (
        <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 px-4 py-3">
            <div className="w-24 shrink-0">
                <div className="text-sm font-medium text-zinc-200">
                    {new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                    })}
                </div>
                <div className={`text-lg font-bold ${scoreColor}`}>
                    {log.score !== null ? log.score.toFixed(1) : '—'}
                </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                    {log.mood !== null && <span>Mood {log.mood}/5</span>}
                    {log.energy !== null && <span>Energy {log.energy}/5</span>}
                    {log.focus !== null && <span>Focus {log.focus}/5</span>}
                </div>
                {log.reflection && (
                    <div className="text-sm text-zinc-400 line-clamp-2 italic">"{log.reflection}"</div>
                )}
            </div>
        </div>
    )
}

// ─── Today form ───────────────────────────────────────────────────────────────

type TodayFormProps = {
    existing: DailyLog | null
    onSaved: (log: DailyLog) => void
}

function TodayForm({ existing, onSaved }: TodayFormProps) {
    const [mood, setMood] = useState(existing?.mood ?? 3)
    const [energy, setEnergy] = useState(existing?.energy ?? 3)
    const [focus, setFocus] = useState(existing?.focus ?? 3)
    const [reflection, setReflection] = useState(existing?.reflection ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const previewScore = parseFloat(((mood + energy + focus) / 3).toFixed(2))

    async function handleSave() {
        setSaving(true)
        setError(null)
        try {
            const today = new Date().toISOString().split('T')[0]
            let result: DailyLog
            if (existing) {
                result = await updateDailyLog(existing.id, { mood, energy, focus, reflection: reflection.trim() || null })
            } else {
                result = await saveDailyLog({ log_date: today, mood, energy, focus, reflection: reflection.trim() || null })
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
                <div className="font-semibold text-zinc-100">Today's Log</div>
                <ScoreRing score={previewScore} />
            </div>

            <ScoreSlider label="Mood" sublabels={MOOD_LABELS} value={mood} onChange={setMood} />
            <ScoreSlider label="Energy" sublabels={ENERGY_LABELS} value={energy} onChange={setEnergy} />
            <ScoreSlider label="Focus" sublabels={FOCUS_LABELS} value={focus} onChange={setFocus} />

            <div>
                <label className="text-xs text-zinc-400">Reflection (optional)</label>
                <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What happened today? What did you feel?"
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                    {existing ? 'Updating today\'s log' : 'Creating today\'s log'}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export function DailyLogPage() {
    const [logs, setLogs] = useState<DailyLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const todayStr = new Date().toISOString().split('T')[0]
    const todayLog = logs.find((l) => l.log_date === todayStr) ?? null
    const historyLogs = logs.filter((l) => l.log_date !== todayStr)

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            setLogs(await listDailyLogs(60))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load logs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void reload() }, [])

    function handleSaved(log: DailyLog) {
        setLogs((prev) => {
            const without = prev.filter((l) => l.log_date !== log.log_date)
            return [log, ...without].sort((a, b) => b.log_date.localeCompare(a.log_date))
        })
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold">Daily Log</h1>
                    <div className="text-sm text-zinc-500">Track your mood, energy, and focus each day</div>
                </div>
            </div>

            {error && <div className="text-sm text-red-300">{error}</div>}

            {!loading && (
                <TodayForm existing={todayLog} onSaved={handleSaved} />
            )}

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
                    No logs yet. Fill in today's log above to start.
                </div>
            )}
        </div>
    )
}
