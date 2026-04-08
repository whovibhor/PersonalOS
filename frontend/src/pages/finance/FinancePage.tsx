import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowDownLeft, ArrowUpRight, ChevronRight, CreditCard, Plus, RefreshCw,
    TrendingDown, TrendingUp, Wallet
} from 'lucide-react'
import type { FinDashboard, FinTransaction, FinCategory, FinAccount } from '../../lib/api'
import {
    createFinTransaction, getFinanceDashboard, listFinCategories, listFinAccounts
} from '../../lib/api'

// ── color util ─────────────────────────────────────────────────────────────────
const COLOR_BG: Record<string, string> = {
    orange: 'bg-orange-500/20 text-orange-400',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
    pink: 'bg-pink-500/20 text-pink-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    teal: 'bg-teal-500/20 text-teal-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    gray: 'bg-gray-500/20 text-gray-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    rose: 'bg-rose-500/20 text-rose-400',
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    zinc: 'bg-zinc-500/20 text-zinc-400',
}
function colorBg(c: string | null) { return COLOR_BG[c ?? ''] ?? COLOR_BG.zinc }

function fmt(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function AccountTypeIcon({ type }: { type: string }) {
    if (type === 'cash') return <Wallet size={14} />
    if (type === 'upi') return <CreditCard size={14} />
    return <CreditCard size={14} />
}

// ── Quick Add Modal ─────────────────────────────────────────────────────────────
function QuickAdd({ categories, accounts, onDone, onClose }: {
    categories: FinCategory[]
    accounts: FinAccount[]
    onDone: () => void
    onClose: () => void
}) {
    const [txnType, setTxnType] = useState<'expense' | 'income'>('expense')
    const [amount, setAmount] = useState('')
    const [categoryId, setCategoryId] = useState<number | ''>('')
    const [accountId, setAccountId] = useState<number | ''>(accounts.find(a => a.is_default)?.id ?? '')
    const [notes, setNotes] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('upi')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    const filteredCats = categories.filter(c => c.cat_type === txnType || c.cat_type === 'both')

    async function handleSave() {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Enter a valid amount'); return }
        setSaving(true); setErr('')
        try {
            await createFinTransaction({
                amount: Number(amount),
                txn_type: txnType,
                category_id: categoryId !== '' ? categoryId : undefined,
                account_id: accountId !== '' ? accountId : undefined,
                payment_method: paymentMethod,
                notes: notes || undefined,
            })
            onDone()
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : 'Failed')
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">Add Transaction</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-lg leading-none">&times;</button>
                </div>

                {/* Type toggle */}
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

                {/* Amount */}
                <div>
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                        <span className="text-zinc-400 text-lg font-medium">₹</span>
                        <input autoFocus type="number" inputMode="decimal" placeholder="0"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            className="flex-1 bg-transparent text-2xl font-semibold text-zinc-100 outline-none placeholder:text-zinc-600" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Category</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="">Uncategorized</option>
                            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Account */}
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Account</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="">No account</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    {/* Payment method */}
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

                    {/* Notes */}
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Note</label>
                        <input type="text" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                    </div>
                </div>

                {err && <p className="text-xs text-red-400">{err}</p>}

                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save Transaction'}
                </button>
            </div>
        </div>
    )
}

// ── Transaction row ─────────────────────────────────────────────────────────────
function TxnRow({ t }: { t: FinTransaction }) {
    const isIncome = t.txn_type === 'income'
    return (
        <div className="flex items-center gap-3 py-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorBg(t.category_color)}`}>
                {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{t.category_name ?? (isIncome ? 'Income' : 'Expense')}</p>
                <p className="text-xs text-zinc-500 truncate">{t.notes ?? t.payment_method} · {t.txn_date.slice(0, 10)}</p>
            </div>
            <span className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                {isIncome ? '+' : '-'}{fmt(t.amount)}
            </span>
        </div>
    )
}

// ── Main page ───────────────────────────────────────────────────────────────────
export function FinancePage() {
    const [dash, setDash] = useState<FinDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [categories, setCategories] = useState<FinCategory[]>([])
    const [accounts, setAccounts] = useState<FinAccount[]>([])

    async function load() {
        setLoading(true); setErr('')
        try {
            const [d, cats, accs] = await Promise.all([
                getFinanceDashboard(), listFinCategories(), listFinAccounts()
            ])
            setDash(d); setCategories(cats); setAccounts(accs)
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : 'Load failed')
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    if (loading) return <div className="flex h-64 items-center justify-center text-zinc-500 text-sm">Loading…</div>
    if (err) return (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
            <p className="text-red-400 text-sm">{err}</p>
            <button onClick={load} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
                <RefreshCw size={12} /> Retry
            </button>
        </div>
    )
    if (!dash) return null

    const savingsPositive = dash.this_month_savings >= 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Finance</h1>
                    <p className="text-sm text-zinc-500">Monthly overview</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
                    <Plus size={14} /> Add Transaction
                </button>
            </div>

            {/* Stats — 4 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={13} className="text-zinc-500" />
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Balance</p>
                    </div>
                    <p className="text-2xl font-bold text-zinc-100">{fmt(dash.total_balance)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={13} className="text-green-500" />
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Month Income</p>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{fmt(dash.this_month_income)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown size={13} className="text-red-500" />
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Month Spent</p>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{fmt(dash.this_month_spent)}</p>
                    <p className="text-xs text-zinc-600 mt-1">Today: {fmt(dash.today_spent)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard size={13} className={savingsPositive ? 'text-emerald-500' : 'text-red-500'} />
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Savings Rate</p>
                    </div>
                    <p className={`text-2xl font-bold ${savingsPositive ? 'text-emerald-400' : 'text-red-400'}`}>{dash.savings_rate}%</p>
                    <p className="text-xs text-zinc-600 mt-1">{fmt(Math.abs(dash.this_month_savings))} {savingsPositive ? 'saved' : 'deficit'}</p>
                </div>
            </div>

            {/* Main split — transactions (2/3) + sidebar (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Recent transactions */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Recent Transactions</h2>
                        <Link to="/finance/transactions" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                            See all <ChevronRight size={12} />
                        </Link>
                    </div>
                    {dash.recent_transactions.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 py-16 text-center">
                            <p className="text-zinc-500 text-sm">No transactions yet</p>
                            <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                                Add your first transaction
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 divide-y divide-zinc-800/60">
                            {dash.recent_transactions.map(t => <TxnRow key={t.id} t={t} />)}
                        </div>
                    )}
                </div>

                {/* Right sidebar: Accounts + Quick nav */}
                <div className="space-y-5">
                    {/* Accounts */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Accounts</h2>
                            <Link to="/finance/manage" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                                Manage <ChevronRight size={12} />
                            </Link>
                        </div>
                        {dash.accounts.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-800 py-6 text-center text-xs text-zinc-600">
                                No accounts — <Link to="/finance/manage" className="text-zinc-500 underline">add one</Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dash.accounts.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2.5">
                                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorBg(a.color)}`}>
                                            <AccountTypeIcon type={a.account_type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-200 truncate">{a.name}</p>
                                            <p className="text-xs text-zinc-500 capitalize">{a.account_type}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-zinc-100 shrink-0">{fmt(a.balance)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick links */}
                    <div>
                        <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">Explore</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { to: '/finance/analytics', label: 'Analytics' },
                                { to: '/finance/budgets', label: 'Budgets' },
                                { to: '/finance/goals', label: 'Goals' },
                                { to: '/finance/subscriptions', label: 'Subscriptions' },
                            ].map(l => (
                                <Link key={l.to} to={l.to}
                                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 py-2.5 text-xs text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 transition">
                                    {l.label} <ChevronRight size={10} className="text-zinc-600" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showAdd && (
                <QuickAdd
                    categories={categories}
                    accounts={accounts}
                    onDone={() => { setShowAdd(false); load() }}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </div>
    )
}
