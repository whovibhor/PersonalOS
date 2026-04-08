import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Filter, Plus, Search, Trash2 } from 'lucide-react'
import type { FinTransaction, FinCategory, FinAccount } from '../../lib/api'
import {
    listFinTransactions, createFinTransaction, deleteFinTransaction,
    listFinCategories, listFinAccounts
} from '../../lib/api'

const COLOR_BG: Record<string, string> = {
    orange: 'bg-orange-500/20 text-orange-400', green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400', red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400', pink: 'bg-pink-500/20 text-pink-400',
    yellow: 'bg-yellow-500/20 text-yellow-400', teal: 'bg-teal-500/20 text-teal-400',
    indigo: 'bg-indigo-500/20 text-indigo-400', gray: 'bg-gray-500/20 text-gray-400',
    cyan: 'bg-cyan-500/20 text-cyan-400', rose: 'bg-rose-500/20 text-rose-400',
    amber: 'bg-amber-500/20 text-amber-400', emerald: 'bg-emerald-500/20 text-emerald-400',
    zinc: 'bg-zinc-500/20 text-zinc-400',
}
function colorBg(c: string | null) { return COLOR_BG[c ?? ''] ?? COLOR_BG.zinc }
function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

// ── Add Modal ──────────────────────────────────────────────────────────────────
function AddModal({ categories, accounts, onDone, onClose }: {
    categories: FinCategory[]; accounts: FinAccount[]
    onDone: () => void; onClose: () => void
}) {
    const [txnType, setTxnType] = useState<'expense' | 'income'>('expense')
    const [amount, setAmount] = useState('')
    const [categoryId, setCategoryId] = useState<number | ''>('')
    const [accountId, setAccountId] = useState<number | ''>(accounts.find(a => a.is_default)?.id ?? '')
    const [notes, setNotes] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('upi')
    const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10))
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    const filteredCats = categories.filter(c => c.cat_type === txnType || c.cat_type === 'both')

    async function handleSave() {
        if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount'); return }
        setSaving(true); setErr('')
        try {
            await createFinTransaction({
                amount: Number(amount), txn_type: txnType,
                category_id: categoryId !== '' ? categoryId : undefined,
                account_id: accountId !== '' ? accountId : undefined,
                payment_method: paymentMethod,
                notes: notes || undefined,
                txn_date: txnDate,
            })
            onDone()
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">Add Transaction</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-xl leading-none">&times;</button>
                </div>

                <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                    {(['expense', 'income'] as const).map(t => (
                        <button key={t} onClick={() => { setTxnType(t); setCategoryId('') }}
                            className={`flex-1 py-2 text-sm font-medium transition ${txnType === t
                                ? t === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                : 'text-zinc-500 hover:text-zinc-300'}`}>
                            {t === 'expense' ? 'Expense' : 'Income'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                    <span className="text-zinc-400 text-lg font-medium">₹</span>
                    <input autoFocus type="number" inputMode="decimal" placeholder="0"
                        value={amount} onChange={e => setAmount(e.target.value)}
                        className="flex-1 bg-transparent text-2xl font-semibold text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Category</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="">Uncategorized</option>
                            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Account</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="">No account</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Via</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="net_banking">Net Banking</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                        <input type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none" />
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Note (optional)</label>
                    <input type="text" placeholder="e.g. Dinner with friends" value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                {err && <p className="text-xs text-red-400">{err}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function FinanceTransactionsPage() {
    const [txns, setTxns] = useState<FinTransaction[]>([])
    const [categories, setCategories] = useState<FinCategory[]>([])
    const [accounts, setAccounts] = useState<FinAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    async function load() {
        setLoading(true)
        try {
            const [t, cats, accs] = await Promise.all([
                listFinTransactions({ limit: 100, search: search || undefined, txn_type: typeFilter || undefined }),
                listFinCategories(), listFinAccounts()
            ])
            setTxns(t); setCategories(cats); setAccounts(accs)
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [search, typeFilter]) // eslint-disable-line

    async function handleDelete(id: number) {
        if (!confirm('Delete this transaction?')) return
        await deleteFinTransaction(id)
        setTxns(prev => prev.filter(t => t.id !== id))
    }

    // Group by date
    const grouped: Record<string, FinTransaction[]> = {}
    for (const t of txns) {
        const day = t.txn_date.slice(0, 10)
        if (!grouped[day]) grouped[day] = []
        grouped[day].push(t)
    }
    const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

    const totalExpense = txns.filter(t => t.txn_type === 'expense').reduce((s, t) => s + t.amount, 0)
    const totalIncome = txns.filter(t => t.txn_type === 'income').reduce((s, t) => s + t.amount, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Transactions</h1>
                    <p className="text-sm text-zinc-500">All income and expenses</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
                    <Plus size={14} /> Add
                </button>
            </div>

            {/* Stats */}
            {txns.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-400 mt-1">{fmt(totalExpense)}</p>
                        <p className="text-xs text-zinc-600 mt-1">{txns.filter(t => t.txn_type === 'expense').length} transactions</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Income</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">{fmt(totalIncome)}</p>
                        <p className="text-xs text-zinc-600 mt-1">{txns.filter(t => t.txn_type === 'income').length} transactions</p>
                    </div>
                </div>
            )}

            {/* Search + filter */}
            <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
                    <Search size={14} className="text-zinc-500" />
                    <input type="text" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>
                <button onClick={() => setShowFilters(f => !f)}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition ${showFilters ? 'border-blue-600 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                    <Filter size={14} />
                </button>
            </div>

            {showFilters && (
                <div className="flex gap-2 flex-wrap">
                    {['', 'expense', 'income'].map(f => (
                        <button key={f} onClick={() => setTypeFilter(f)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${typeFilter === f ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-700'}`}>
                            {f === '' ? 'All' : f === 'expense' ? 'Expenses' : 'Income'}
                        </button>
                    ))}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="py-12 text-center text-zinc-500 text-sm">Loading…</div>
            ) : txns.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 py-12 text-center">
                    <p className="text-zinc-500 text-sm">No transactions found</p>
                    <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                        Add first transaction
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {days.map(day => (
                        <div key={day}>
                            <div className="flex items-center justify-between mb-1 px-1">
                                <p className="text-xs text-zinc-500">{new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                <p className="text-xs text-zinc-600">
                                    {fmt(grouped[day].filter(t => t.txn_type === 'expense').reduce((s, t) => s + t.amount, 0))} spent
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 divide-y divide-zinc-800/60">
                                {grouped[day].map(t => (
                                    <div key={t.id} className="flex items-center gap-3 py-2.5 group">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorBg(t.category_color)}`}>
                                            {t.txn_type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-200 truncate">{t.category_name ?? (t.txn_type === 'income' ? 'Income' : 'Expense')}</p>
                                            <p className="text-xs text-zinc-500 truncate">{t.notes || t.payment_method}</p>
                                        </div>
                                        <span className={`text-sm font-semibold shrink-0 ${t.txn_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                            {t.txn_type === 'income' ? '+' : '-'}{fmt(t.amount)}
                                        </span>
                                        <button onClick={() => handleDelete(t.id)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition ml-1 shrink-0">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <AddModal categories={categories} accounts={accounts}
                    onDone={() => { setShowAdd(false); load() }}
                    onClose={() => setShowAdd(false)} />
            )}
        </div>
    )
}
