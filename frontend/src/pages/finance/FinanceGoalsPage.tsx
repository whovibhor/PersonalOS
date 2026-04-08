import { useEffect, useState } from 'react'
import { Plus, Target, Trash2 } from 'lucide-react'
import type { FinGoal, FinGoalCreate } from '../../lib/api'
import { listFinGoals, createFinGoal, updateFinGoal, deleteFinGoal, addToFinGoal } from '../../lib/api'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

const GOAL_COLORS = ['blue', 'green', 'purple', 'orange', 'pink', 'teal', 'indigo', 'rose', 'amber']

const COLOR_BG: Record<string, string> = {
    blue: 'bg-blue-500/20', green: 'bg-green-500/20', purple: 'bg-purple-500/20',
    orange: 'bg-orange-500/20', pink: 'bg-pink-500/20', teal: 'bg-teal-500/20',
    indigo: 'bg-indigo-500/20', rose: 'bg-rose-500/20', amber: 'bg-amber-500/20',
}
const COLOR_BAR: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500',
    orange: 'bg-orange-500', pink: 'bg-pink-500', teal: 'bg-teal-500',
    indigo: 'bg-indigo-500', rose: 'bg-rose-500', amber: 'bg-amber-500',
}
const COLOR_TEXT: Record<string, string> = {
    blue: 'text-blue-400', green: 'text-green-400', purple: 'text-purple-400',
    orange: 'text-orange-400', pink: 'text-pink-400', teal: 'text-teal-400',
    indigo: 'text-indigo-400', rose: 'text-rose-400', amber: 'text-amber-400',
}

function GoalModal({ initial, onDone, onClose }: {
    initial?: FinGoal; onDone: () => void; onClose: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [target, setTarget] = useState(initial?.target_amount.toString() ?? '')
    const [current, setCurrent] = useState(initial?.current_amount.toString() ?? '0')
    const [targetDate, setTargetDate] = useState(initial?.target_date ?? '')
    const [notes, setNotes] = useState(initial?.notes ?? '')
    const [color, setColor] = useState(initial?.color ?? 'blue')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function handleSave() {
        if (!name.trim()) { setErr('Goal name is required'); return }
        if (!target || Number(target) <= 0) { setErr('Target amount is required'); return }
        setSaving(true)
        const payload: FinGoalCreate = {
            name: name.trim(), target_amount: Number(target),
            current_amount: Number(current) || 0,
            target_date: targetDate || undefined,
            notes: notes || undefined,
            color,
        }
        try {
            if (initial) await updateFinGoal(initial.id, payload)
            else await createFinGoal(payload)
            onDone()
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">{initial ? 'Edit Goal' : 'New Goal'}</h2>
                    <button onClick={onClose} className="text-zinc-400 text-xl">&times;</button>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Goal name</label>
                    <input type="text" placeholder="e.g. New Laptop" value={name} onChange={e => setName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Target amount</label>
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                            <span className="text-zinc-400 text-sm">₹</span>
                            <input type="number" placeholder="0" value={target} onChange={e => setTarget(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-semibold text-zinc-100 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Already saved</label>
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                            <span className="text-zinc-400 text-sm">₹</span>
                            <input type="number" placeholder="0" value={current} onChange={e => setCurrent(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-zinc-100 outline-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Target date (optional)</label>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none" />
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {GOAL_COLORS.map(c => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`h-6 w-6 rounded-full ${COLOR_BAR[c]} transition ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : 'opacity-60 hover:opacity-100'}`} />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Notes (optional)</label>
                    <input type="text" placeholder="e.g. Gaming laptop for college" value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                {err && <p className="text-xs text-red-400">{err}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : initial ? 'Update Goal' : 'Create Goal'}
                </button>
            </div>
        </div>
    )
}

function AddFundsModal({ goal, onDone, onClose }: { goal: FinGoal; onDone: () => void; onClose: () => void }) {
    const [amount, setAmount] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleAdd() {
        if (!amount || Number(amount) <= 0) return
        setSaving(true)
        try { await addToFinGoal(goal.id, Number(amount)); onDone() }
        catch { setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <h2 className="font-semibold text-zinc-100">Add to "{goal.name}"</h2>
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                    <span className="text-zinc-400 text-lg">₹</span>
                    <input autoFocus type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                        className="flex-1 bg-transparent text-2xl font-semibold text-zinc-100 outline-none" />
                </div>
                <button onClick={handleAdd} disabled={saving}
                    className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition">
                    {saving ? 'Adding…' : 'Add Funds'}
                </button>
                <button onClick={onClose} className="w-full text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
            </div>
        </div>
    )
}

export function FinanceGoalsPage() {
    const [goals, setGoals] = useState<FinGoal[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [editGoal, setEditGoal] = useState<FinGoal | null>(null)
    const [addFundsGoal, setAddFundsGoal] = useState<FinGoal | null>(null)

    async function load() {
        setLoading(true)
        try { setGoals(await listFinGoals()) } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    async function handleDelete(id: number) {
        if (!confirm('Archive this goal?')) return
        await deleteFinGoal(id)
        setGoals(prev => prev.filter(g => g.id !== id))
    }

    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Goals</h1>
                    <p className="text-sm text-zinc-500">Saving targets and milestones</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
                    <Plus size={14} /> New Goal
                </button>
            </div>

            {/* Stats — 3 cards */}
            {goals.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Goals</p>
                        <p className="text-2xl font-bold text-zinc-100 mt-1">{goals.length}</p>
                        <p className="text-xs text-zinc-600 mt-1">{goals.filter(g => g.pct >= 100).length} completed</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Saved</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">{fmt(totalSaved)}</p>
                        <p className="text-xs text-zinc-600 mt-1">across all goals</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Overall</p>
                        <p className="text-2xl font-bold text-zinc-100 mt-1">
                            {totalTarget > 0 ? Math.round(totalSaved / totalTarget * 100) : 0}%
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">of {fmt(totalTarget)} target</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
            ) : goals.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 py-20 text-center">
                    <Target size={36} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No goals yet</p>
                    <button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                        Create your first goal
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {goals.map(g => (
                        <div key={g.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 cursor-pointer hover:border-zinc-700 transition"
                            onClick={() => setEditGoal(g)}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${COLOR_BG[g.color] ?? 'bg-zinc-700'}`}>
                                        <Target size={18} className={COLOR_TEXT[g.color] ?? 'text-zinc-400'} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-100">{g.name}</p>
                                        {g.notes && <p className="text-xs text-zinc-500 mt-0.5">{g.notes}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setAddFundsGoal(g)}
                                        className="rounded-lg bg-green-600/20 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 transition">
                                        + Add
                                    </button>
                                    <button onClick={() => handleDelete(g.id)} className="text-zinc-600 hover:text-red-400 transition">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className={COLOR_TEXT[g.color] ?? 'text-blue-400'}>{g.pct}%</span>
                                    <span className="text-zinc-500">{fmt(g.current_amount)} / {fmt(g.target_amount)}</span>
                                </div>
                                <div className="h-2 rounded-full bg-zinc-800">
                                    <div className={`h-full rounded-full ${COLOR_BAR[g.color] ?? 'bg-blue-500'} transition-all`}
                                        style={{ width: `${Math.min(g.pct, 100)}%` }} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>{fmt(g.target_amount - g.current_amount)} to go</span>
                                {g.days_left != null && g.days_left > 0 && (
                                    <span>{g.days_left}d left {g.daily_needed ? `· ₹${g.daily_needed}/day` : ''}</span>
                                )}
                                {g.days_left != null && g.days_left <= 0 && (
                                    <span className="text-red-400">Deadline passed</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <GoalModal onDone={() => { setShowCreate(false); load() }} onClose={() => setShowCreate(false)} />
            )}
            {editGoal && (
                <GoalModal initial={editGoal}
                    onDone={() => { setEditGoal(null); load() }} onClose={() => setEditGoal(null)} />
            )}
            {addFundsGoal && (
                <AddFundsModal goal={addFundsGoal}
                    onDone={() => { setAddFundsGoal(null); load() }} onClose={() => setAddFundsGoal(null)} />
            )}
        </div>
    )
}
