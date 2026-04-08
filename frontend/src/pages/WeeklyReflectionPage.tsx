import { useEffect, useState } from 'react'
import {
    deleteReflection,
    getThisWeekReflection,
    listReflections,
    upsertReflection,
    type WeeklyReflection,
    type WeeklyReflectionCreate,
} from '../lib/api'

function currentISOWeek(): { year: number; week: number } {
    const now = new Date()
    // ISO week: Jan 4 is always in week 1
    const jan4 = new Date(now.getFullYear(), 0, 4)
    const startOfWeek1 = new Date(jan4)
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
    const weekMs = (now.getTime() - startOfWeek1.getTime()) / (7 * 86400000)
    const week = Math.floor(weekMs) + 1
    // Handle year-boundary edge cases
    if (week < 1) {
        return { year: now.getFullYear() - 1, week: 52 }
    }
    return { year: now.getFullYear(), week }
}

function weekDateRange(year: number, week: number): string {
    // Monday of week
    const jan4 = new Date(year, 0, 4)
    const startOfWeek1 = new Date(jan4)
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
    const monday = new Date(startOfWeek1)
    monday.setDate(startOfWeek1.getDate() + (week - 1) * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${fmt(monday)} – ${fmt(sunday)}`
}

const PROMPTS = [
    { field: 'went_well' as const, label: 'What went well this week?', placeholder: 'Wins, good habits, proud moments…', color: 'border-emerald-800/40' },
    { field: 'didnt_go_well' as const, label: "What didn't go well?", placeholder: 'Challenges, slip-ups, struggles…', color: 'border-amber-800/40' },
    { field: 'improvements' as const, label: 'What will I improve next week?', placeholder: 'One or two concrete changes…', color: 'border-blue-800/40' },
    { field: 'highlight' as const, label: 'Highlight of the week', placeholder: 'The one thing that stood out…', color: 'border-violet-800/40' },
    { field: 'gratitude' as const, label: 'Gratitude', placeholder: 'Three things I am grateful for…', color: 'border-zinc-700' },
]

export function WeeklyReflectionPage() {
    const { year, week } = currentISOWeek()
    const [current, setCurrent] = useState<WeeklyReflection | null>(null)
    const [history, setHistory] = useState<WeeklyReflection[]>([])
    const [form, setForm] = useState<Record<string, string>>({
        went_well: '', didnt_go_well: '', improvements: '', highlight: '', gratitude: '',
    })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)

    async function load() {
        try {
            const [cur, hist] = await Promise.all([getThisWeekReflection(), listReflections(12)])
            setCurrent(cur)
            setHistory(hist)
            if (cur) {
                setForm({
                    went_well: cur.went_well ?? '',
                    didnt_go_well: cur.didnt_go_well ?? '',
                    improvements: cur.improvements ?? '',
                    highlight: cur.highlight ?? '',
                    gratitude: cur.gratitude ?? '',
                })
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load')
        }
    }

    useEffect(() => { void load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

    async function save() {
        setSaving(true)
        setSaved(false)
        setError(null)
        try {
            const payload: WeeklyReflectionCreate = {
                year,
                week_number: week,
                went_well: form.went_well || null,
                didnt_go_well: form.didnt_go_well || null,
                improvements: form.improvements || null,
                highlight: form.highlight || null,
                gratitude: form.gratitude || null,
            }
            const result = await upsertReflection(payload)
            setCurrent(result)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            void listReflections(12).then(setHistory)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    async function remove(id: number) {
        const ok = window.confirm('Delete this reflection?')
        if (!ok) return
        try {
            await deleteReflection(id)
            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete')
        }
    }

    const filledCount = PROMPTS.filter((p) => form[p.field]?.trim()).length

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Weekly Reflection</div>
                    <div className="mt-0.5 text-sm text-zinc-500">
                        Week {week} · {weekDateRange(year, week)}
                        {current ? <span className="ml-2 text-zinc-600">· saved</span> : null}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setHistoryOpen((h) => !h)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm transition hover:bg-zinc-800"
                >
                    {historyOpen ? 'Hide history' : 'Past reflections'}
                </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            {/* Current week form */}
            <div className="space-y-4">
                {PROMPTS.map((p) => (
                    <div key={p.field} className={`rounded-xl border ${p.color} bg-zinc-900/10 p-4`}>
                        <label className="block">
                            <div className="mb-2 text-sm font-medium text-zinc-200">{p.label}</div>
                            <textarea
                                rows={3}
                                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                placeholder={p.placeholder}
                                value={form[p.field]}
                                onChange={(e) => setForm((f) => ({ ...f, [p.field]: e.target.value }))}
                            />
                        </label>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving || filledCount === 0}
                    className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30 disabled:opacity-40"
                >
                    {saving ? 'Saving…' : saved ? 'Saved ✓' : current ? 'Update reflection' : 'Save reflection'}
                </button>
                <div className="text-xs text-zinc-600">{filledCount}/{PROMPTS.length} prompts filled</div>
            </div>

            {/* History */}
            {historyOpen && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="text-sm font-semibold text-zinc-400">Past reflections</div>
                    {history.filter((r) => !(r.year === year && r.week_number === week)).map((r) => (
                        <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-semibold text-zinc-400">
                                    Week {r.week_number}, {r.year} · {weekDateRange(r.year, r.week_number)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void remove(r.id)}
                                    className="text-xs text-zinc-600 hover:text-red-400 transition"
                                >
                                    Delete
                                </button>
                            </div>
                            {PROMPTS.map((p) => {
                                const val = r[p.field as keyof WeeklyReflection] as string | null
                                if (!val) return null
                                return (
                                    <div key={p.field}>
                                        <div className="text-xs text-zinc-500 mb-0.5">{p.label}</div>
                                        <div className="text-sm text-zinc-200 whitespace-pre-wrap">{val}</div>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                    {history.filter((r) => !(r.year === year && r.week_number === week)).length === 0 && (
                        <div className="text-sm text-zinc-600">No past reflections yet.</div>
                    )}
                </div>
            )}
        </div>
    )
}
