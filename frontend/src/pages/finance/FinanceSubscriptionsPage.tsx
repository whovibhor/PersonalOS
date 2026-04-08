import { useEffect, useState } from 'react'
import { Bell, Plus, Trash2 } from 'lucide-react'
import type { FinSubscription, FinSubscriptionCreate, FinCategory } from '../../lib/api'
import {
    listFinSubscriptions, createFinSubscription, updateFinSubscription,
    deleteFinSubscription, listFinCategories
} from '../../lib/api'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }
function fmtDec(n: number) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function urgencyColor(days: number) {
    if (days <= 3) return 'text-red-400 bg-red-500/10 border-red-800/40'
    if (days <= 7) return 'text-yellow-400 bg-yellow-500/10 border-yellow-800/40'
    return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40'
}

function SubModal({ initial, categories, onDone, onClose }: {
    initial?: FinSubscription; categories: FinCategory[]
    onDone: () => void; onClose: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [amount, setAmount] = useState(initial?.amount.toString() ?? '')
    const [cycle, setCycle] = useState(initial?.billing_cycle ?? 'monthly')
    const [nextDate, setNextDate] = useState(initial?.next_billing_date ?? new Date().toISOString().slice(0, 10))
    const [categoryId, setCategoryId] = useState<number | ''>(initial?.category_id ?? '')
    const [notes, setNotes] = useState(initial?.notes ?? '')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function handleSave() {
        if (!name.trim()) { setErr('Name required'); return }
        if (!amount || Number(amount) <= 0) { setErr('Amount required'); return }
        setSaving(true)
        const payload: FinSubscriptionCreate = {
            name: name.trim(), amount: Number(amount), billing_cycle: cycle,
            next_billing_date: nextDate,
            category_id: categoryId !== '' ? categoryId : undefined,
            notes: notes || undefined,
        }
        try {
            if (initial) await updateFinSubscription(initial.id, payload)
            else await createFinSubscription(payload)
            onDone()
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">{initial ? 'Edit Subscription' : 'Add Subscription'}</h2>
                    <button onClick={onClose} className="text-zinc-400 text-xl">&times;</button>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Service name</label>
                    <input type="text" placeholder="e.g. Netflix, Spotify" value={name} onChange={e => setName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Amount</label>
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                            <span className="text-zinc-400 text-sm">₹</span>
                            <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-semibold text-zinc-100 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Billing cycle</label>
                        <select value={cycle} onChange={e => setCycle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Next billing date</label>
                        <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Category</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="">None</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Notes (optional)</label>
                    <input type="text" placeholder="e.g. Family plan" value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                {err && <p className="text-xs text-red-400">{err}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : initial ? 'Update' : 'Add Subscription'}
                </button>
            </div>
        </div>
    )
}

export function FinanceSubscriptionsPage() {
    const [subs, setSubs] = useState<FinSubscription[]>([])
    const [categories, setCategories] = useState<FinCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editSub, setEditSub] = useState<FinSubscription | null>(null)

    async function load() {
        setLoading(true)
        try {
            const [s, cats] = await Promise.all([listFinSubscriptions(), listFinCategories()])
            setSubs(s); setCategories(cats)
        } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    async function handleDelete(id: number) {
        if (!confirm('Delete this subscription?')) return
        await deleteFinSubscription(id)
        setSubs(prev => prev.filter(s => s.id !== id))
    }

    const totalMonthly = subs.filter(s => s.is_active).reduce((sum, s) => sum + s.monthly_equivalent, 0)

    const dueSoon = subs.filter(s => s.is_active && s.days_until <= 7).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Subscriptions</h1>
                    <p className="text-sm text-zinc-500">Recurring payments tracker</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
                    <Plus size={14} /> Add
                </button>
            </div>

            {/* Stats — 3 cards */}
            {subs.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Monthly Cost</p>
                        <p className="text-2xl font-bold text-zinc-100 mt-1">{fmtDec(totalMonthly)}</p>
                        <p className="text-xs text-zinc-600 mt-1">per month</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Yearly Cost</p>
                        <p className="text-2xl font-bold text-zinc-100 mt-1">{fmt(totalMonthly * 12)}</p>
                        <p className="text-xs text-zinc-600 mt-1">per year</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Due Soon</p>
                        <p className={`text-2xl font-bold mt-1 ${dueSoon > 0 ? 'text-yellow-400' : 'text-zinc-100'}`}>{dueSoon}</p>
                        <p className="text-xs text-zinc-600 mt-1">within 7 days</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
            ) : subs.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 py-20 text-center">
                    <Bell size={36} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No subscriptions tracked</p>
                    <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                        Add first subscription
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {subs.map(s => (
                        <div key={s.id}
                            className={`rounded-xl border p-4 cursor-pointer hover:border-zinc-600 transition ${urgencyColor(s.days_until)}`}
                            onClick={() => setEditSub(s)}>
                            <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-zinc-200 truncate">{s.name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {s.category_name ?? 'Uncategorized'} · {s.billing_cycle}
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-zinc-100">{fmtDec(s.amount)}</p>
                                        <p className="text-xs text-zinc-500">{fmtDec(s.monthly_equivalent)}/mo</p>
                                    </div>
                                    <button onClick={() => handleDelete(s.id)} className="text-zinc-600 hover:text-red-400 transition mt-0.5">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5">
                                <Bell size={11} />
                                <span className="text-xs">
                                    {s.days_until < 0
                                        ? 'Overdue'
                                        : s.days_until === 0
                                            ? 'Due today'
                                            : `${s.days_until}d until billing`}
                                </span>
                                <span className="text-xs text-zinc-600">· {s.next_billing_date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <SubModal categories={categories}
                    onDone={() => { setShowModal(false); load() }} onClose={() => setShowModal(false)} />
            )}
            {editSub && (
                <SubModal initial={editSub} categories={categories}
                    onDone={() => { setEditSub(null); load() }} onClose={() => setEditSub(null)} />
            )}
        </div>
    )
}
