import { useEffect, useMemo, useState } from 'react'

import { Modal } from '../../components/Modal'
import {
    createFinanceTransaction,
    listFinanceAssets,
    listFinanceLiabilities,
    listFinanceTransactions,
} from '../../lib/api'
import type { FinanceAsset, FinanceLiability, FinanceTransaction, FinanceTransactionCreate } from '../../lib/api'

function money(n: number) {
    const sign = n < 0 ? '-' : ''
    return `${sign}₹${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function isoLocalDateTime(d: Date) {
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ExpenseTransactionsPage() {
    const [assets, setAssets] = useState<FinanceAsset[]>([])
    const [liabilities, setLiabilities] = useState<FinanceLiability[]>([])
    const [txns, setTxns] = useState<FinanceTransaction[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [tab, setTab] = useState<'All' | 'Income' | 'Expense' | 'Transfer'>('All')
    const [q, setQ] = useState('')

    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<FinanceTransactionCreate>(() => ({
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

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return txns.filter((t) => {
            if (tab === 'Income' && t.txn_type !== 'income') return false
            if (tab === 'Expense' && !(t.txn_type === 'expense' || t.txn_type === 'liability_payment')) return false
            if (tab === 'Transfer' && t.txn_type !== 'transfer') return false

            if (!needle) return true
            const hay = `${t.category} ${t.description ?? ''} ${t.txn_type}`.toLowerCase()
            return hay.includes(needle)
        })
    }, [q, tab, txns])

    const total = useMemo(
        () =>
            filtered.reduce(
                (s, t) => s + (t.txn_type === 'income' ? Number(t.amount) : -Number(t.amount)),
                0
            ),
        [filtered]
    )

    const totalAbs = useMemo(
        () => filtered.reduce((s, t) => s + Number(t.amount), 0),
        [filtered]
    )

    function exportCsv() {
        const rows = filtered.map((t) => ({
            id: t.id,
            type: t.txn_type,
            amount: Number(t.amount),
            category: t.category,
            description: t.description ?? '',
            transacted_at: t.transacted_at,
        }))
        const header = Object.keys(rows[0] ?? { id: '', type: '', amount: '', category: '', description: '', transacted_at: '' })
        const csv = [
            header.join(','),
            ...rows.map((r) => header.map((k) => JSON.stringify((r as any)[k] ?? '')).join(',')),
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    function openAdd() {
        setForm((f) => ({ ...f, transacted_at: isoLocalDateTime(new Date()) }))
        setOpen(true)
    }

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            const [a, l, t] = await Promise.all([
                listFinanceAssets(),
                listFinanceLiabilities(),
                listFinanceTransactions(),
            ])
            setAssets(a)
            setLiabilities(l)
            setTxns(t)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load transactions')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function submit() {
        setError(null)
        try {
            await createFinanceTransaction({
                ...form,
                amount: Number(form.amount),
                transacted_at: new Date(form.transacted_at).toISOString(),
            })
            setOpen(false)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create transaction')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {(['All', 'Income', 'Expense', 'Transfer'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={
                                `rounded-full px-3 py-2 text-sm transition ` +
                                (tab === t
                                    ? 'bg-zinc-800 text-zinc-50'
                                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50')
                            }
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="text-sm text-zinc-500">
                    {loading ? 'Loading…' : `${filtered.length} transactions • ${money(totalAbs)} total`}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search transactions..."
                        className="w-56 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                    />
                    <button
                        type="button"
                        onClick={() => void exportCsv()}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                    >
                        Download
                    </button>
                    <button
                        type="button"
                        onClick={() => openAdd()}
                        className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                    >
                        + Add
                    </button>
                </div>
            </div>

            <div className="text-sm text-zinc-400">Net flow: {money(total)}</div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="space-y-2">
                {filtered.map((t) => {
                    const isExpense = t.txn_type === 'expense' || t.txn_type === 'liability_payment'
                    const amt = Number(t.amount)
                    const icon =
                        t.txn_type === 'income'
                            ? '💼'
                            : t.txn_type === 'transfer'
                                ? '🔁'
                                : t.txn_type === 'liability_payment'
                                    ? '🧾'
                                    : '💳'
                    return (
                        <div
                            key={t.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 transition hover:border-blue-500/40 hover:bg-zinc-900/20"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xl">{icon}</div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-zinc-100">{t.description || t.category}</div>
                                            <div className="mt-0.5 text-xs text-zinc-500">
                                                {t.category} • {new Date(t.transacted_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-sm font-semibold ${isExpense ? 'text-red-200' : 'text-emerald-200'}`}>
                                    {isExpense ? '-' : '+'}{money(amt)}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {!loading && filtered.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        No transactions found.
                    </div>
                ) : null}
            </div>

            <Modal open={open} title="Add Transaction" onClose={() => setOpen(false)}>
                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Type</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.txn_type}
                                onChange={(e) => setForm((f) => ({ ...f, txn_type: e.target.value as any }))}
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
                                value={form.amount}
                                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Category</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Description</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.description ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Date</div>
                        <input
                            type="datetime-local"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.transacted_at ? isoLocalDateTime(new Date(form.transacted_at)) : isoLocalDateTime(new Date())}
                            onChange={(e) => setForm((f) => ({ ...f, transacted_at: new Date(e.target.value).toISOString() }))}
                        />
                    </label>

                    {form.txn_type !== 'income' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">From Account</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.from_asset_id ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, from_asset_id: e.target.value ? Number(e.target.value) : null }))}
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

                    {form.txn_type !== 'expense' && form.txn_type !== 'liability_payment' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">To Account</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.to_asset_id ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, to_asset_id: e.target.value ? Number(e.target.value) : null }))}
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

                    {form.txn_type === 'liability_payment' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Liability</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.liability_id ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, liability_id: e.target.value ? Number(e.target.value) : null }))}
                            >
                                <option value="">Select liability…</option>
                                {liabilities.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void submit()}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
