import { useEffect, useMemo, useState } from 'react'

import { upsertFinanceCategoryBudget, upsertFinanceMonthlyBudget, listFinanceCategoryBudgets, listFinanceMonthlyBudgets, getFinanceCategorySpend } from '../../lib/api'
import type { FinanceCategoryBudget, FinanceCategoryBudgetCreate, FinanceMonthlyBudget, FinanceMonthlyBudgetCreate } from '../../lib/api'

function money(n: number) {
    return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function ExpenseBudgetPage() {
    const now = useMemo(() => new Date(), [])
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)

    const [monthly, setMonthly] = useState<FinanceMonthlyBudget | null>(null)
    const [categories, setCategories] = useState<FinanceCategoryBudget[]>([])
    const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({})
    const [error, setError] = useState<string | null>(null)

    const [totalBudget, setTotalBudget] = useState<number>(0)
    const [newCat, setNewCat] = useState<FinanceCategoryBudgetCreate>({ year, month, category: 'Food', limit_amount: 10000, rollover_unused: false })

    async function reload() {
        setError(null)
        try {
            const [m, c, spend] = await Promise.all([
                listFinanceMonthlyBudgets(),
                listFinanceCategoryBudgets(year, month),
                getFinanceCategorySpend(year, month),
            ])
            const found = m.find((x) => x.year === year && x.month === month) ?? null
            setMonthly(found)
            setTotalBudget(found ? Number(found.total_budget) : 0)
            setCategories(c)
            const map: Record<string, number> = {}
            for (const s of spend) map[s.category] = Number(s.total)
            setSpentByCategory(map)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load budgets')
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month])

    async function saveMonthly() {
        const payload: FinanceMonthlyBudgetCreate = { year, month, total_budget: totalBudget, rollover_unused: false }
        await upsertFinanceMonthlyBudget(payload)
        await reload()
    }

    async function addCategory() {
        await upsertFinanceCategoryBudget({ ...newCat, year, month })
        await reload()
    }

    const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + Number(v), 0)
    const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

    function barColor(p: number) {
        if (p >= 100) return 'bg-red-500/60'
        if (p >= 75) return 'bg-amber-500/60'
        return 'bg-emerald-500/60'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Budget</div>
                    <div className="mt-1 text-sm text-zinc-500">Monthly and tag limits</div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="number" className="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                    <input type="number" className="w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={month} min={1} max={12} onChange={(e) => setMonth(Number(e.target.value))} />
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold">Budget Overview</div>
                        <div className="mt-1 text-xs text-zinc-500">{money(totalSpent)} / {money(totalBudget)} spent ({pct}%)</div>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Monthly budget (₹)</div>
                            <input type="number" className="w-56 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={totalBudget} onChange={(e) => setTotalBudget(Number(e.target.value))} />
                        </label>
                        <button type="button" onClick={() => void saveMonthly().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))} className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30">
                            Save
                        </button>
                    </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                    <div className={`h-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-xs text-zinc-500">Current: {monthly ? money(Number(monthly.total_budget)) : '—'}</div>
            </section>

            <section className="space-y-3">
                <div className="text-sm font-semibold">Tag budgets</div>

                <div className="grid gap-3 md:grid-cols-2">
                    {categories.map((c) => {
                        const spent = Number(spentByCategory[c.category] ?? 0)
                        const limit = Number(c.limit_amount)
                        const p = limit > 0 ? Math.round((spent / limit) * 100) : 0
                        const safeP = Math.min(100, Math.max(0, p))
                        const remaining = limit - spent
                        return (
                            <div key={`${c.year}-${c.month}-${c.category}`} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-zinc-100">{c.category}</div>
                                        <div className="mt-1 text-xs text-zinc-500">{money(spent)} / {money(limit)} spent</div>
                                    </div>
                                    <div className="text-right text-xs text-zinc-400">{p}%</div>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                                    <div className={`h-full ${barColor(p)}`} style={{ width: `${safeP}%` }} />
                                </div>
                                <div className="mt-2 text-xs text-zinc-500">
                                    {remaining >= 0 ? `${money(remaining)} left • On track` : `${money(Math.abs(remaining))} over budget ⚠️`}
                                </div>
                            </div>
                        )
                    })}
                    {categories.length === 0 ? <div className="text-sm text-zinc-500">No tag budgets yet.</div> : null}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-sm font-semibold">Add / Update Tag Budget</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Tag</div>
                            <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={newCat.category} onChange={(e) => setNewCat((c) => ({ ...c, category: e.target.value }))} />
                        </label>
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Budget (₹)</div>
                            <input type="number" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={newCat.limit_amount} onChange={(e) => setNewCat((c) => ({ ...c, limit_amount: Number(e.target.value) }))} />
                        </label>
                        <div className="flex items-end">
                            <button type="button" onClick={() => void addCategory().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900">
                                + Add Tag Budget
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
