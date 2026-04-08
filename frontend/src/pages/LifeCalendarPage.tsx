import { useEffect, useState } from 'react'
import { getLifeCalendar, type CalendarDay } from '../lib/api'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function scoreColor(score: number | null): string {
    if (score === null) return 'bg-zinc-900 border-zinc-800'
    if (score >= 80) return 'bg-emerald-500/80 border-emerald-500/40'
    if (score >= 60) return 'bg-emerald-500/40 border-emerald-600/30'
    if (score >= 40) return 'bg-amber-500/40 border-amber-600/30'
    if (score >= 20) return 'bg-orange-500/40 border-orange-600/30'
    return 'bg-red-500/40 border-red-600/30'
}

function fmt(n: number | null, unit = '') {
    if (n === null || n === undefined) return '—'
    return `${n}${unit}`
}

function moodEmoji(m: number | null) {
    if (!m) return '—'
    return ['', '😞', '😕', '😐', '🙂', '😄'][m] ?? '—'
}

type DayMap = Record<string, CalendarDay>

function buildWeeks(year: number, days: DayMap) {
    // Build a 53-week grid starting from Monday of the week containing Jan 1
    const jan1 = new Date(year, 0, 1)
    // Monday = 0, ..., Sunday = 6
    const jan1Dow = (jan1.getDay() + 6) % 7 // convert Sun=0 to Mon=0
    const gridStart = new Date(jan1)
    gridStart.setDate(jan1.getDate() - jan1Dow)

    const weeks: (CalendarDay | null)[][] = []
    const cur = new Date(gridStart)

    for (let w = 0; w < 53; w++) {
        const week: (CalendarDay | null)[] = []
        for (let d = 0; d < 7; d++) {
            const isoDate = cur.toISOString().split('T')[0]
            if (cur.getFullYear() === year) {
                week.push(days[isoDate] ?? { date: isoDate, composite_score: null, mood: null, energy: null, focus: null, daily_score: null, sleep_hours: null, sleep_quality: null, habits_done: 0, habits_total: 0 })
            } else {
                week.push(null) // outside the year
            }
            cur.setDate(cur.getDate() + 1)
        }
        weeks.push(week)
    }
    return weeks
}

function monthLabels(year: number) {
    // For each month, compute which week column the 1st falls in
    const jan1 = new Date(year, 0, 1)
    const jan1Dow = (jan1.getDay() + 6) % 7
    const gridStart = new Date(jan1)
    gridStart.setDate(jan1.getDate() - jan1Dow)

    const labels: { col: number; label: string }[] = []
    for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, 1)
        const diff = Math.floor((d.getTime() - gridStart.getTime()) / (7 * 86400000))
        labels.push({ col: diff, label: MONTHS[m] })
    }
    return labels
}

export function LifeCalendarPage() {
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(currentYear)
    const [days, setDays] = useState<DayMap>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<CalendarDay | null>(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
        setSelected(null)
        getLifeCalendar(year)
            .then((rows) => {
                const map: DayMap = {}
                rows.forEach((r) => { map[r.date] = r })
                setDays(map)
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false))
    }, [year])

    const weeks = buildWeeks(year, days)
    const mLabels = monthLabels(year)
    const today = new Date().toISOString().split('T')[0]

    const hasData = (d: CalendarDay | null) =>
        d && (d.composite_score !== null || d.habits_done > 0 || d.sleep_hours !== null || d.mood !== null)

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Life Calendar</div>
                    <div className="mt-0.5 text-sm text-zinc-500">One cell per day — colored by your daily score</div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setYear((y) => y - 1)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm transition hover:bg-zinc-800"
                    >
                        ‹ {year - 1}
                    </button>
                    <div className="min-w-[3.5rem] text-center text-sm font-semibold">{year}</div>
                    <button
                        type="button"
                        onClick={() => setYear((y) => y + 1)}
                        disabled={year >= currentYear}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm transition hover:bg-zinc-800 disabled:opacity-40"
                    >
                        {year + 1} ›
                    </button>
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            {loading ? <div className="text-sm text-zinc-500">Loading {year}…</div> : null}

            {!loading && (
                <div className="overflow-x-auto">
                    <div className="min-w-max">
                        {/* Month labels */}
                        <div className="mb-1 flex">
                            <div className="w-5 shrink-0" /> {/* day-label gutter */}
                            {mLabels.map((ml) => (
                                <div
                                    key={ml.label}
                                    className="absolute-ish text-xs text-zinc-500"
                                    style={{ marginLeft: `${ml.col * 14}px`, position: 'relative', width: 0 }}
                                >
                                    {ml.label}
                                </div>
                            ))}
                        </div>

                        {/* Grid: rows = days of week, cols = weeks */}
                        <div className="flex gap-0.5">
                            {/* Day-of-week labels */}
                            <div className="flex flex-col gap-0.5 pr-1">
                                {DAY_LABELS.map((l, i) => (
                                    <div key={i} className="flex h-3 w-4 items-center justify-end text-[9px] text-zinc-600">
                                        {i % 2 === 0 ? l : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Weeks */}
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col gap-0.5">
                                    {week.map((day, di) => {
                                        if (!day) {
                                            return <div key={di} className="h-3 w-3 rounded-sm" />
                                        }
                                        const isToday = day.date === today
                                        const isEmpty = !hasData(day)
                                        const isFuture = day.date > today
                                        return (
                                            <button
                                                key={di}
                                                type="button"
                                                title={day.date}
                                                onClick={() => setSelected(selected?.date === day.date ? null : day)}
                                                className={[
                                                    'h-3 w-3 rounded-sm border transition',
                                                    isFuture ? 'border-zinc-800/40 bg-zinc-900/40 opacity-40 cursor-default' :
                                                        isEmpty ? 'border-zinc-800 bg-zinc-900' :
                                                            scoreColor(day.composite_score),
                                                    isToday ? 'ring-1 ring-zinc-300' : '',
                                                    selected?.date === day.date ? 'ring-1 ring-blue-400' : '',
                                                ].filter(Boolean).join(' ')}
                                            />
                                        )
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                            <span>Score:</span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-900 border border-zinc-800" /> No data
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/40 border border-red-600/30" /> Low
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/40 border border-amber-600/30" /> Mid
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/40 border border-emerald-600/30" /> Good
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/80 border border-emerald-500/40" /> Great
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Day detail panel */}
            {selected && hasData(selected) && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-zinc-100">{selected.date}</div>
                        {selected.composite_score !== null && (
                            <div className="text-xs text-zinc-400">
                                Score: <span className="font-semibold text-zinc-200">{selected.composite_score.toFixed(0)}/100</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                            <div className="text-xs text-zinc-500 mb-1">Wellness</div>
                            <div className="flex gap-3 text-sm">
                                <span>Mood {moodEmoji(selected.mood)}</span>
                                <span>Energy {fmt(selected.energy, '/5')}</span>
                                <span>Focus {fmt(selected.focus, '/5')}</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                            <div className="text-xs text-zinc-500 mb-1">Sleep</div>
                            <div className="text-sm">
                                {fmt(selected.sleep_hours, 'h')} · Quality {fmt(selected.sleep_quality, '/5')}
                            </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                            <div className="text-xs text-zinc-500 mb-1">Habits</div>
                            <div className="text-sm">
                                {selected.habits_done}/{selected.habits_total} done
                                {selected.habits_total > 0 && (
                                    <span className="ml-2 text-zinc-400">
                                        ({Math.round(selected.habits_done / selected.habits_total * 100)}%)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selected && !hasData(selected) && (
                <div className="text-sm text-zinc-500">{selected.date} — no data logged for this day.</div>
            )}
        </div>
    )
}
