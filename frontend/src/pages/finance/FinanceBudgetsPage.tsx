import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FinBudget, FinCategory } from '../../lib/api'
import { listFinBudgets, upsertFinBudget, deleteFinBudget, listFinCategories } from '../../lib/api'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

function pctColor(pct: number) {
    if (pct >= 100) return 'bg-red-500'
    if (pct >= 80) return 'bg-yellow-500'
    if (pct >= 50) return 'bg-blue-500'
    return 'bg-green-500'
}
function pctTextColor(pct: number) {
    if (pct >= 100) return 'text-red-400'
    if (pct >= 80) return 'text-yellow-400'
    return 'text-zinc-400'
}

function BudgetModal({ categories, year, month, existing, onDone, onClose }: {
    categories: FinCategory[]; year: number; month: number
    existing?: FinBudget; onDone: () => void; onClose: () => void
}) {
    const [categoryId, setCategoryId] = useState<number | ''>(existing?.category_id ?? '')
    const [amount, setAmount] = useState(existing?.amount.toString() ?? '')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function handleSave() {
        if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount'); return }
        setSaving(true)
        try {
            await upsertFinBudget({ year, month, category_id: categoryId !== '' ? categoryId : undefined, amount: Number(amount) })
            onDone()
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">Set Budget</h2>
                    <button onClick={onClose} className="text-zinc-400 text-xl">&times;</button>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Category (empty = Total budget)</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                        <option value="">Total (all expenses)</option>
                        {categories.filter(c => c.cat_type === 'expense' || c.cat_type === 'both')
                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Budget amount</label>
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                        <span className="text-zinc-400">₹</span>
                        <input autoFocus type="number" inputMode="decimal" placeholder="0"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            className="flex-1 bg-transparent text-lg font-semibold text-zinc-100 outline-none placeholder:text-zinc-600" />
                    </div>
                </div>
                {err && <p className="text-xs text-red-400">{err}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save Budget'}
                </button>
            </div>
        </div>
    )
}

export function FinanceBudgetsPage() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [budgets, setBudgets] = useState<FinBudget[]>([])
    const [categories, setCategories] = useState<FinCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    async function load() {
        setLoading(true)
        try {
            const [b, cats] = await Promise.all([listFinBudgets(year, month), listFinCategories()])
            setBudgets(b); setCategories(cats)
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [year, month]) // eslint-disable-line

    async function handleDelete(id: number) {
        if (!confirm('Remove this budget?')) return
        await deleteFinBudget(id)
        setBudgets(prev => prev.filter(b => b.id !== id))
    }

    function prevMonth() {
        if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
    }
    function nextMonth() {
        if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
    }

    const totalBudget = budgets.find(b => !b.category_id)
    const catBudgets = budgets.filter(b => b.category_id)

    return (
        <div className="space-y-6">
            {/* Header + month nav */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Budgets</h1>
                    <p className="text-sm text-zinc-500">Track spending limits by category</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1">
                        <button onClick={prevMonth} className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition">&lt;</button>
                        <span className="text-sm font-medium text-zinc-300 min-w-[5rem] text-center">{MONTHS[month-1]} {year}</span>
                        <button onClick={nextMonth} className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition">&gt;</button>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
                        <Plus size={14} /> Set Budget
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
            ) : budgets.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 py-20 text-center">
                    <p className="text-zinc-500 text-sm">No budgets set for {MONTHS[month-1]} {year}</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                        Set your first budget
                    </button>
                </div>
            ) : (
                <>
                    {/* Stats strip */}
                    {totalBudget && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Budget</p>
                                <p className="text-2xl font-bold text-zinc-100 mt-1">{fmt(totalBudget.amount)}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">Spent</p>
                                <p className={`text-2xl font-bold mt-1 ${pctTextColor(totalBudget.pct)}`}>{fmt(totalBudget.spent)}</p>
                                <p className="text-xs text-zinc-600 mt-1">{totalBudget.pct}% used</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">Remaining</p>
                                <p className={`text-2xl font-bold mt-1 ${totalBudget.amount - totalBudget.spent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {fmt(Math.abs(totalBudget.amount - totalBudget.spent))}
                                </p>
                                {totalBudget.pct >= 100 && <p className="text-xs text-red-400 mt-1">Over budget</p>}
                            </div>
                        </div>
                    )}

                    {/* Main split */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left: Category budgets 2-col grid */}
                        <div className="lg:col-span-2">
                            {catBudgets.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-xs text-zinc-600">
                                    No category budgets — <button onClick={() => setShowModal(true)} className="text-zinc-500 underline">add one</button>
                                </div>
                            ) : (
                                <div>
                                    <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">Category Budgets</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {catBudgets.map(b => (
                                            <div key={b.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-200">{b.category_name}</p>
                                                        <p className="text-xs text-zinc-500 mt-0.5">{fmt(b.spent)} / {fmt(b.amount)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-bold ${pctTextColor(b.pct)}`}>{b.pct}%</span>
                                                        <button onClick={() => handleDelete(b.id)} className="text-zinc-600 hover:text-red-400 transition">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="h-2 rounded-full bg-zinc-800">
                                                    <div className={`h-full rounded-full transition-all ${pctColor(b.pct)}`}
                                                        style={{ width: `${Math.min(b.pct, 100)}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Total budget progress */}
                        {totalBudget && (
                            <div className="space-y-4">
                                <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Overall Progress</h2>
                                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/50 p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-zinc-200">Total Budget</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xl font-bold ${pctTextColor(totalBudget.pct)}`}>{totalBudget.pct}%</span>
                                            <button onClick={() => handleDelete(totalBudget.id)} className="text-zinc-600 hover:text-red-400 transition">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-4 rounded-full bg-zinc-800 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${pctColor(totalBudget.pct)}`}
                                            style={{ width: `${Math.min(totalBudget.pct, 100)}%` }} />
                                    </div>
                                    <div className="space-y-1.5 text-xs text-zinc-500">
                                        <div className="flex justify-between">
                                            <span>Spent</span><span className="text-zinc-300">{fmt(totalBudget.spent)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Budget</span><span className="text-zinc-300">{fmt(totalBudget.amount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Remaining</span>
                                            <span className={totalBudget.amount - totalBudget.spent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                {fmt(Math.abs(totalBudget.amount - totalBudget.spent))}
                                            </span>
                                        </div>
                                    </div>
                                    {totalBudget.pct >= 80 && (
                                        <p className={`text-xs rounded-lg px-3 py-2 ${totalBudget.pct >= 100 ? 'bg-red-950/40 text-red-400' : 'bg-yellow-950/40 text-yellow-400'}`}>
                                            {totalBudget.pct >= 100
                                                ? `Over budget by ${fmt(totalBudget.spent - totalBudget.amount)}`
                                                : `${fmt(totalBudget.amount - totalBudget.spent)} remaining`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {showModal && (
                <BudgetModal categories={categories} year={year} month={month}
                    onDone={() => { setShowModal(false); load() }}
                    onClose={() => setShowModal(false)} />
            )}
        </div>
    )
}
