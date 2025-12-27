import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { createFinanceRecurring, createFinanceTransaction, listFinanceAssets, listFinanceGoals, listFinanceOccurrences, getFinanceCashflow, getFinanceCategorySpend, getFinanceDashboard } from '../../lib/api'
import type { FinanceAsset, FinanceCashflowPoint, FinanceCategorySpend, FinanceDashboard, FinanceOccurrence, FinanceGoal, FinanceRecurringCreate, FinanceTransactionCreate } from '../../lib/api'

import { Modal } from '../../components/Modal'

function money(n: number) {
    return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function isoLocalDateTime(d: Date) {
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function IconBolt({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
    )
}

function IconBills({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M7 3h10v18l-5-3-5 3V3z" />
        </svg>
    )
}

export function ExpenseDashboardPage() {
    const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null)
    const [cashflow, setCashflow] = useState<FinanceCashflowPoint[]>([])
    const [spend, setSpend] = useState<FinanceCategorySpend[]>([])
    const [occurrences, setOccurrences] = useState<FinanceOccurrence[]>([])
    const [goals, setGoals] = useState<FinanceGoal[]>([])
    const [error, setError] = useState<string | null>(null)

    const [assets, setAssets] = useState<FinanceAsset[]>([])

    const [quickAddOpen, setQuickAddOpen] = useState(false)
    const [billOpen, setBillOpen] = useState(false)

    const [txnForm, setTxnForm] = useState<FinanceTransactionCreate>(() => ({
        txn_type: 'expense',
        amount: 0,
        category: 'General',
        description: '',
        transacted_at: new Date().toISOString(),
        from_asset_id: null,
        to_asset_id: null,
        liability_id: null,
        recurring_id: null,
    }))

    const [billForm, setBillForm] = useState<FinanceRecurringCreate>(() => ({
        name: 'House Rent',
        txn_type: 'expense',
        amount: 0,
        category: 'Rent',
        description: '',
        schedule: 'monthly',
        day_of_month: null,
        day_of_week: null,
        next_due_date: new Date().toISOString().slice(0, 10),
        auto_create: false,
        is_active: true,
        asset_id: null,
        liability_id: null,
    }))

    const now = useMemo(() => new Date(), [])
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    useEffect(() => {
        let alive = true
        setError(null)

        Promise.all([
            getFinanceDashboard(),
            getFinanceCashflow(6),
            getFinanceCategorySpend(year, month),
            listFinanceOccurrences('pending'),
            listFinanceGoals(true),
            listFinanceAssets(),
        ])
            .then(([d, cf, cs, occ, gs, a]) => {
                if (!alive) return
                setDashboard(d)
                setCashflow(cf)
                setSpend(cs)
                setOccurrences(occ.slice(0, 6))
                setGoals(gs.slice(0, 4))
                setAssets(a)
            })
            .catch((e) => {
                if (!alive) return
                setError(e instanceof Error ? e.message : 'Failed to load finance dashboard')
            })

        return () => {
            alive = false
        }
    }, [month, year])

    const savingsRate = dashboard?.savings_rate ?? 0

    async function reloadCore() {
        const [d, cf, cs, occ, gs, a] = await Promise.all([
            getFinanceDashboard(),
            getFinanceCashflow(6),
            getFinanceCategorySpend(year, month),
            listFinanceOccurrences('pending'),
            listFinanceGoals(true),
            listFinanceAssets(),
        ])
        setDashboard(d)
        setCashflow(cf)
        setSpend(cs)
        setOccurrences(occ.slice(0, 6))
        setGoals(gs.slice(0, 4))
        setAssets(a)
    }

    async function submitQuickTxn() {
        setError(null)
        await createFinanceTransaction({
            ...txnForm,
            amount: Number(txnForm.amount),
            transacted_at: new Date(txnForm.transacted_at).toISOString(),
        })
        setQuickAddOpen(false)
        await reloadCore()
    }

    async function submitBill() {
        setError(null)
        const due = new Date(billForm.next_due_date)
        const dayOfMonth = billForm.schedule === 'monthly' ? due.getDate() : null
        const dayOfWeek = billForm.schedule === 'weekly' ? ((due.getDay() + 6) % 7) : null

        await createFinanceRecurring({
            ...billForm,
            amount: Number(billForm.amount),
            day_of_month: dayOfMonth,
            day_of_week: dayOfWeek,
        })
        setBillOpen(false)
        await reloadCore()
    }

    return (
        <div className="space-y-6">
            {error ? (
                <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</div>
            ) : null}

            <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-950/80 to-blue-600/30 p-8 text-center">
                <div className="text-xs tracking-[0.2em] text-zinc-200/70">YOUR NET WORTH</div>
                <div className="mt-3 text-4xl font-semibold text-white md:text-5xl">
                    {dashboard ? money(Number(dashboard.net_worth)) : '—'}
                </div>
                <div className="mt-3 text-sm text-zinc-100/80">Real-time based on assets and debts</div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <Link
                        to="/expense/assets"
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
                    >
                        View Breakdown →
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            setTxnForm((f) => ({ ...f, transacted_at: isoLocalDateTime(new Date()) }))
                            setQuickAddOpen(true)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
                    >
                        <IconBolt className="h-4 w-4" />
                        Quick Add
                    </button>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">Income</div>
                    <div className="mt-1 text-2xl font-semibold">{dashboard ? money(Number(dashboard.income_this_month)) : '—'}</div>
                    <div className="mt-1 text-xs text-zinc-500">this month</div>
                </div>
                <div className="md:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">Expenses</div>
                    <div className="mt-1 text-2xl font-semibold">{dashboard ? money(Number(dashboard.expenses_this_month)) : '—'}</div>
                    <div className="mt-1 text-xs text-zinc-500">this month</div>
                </div>
                <div className="md:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">Savings</div>
                    <div className="mt-1 text-2xl font-semibold">{dashboard ? money(Number(dashboard.savings_this_month)) : '—'}</div>
                    <div className="mt-1 text-xs text-zinc-500">this month</div>
                </div>
                <div className="md:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="text-xs text-zinc-400">Save rate</div>
                    <div className="mt-1 text-2xl font-semibold">{dashboard ? `${Math.round(savingsRate)}%` : '—'}</div>
                    <div className="mt-1 text-xs text-zinc-500">(savings / income)</div>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-8 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold">Cash Flow</div>
                            <div className="text-xs text-zinc-500">Last {cashflow.length || 6} months</div>
                        </div>
                    </div>
                    <div className="mt-3 space-y-2">
                        {cashflow.map((p) => (
                            <div key={p.month} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                <div className="text-xs text-zinc-400">{p.month}</div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="text-emerald-200">+{money(Number(p.income))}</span>
                                    <span className="text-red-200">-{money(Number(p.expense))}</span>
                                    <span className="text-zinc-200">{money(Number(p.savings))}</span>
                                </div>
                            </div>
                        ))}
                        {cashflow.length === 0 ? <div className="text-sm text-zinc-500">No data yet.</div> : null}
                    </div>
                </div>

                <div className="md:col-span-4 space-y-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">Upcoming Bills & EMIs</div>
                            <button
                                type="button"
                                onClick={() => setBillOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-900"
                            >
                                <IconBills className="h-4 w-4" />
                                + Add Bill
                            </button>
                        </div>
                        <div className="mt-3 space-y-2">
                            {occurrences.map((o) => (
                                <div key={o.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm text-zinc-100">{o.name ?? `Rule #${o.recurring_id}`}</div>
                                        <div className="text-xs text-zinc-500">Due {o.due_date}{o.category ? ` • ${o.category}` : ''}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-400">{o.status}</div>
                                        {o.amount != null ? <div className="mt-1 text-sm font-semibold text-zinc-100">{money(Number(o.amount))}</div> : null}
                                    </div>
                                </div>
                            ))}
                            {occurrences.length === 0 ? <div className="text-sm text-zinc-500">No upcoming dues.</div> : null}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="text-sm font-semibold">Goals Progress</div>
                        <div className="mt-3 space-y-3">
                            {goals.map((g) => {
                                const pct = g.target_amount ? Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)) : 0
                                return (
                                    <div key={g.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm text-zinc-100 truncate">{g.name}</div>
                                                <div className="text-xs text-zinc-500">{money(Number(g.current_amount))} / {money(Number(g.target_amount))}</div>
                                            </div>
                                            <div className="text-xs text-zinc-300">{pct}%</div>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                                            <div className="h-full bg-blue-500/60" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                            {goals.length === 0 ? <div className="text-sm text-zinc-500">No active goals.</div> : null}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold">Spending Breakdown</div>
                        <div className="text-xs text-zinc-500">This month</div>
                    </div>
                    <Link to="/expense/transactions" className="text-xs text-blue-200/80 hover:text-blue-200">View All →</Link>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {spend.slice(0, 8).map((s) => (
                        <div key={s.category} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                            <div className="text-sm text-zinc-100">{s.category}</div>
                            <div className="text-sm text-zinc-200">{money(Number(s.total))}</div>
                        </div>
                    ))}
                    {spend.length === 0 ? <div className="text-sm text-zinc-500">No spending yet.</div> : null}
                </div>
            </section>

            <Modal open={quickAddOpen} title="Quick Add Transaction" onClose={() => setQuickAddOpen(false)}>
                <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Type</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={txnForm.txn_type}
                                onChange={(e) => setTxnForm((f) => ({ ...f, txn_type: e.target.value as any }))}
                            >
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                                <option value="transfer">Transfer</option>
                                <option value="liability_payment">Bill/EMI Payment</option>
                            </select>
                        </label>

                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Amount (₹)</div>
                            <input
                                type="number"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={txnForm.amount}
                                onChange={(e) => setTxnForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Category</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={txnForm.category}
                            onChange={(e) => setTxnForm((f) => ({ ...f, category: e.target.value }))}
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Description</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={txnForm.description ?? ''}
                            onChange={(e) => setTxnForm((f) => ({ ...f, description: e.target.value }))}
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Date</div>
                        <input
                            type="datetime-local"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={txnForm.transacted_at ? isoLocalDateTime(new Date(txnForm.transacted_at)) : isoLocalDateTime(new Date())}
                            onChange={(e) => setTxnForm((f) => ({ ...f, transacted_at: new Date(e.target.value).toISOString() }))}
                        />
                    </label>

                    {txnForm.txn_type !== 'income' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">From Account</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={txnForm.from_asset_id ?? ''}
                                onChange={(e) => setTxnForm((f) => ({ ...f, from_asset_id: e.target.value ? Number(e.target.value) : null }))}
                            >
                                <option value="">(primary if empty)</option>
                                {assets.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}{a.is_primary ? ' (primary)' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    {txnForm.txn_type === 'income' || txnForm.txn_type === 'transfer' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">To Account</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={txnForm.to_asset_id ?? ''}
                                onChange={(e) => setTxnForm((f) => ({ ...f, to_asset_id: e.target.value ? Number(e.target.value) : null }))}
                            >
                                <option value="">(primary if empty)</option>
                                {assets.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}{a.is_primary ? ' (primary)' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setQuickAddOpen(false)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void submitQuickTxn().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))}
                            className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal open={billOpen} title="Add Bill" onClose={() => setBillOpen(false)}>
                <div className="space-y-3">
                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Name</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={billForm.name}
                            onChange={(e) => setBillForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Type</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={billForm.txn_type}
                                onChange={(e) => setBillForm((f) => ({ ...f, txn_type: e.target.value as any }))}
                            >
                                <option value="expense">Expense</option>
                                <option value="liability_payment">Bill/EMI Payment</option>
                            </select>
                        </label>

                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Amount (₹)</div>
                            <input
                                type="number"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={billForm.amount}
                                onChange={(e) => setBillForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Category</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={billForm.category}
                            onChange={(e) => setBillForm((f) => ({ ...f, category: e.target.value }))}
                        />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Schedule</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={billForm.schedule}
                                onChange={(e) => setBillForm((f) => ({ ...f, schedule: e.target.value as any }))}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="daily">Daily</option>
                            </select>
                        </label>

                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Next due date</div>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={billForm.next_due_date}
                                onChange={(e) => setBillForm((f) => ({ ...f, next_due_date: e.target.value }))}
                            />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setBillOpen(false)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void submitBill().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))}
                            className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
