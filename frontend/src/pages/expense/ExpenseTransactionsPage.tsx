import { useEffect, useMemo, useState } from 'react'

import { Modal } from '../../components/Modal'
import {
    createFinanceTransaction,
    deleteFinanceTransaction,
    listFinanceAssets,
    listFinanceLiabilities,
    listFinanceTransactions,
    updateFinanceTransaction,
} from '../../lib/api'
import type { FinanceAsset, FinanceLiability, FinanceTransaction, FinanceTransactionCreate, FinanceTransactionUpdate } from '../../lib/api'
import { FINANCE_TAGS } from './financeTags'
import * as XLSX from 'xlsx'

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Cheque', 'Other'] as const

function money(n: number) {
    const sign = n < 0 ? '-' : ''
    return `${sign}₹${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function isoLocalDateTime(d: Date) {
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function IconDownload({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
        </svg>
    )
}

function IconPlus({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
        </svg>
    )
}

function IconEdit({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
    )
}

function IconTrash({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
    )
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
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState<FinanceTransactionCreate>(() => ({
        txn_type: 'expense',
        amount: 0,
        category: '',
        payment_mode: null,
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

    function downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }

    function toExcelFriendlyCsv(rows: Array<Record<string, any>>) {
        const header = Object.keys(rows[0] ?? {})
        const escapeCell = (v: any) => {
            if (v == null) return ''
            const s = String(v)
            // Quote if needed; double quotes inside fields.
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
            return s
        }

        const lines = [
            header.map(escapeCell).join(','),
            ...rows.map((r) => header.map((k) => escapeCell(r[k])).join(',')),
        ]

        // UTF-8 BOM helps Excel recognize UTF-8.
        return `\uFEFF${lines.join('\r\n')}`
    }

    function buildExportRows() {
        const assetNameById = new Map<number, string>()
        for (const a of assets) assetNameById.set(a.id, a.name)
        const liabilityNameById = new Map<number, string>()
        for (const l of liabilities) liabilityNameById.set(l.id, l.name)

        return filtered.map((t) => {
            const fromAccount = t.from_asset_id != null ? assetNameById.get(t.from_asset_id) ?? String(t.from_asset_id) : ''
            const toAccount = t.to_asset_id != null ? assetNameById.get(t.to_asset_id) ?? String(t.to_asset_id) : ''
            const liability = t.liability_id != null ? liabilityNameById.get(t.liability_id) ?? String(t.liability_id) : ''
            return {
                Date: new Date(t.transacted_at).toISOString().slice(0, 10),
                Type: t.txn_type,
                Amount: Number(t.amount),
                Tag: t.category,
                PaymentMode: t.payment_mode ?? '',
                Description: t.description ?? '',
                FromAccount: fromAccount,
                ToAccount: toAccount,
                Liability: liability,
                RecurringId: t.recurring_id ?? '',
                TransactionId: t.id,
            }
        })
    }

    function exportCsv() {
        const rows = buildExportRows()
        const csv = toExcelFriendlyCsv(rows)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        downloadBlob(blob, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)
    }

    function exportXlsx() {
        const rows = buildExportRows()
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
        const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadBlob(blob, `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    function openAdd() {
        setEditingId(null)
        setForm((f) => ({ ...f, transacted_at: isoLocalDateTime(new Date()) }))
        setOpen(true)
    }

    function openEdit(txn: FinanceTransaction) {
        setEditingId(txn.id)
        setForm({
            txn_type: txn.txn_type as any,
            amount: Number(txn.amount),
            category: txn.category,
            payment_mode: txn.payment_mode ?? null,
            description: txn.description ?? '',
            transacted_at: isoLocalDateTime(new Date(txn.transacted_at)),
            from_asset_id: txn.from_asset_id ?? null,
            to_asset_id: txn.to_asset_id ?? null,
            liability_id: txn.liability_id ?? null,
            recurring_id: txn.recurring_id ?? null,
        })
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
            const base = {
                ...form,
                amount: Number(form.amount),
                transacted_at: new Date(form.transacted_at).toISOString(),
                payment_mode: form.payment_mode && String(form.payment_mode).trim().length > 0 ? String(form.payment_mode).trim() : null,
            }

            if (editingId != null) {
                const payload: FinanceTransactionUpdate = {
                    ...base,
                }
                await updateFinanceTransaction(editingId, payload)
            } else {
                await createFinanceTransaction(base)
            }
            setOpen(false)
            setEditingId(null)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : (editingId != null ? 'Failed to update transaction' : 'Failed to create transaction'))
        }
    }

    async function remove(txn: FinanceTransaction) {
        const ok = window.confirm('Delete this transaction? This will update balances.')
        if (!ok) return
        setError(null)
        try {
            await deleteFinanceTransaction(txn.id)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete transaction')
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
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                    >
                        <IconDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">CSV</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => void exportXlsx()}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                    >
                        <IconDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => openAdd()}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                    >
                        <IconPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add</span>
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
                                <div className="flex items-center gap-3">
                                    <div className={`text-sm font-semibold ${isExpense ? 'text-red-200' : 'text-emerald-200'}`}>
                                        {isExpense ? '-' : '+'}{money(amt)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(t)}
                                            aria-label="Edit transaction"
                                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 transition hover:bg-zinc-900 hover:text-zinc-50"
                                        >
                                            <IconEdit className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void remove(t)}
                                            aria-label="Delete transaction"
                                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-100"
                                        >
                                            <IconTrash className="h-4 w-4" />
                                        </button>
                                    </div>
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

            <Modal open={open} title={editingId != null ? 'Edit Transaction' : 'Add Transaction'} onClose={() => { setOpen(false); setEditingId(null) }}>
                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Type</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.txn_type}
                                onChange={(e) => {
                                    const next = e.target.value as any
                                    setForm((f) => {
                                        if (next === 'income') {
                                            return { ...f, txn_type: next, from_asset_id: null, liability_id: null }
                                        }
                                        if (next === 'expense') {
                                            return { ...f, txn_type: next, to_asset_id: null, liability_id: null }
                                        }
                                        if (next === 'transfer') {
                                            return { ...f, txn_type: next, liability_id: null }
                                        }
                                        if (next === 'liability_payment') {
                                            return { ...f, txn_type: next, to_asset_id: null }
                                        }
                                        return { ...f, txn_type: next }
                                    })
                                }}
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
                        <div className="mb-1 text-xs text-zinc-400">Tag</div>
                        <input
                            list="finance-tags"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        />
                        <datalist id="finance-tags">
                            {FINANCE_TAGS.map((t) => (
                                <option key={t} value={t} />
                            ))}
                        </datalist>
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Payment Mode</div>
                        <select
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.payment_mode ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value ? e.target.value : null }))}
                        >
                            <option value="">—</option>
                            {PAYMENT_MODES.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
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
                                <option value="">Primary Account</option>
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
                                <option value="">Primary Account</option>
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
                            onClick={() => { setOpen(false); setEditingId(null) }}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void submit()}
                            className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                        >
                            {editingId != null ? 'Save' : 'Create'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
