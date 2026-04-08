import { useEffect, useState } from 'react'
import { AlertTriangle, Info, Lightbulb } from 'lucide-react'
import type { FinCategorySpend, FinDailySpend, FinInsight } from '../../lib/api'
import { getFinCategorySpend, getFinDailyTrend, getFinInsights } from '../../lib/api'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

const COLOR_BAR: Record<string, string> = {
    orange: 'bg-orange-500', green: 'bg-green-500', blue: 'bg-blue-500',
    red: 'bg-red-500', purple: 'bg-purple-500', pink: 'bg-pink-500',
    yellow: 'bg-yellow-500', teal: 'bg-teal-500', indigo: 'bg-indigo-500',
    gray: 'bg-gray-500', cyan: 'bg-cyan-500', rose: 'bg-rose-500',
    amber: 'bg-amber-500', emerald: 'bg-emerald-500', zinc: 'bg-zinc-500',
}
function colorBar(c: string) { return COLOR_BAR[c] ?? COLOR_BAR.zinc }

const COLOR_DOT: Record<string, string> = {
    orange: 'bg-orange-400', green: 'bg-green-400', blue: 'bg-blue-400',
    red: 'bg-red-400', purple: 'bg-purple-400', pink: 'bg-pink-400',
    yellow: 'bg-yellow-400', teal: 'bg-teal-400', indigo: 'bg-indigo-400',
    gray: 'bg-gray-400', cyan: 'bg-cyan-400', rose: 'bg-rose-400',
    amber: 'bg-amber-400', emerald: 'bg-emerald-400', zinc: 'bg-zinc-400',
}
function colorDot(c: string) { return COLOR_DOT[c] ?? COLOR_DOT.zinc }

function InsightCard({ insight }: { insight: FinInsight }) {
    const icons: Record<string, React.ReactNode> = {
        info: <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />,
        warning: <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />,
        tip: <Lightbulb size={14} className="text-emerald-400 shrink-0 mt-0.5" />,
    }
    const borders: Record<string, string> = {
        info: 'border-blue-800/40 bg-blue-950/20',
        warning: 'border-yellow-800/40 bg-yellow-950/20',
        tip: 'border-emerald-800/40 bg-emerald-950/20',
    }
    return (
        <div className={`flex gap-3 rounded-xl border p-4 ${borders[insight.type] ?? 'border-zinc-800 bg-zinc-900/20'}`}>
            {icons[insight.type]}
            <div>
                <p className="text-sm font-medium text-zinc-200">{insight.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{insight.body}</p>
            </div>
        </div>
    )
}

export function FinanceAnalyticsPage() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)

    const [catSpend, setCatSpend] = useState<FinCategorySpend[]>([])
    const [dailyTrend, setDailyTrend] = useState<FinDailySpend[]>([])
    const [insights, setInsights] = useState<FinInsight[]>([])
    const [loading, setLoading] = useState(true)

    async function load() {
        setLoading(true)
        try {
            const [cs, dt, ins] = await Promise.all([
                getFinCategorySpend(year, month),
                getFinDailyTrend(year, month),
                getFinInsights(),
            ])
            setCatSpend(cs); setDailyTrend(dt); setInsights(ins)
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [year, month]) // eslint-disable-line

    function prevMonth() {
        if (month === 1) { setYear(y => y - 1); setMonth(12) }
        else setMonth(m => m - 1)
    }
    function nextMonth() {
        const n = new Date(); const ny = n.getFullYear(); const nm = n.getMonth() + 1
        if (year > ny || (year === ny && month >= nm)) return
        if (month === 12) { setYear(y => y + 1); setMonth(1) }
        else setMonth(m => m + 1)
    }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const totalSpend = catSpend.reduce((s, c) => s + c.total, 0)
    const maxDaily = Math.max(...dailyTrend.map(d => Math.max(d.expense, d.income)), 1)

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition">&lt;</button>
                    <span className="text-sm text-zinc-300 w-20 text-center">{MONTHS[month-1]} {year}</span>
                    <button onClick={nextMonth} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition">&gt;</button>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-zinc-500 text-sm">Loading…</div>
            ) : (
                <>
                    {/* Category spend */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Spending by Category</h2>
                        {catSpend.length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-6">No expense data for this month</p>
                        ) : (
                            <div className="space-y-3">
                                {catSpend.map(c => (
                                    <div key={c.category_name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${colorDot(c.category_color)}`} />
                                                <span className="text-sm text-zinc-300">{c.category_name}</span>
                                                <span className="text-xs text-zinc-600">({c.count})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">{c.pct}%</span>
                                                <span className="text-sm font-medium text-zinc-200">{fmt(c.total)}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-zinc-800">
                                            <div className={`h-full rounded-full ${colorBar(c.category_color)}`}
                                                style={{ width: `${Math.max(c.pct, 1)}%` }} />
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-zinc-800 flex justify-between">
                                    <span className="text-xs text-zinc-500">Total spent</span>
                                    <span className="text-sm font-semibold text-zinc-200">{fmt(totalSpend)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Daily trend */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily Trend</h2>
                        {dailyTrend.length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-6">No data yet</p>
                        ) : (
                            <div className="flex items-end gap-0.5 h-24 overflow-x-auto pb-4">
                                {dailyTrend.map(d => (
                                    <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1 min-w-[6px] group relative">
                                        {/* Expense bar */}
                                        <div className="w-full rounded-t bg-red-500/60 transition-all"
                                            style={{ height: `${(d.expense / maxDaily) * 80}px` }}
                                            title={`${d.date}: -${fmt(d.expense)}`} />
                                        {/* Tooltip */}
                                        <div className="absolute bottom-6 hidden group-hover:block z-10 bg-zinc-800 border border-zinc-700 rounded p-1 text-xs whitespace-nowrap">
                                            {d.date.slice(5)}: {fmt(d.expense)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-red-400" />
                                <span className="text-xs text-zinc-500">Expense</span>
                            </div>
                        </div>
                    </div>

                    {/* Insights */}
                    {insights.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Smart Insights</h2>
                            <div className="space-y-2">
                                {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
