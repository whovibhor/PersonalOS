import { useEffect, useMemo, useState } from 'react'

import { getFinanceCashflow, getFinanceCategorySpend, getFinanceDashboard } from '../../lib/api'
import type { FinanceCashflowPoint, FinanceCategorySpend, FinanceDashboard } from '../../lib/api'

function money(n: number) {
    return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function ExpenseReportsPage() {
    const [dash, setDash] = useState<FinanceDashboard | null>(null)
    const [cashflow, setCashflow] = useState<FinanceCashflowPoint[]>([])
    const [spend, setSpend] = useState<FinanceCategorySpend[]>([])
    const [error, setError] = useState<string | null>(null)

    const [range, setRange] = useState<'This Month' | 'Last 3 Months' | 'Last 6 Months' | 'This Year'>('Last 6 Months')

    const now = useMemo(() => new Date(), [])

    useEffect(() => {
        let alive = true
        setError(null)
        const year = now.getFullYear()
        const month = now.getMonth() + 1

        const months = range === 'This Month' ? 1 : range === 'Last 3 Months' ? 3 : range === 'Last 6 Months' ? 6 : 12

        Promise.all([getFinanceDashboard(), getFinanceCashflow(months), getFinanceCategorySpend(year, month)])
            .then(([d, cf, cs]) => {
                if (!alive) return
                setDash(d)
                setCashflow(cf)
                setSpend(cs)
            })
            .catch((e) => {
                if (!alive) return
                setError(e instanceof Error ? e.message : 'Failed to load reports')
            })

        return () => {
            alive = false
        }
    }, [now, range])

    const debtToAsset = useMemo(() => {
        if (!dash) return 0
        if (!Number(dash.total_assets)) return 0
        return (Number(dash.total_liabilities) / Number(dash.total_assets)) * 100
    }, [dash])

    const summary = useMemo(() => {
        if (cashflow.length === 0) {
            return {
                avgIncome: 0,
                avgExpense: 0,
                avgSavingsRate: 0,
                netWorthGrowth: 0,
            }
        }
        const incomeSum = cashflow.reduce((s, p) => s + Number(p.income), 0)
        const expenseSum = cashflow.reduce((s, p) => s + Number(p.expense), 0)
        const savingsSum = cashflow.reduce((s, p) => s + Number(p.savings), 0)
        const n = cashflow.length
        const avgIncome = incomeSum / n
        const avgExpense = expenseSum / n
        const avgSavingsRate = incomeSum > 0 ? (savingsSum / incomeSum) * 100 : 0
        // We don't store historical net worth yet; treat net growth as total savings across range.
        const netWorthGrowth = savingsSum
        return { avgIncome, avgExpense, avgSavingsRate, netWorthGrowth }
    }, [cashflow])

    function exportJson() {
        const payload = {
            range,
            dashboard: dash,
            cashflow,
            spendingThisMonth: spend,
            generatedAt: new Date().toISOString(),
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reports-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Financial Reports</div>
                    <div className="mt-1 text-sm text-zinc-500">Summary, trends, and exports</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as any)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                        <option>This Month</option>
                        <option>Last 3 Months</option>
                        <option>Last 6 Months</option>
                        <option>This Year</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => void exportJson()}
                        className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                    >
                        Export JSON
                    </button>
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <section className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-xs text-zinc-400">Average Monthly Income</div>
                    <div className="mt-1 text-2xl font-semibold">{money(summary.avgIncome)}</div>
                    <div className="mt-1 text-xs text-zinc-500">based on {cashflow.length || 0} months</div>
                </div>
                <div className="md:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-xs text-zinc-400">Average Monthly Expenses</div>
                    <div className="mt-1 text-2xl font-semibold">{money(summary.avgExpense)}</div>
                    <div className="mt-1 text-xs text-zinc-500">based on {cashflow.length || 0} months</div>
                </div>
                <div className="md:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-xs text-zinc-400">Average Savings Rate</div>
                    <div className="mt-1 text-2xl font-semibold">{Math.round(summary.avgSavingsRate)}%</div>
                    <div className="mt-1 text-xs text-zinc-500">savings / income</div>
                </div>
                <div className="md:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-xs text-zinc-400">Net Worth Growth</div>
                    <div className="mt-1 text-2xl font-semibold">+{money(summary.netWorthGrowth)}</div>
                    <div className="mt-1 text-xs text-zinc-500">estimated from savings</div>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">Net worth</div>
                    <div className="mt-1 text-2xl font-semibold">{dash ? money(Number(dash.net_worth)) : '—'}</div>
                </div>
                <div className="md:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">Debt-to-asset</div>
                    <div className="mt-1 text-2xl font-semibold">{dash ? `${Math.round(debtToAsset)}%` : '—'}</div>
                </div>
                <div className="md:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">This month savings</div>
                    <div className="mt-1 text-2xl font-semibold">{dash ? money(Number(dash.savings_this_month)) : '—'}</div>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-sm font-semibold">Cash flow</div>
                    <div className="mt-3 space-y-2">
                        {cashflow.map((p) => (
                            <div key={p.month} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                <div className="text-xs text-zinc-400">{p.month}</div>
                                <div className="text-xs text-zinc-300">{money(Number(p.savings))}</div>
                            </div>
                        ))}
                        {cashflow.length === 0 ? <div className="text-sm text-zinc-500">No cashflow yet.</div> : null}
                    </div>
                </div>

                <div className="md:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-sm font-semibold">Spending tags</div>
                    <div className="mt-3 space-y-2">
                        {spend.slice(0, 10).map((s) => (
                            <div key={s.category} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                <div className="text-sm text-zinc-100">{s.category}</div>
                                <div className="text-sm text-zinc-200">{money(Number(s.total))}</div>
                            </div>
                        ))}
                        {spend.length === 0 ? <div className="text-sm text-zinc-500">No spending yet.</div> : null}
                    </div>
                </div>
            </section>
        </div>
    )
}
