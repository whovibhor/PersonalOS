import { useEffect, useState } from 'react'

import { Modal } from '../../components/Modal'
import { createFinanceGoal, listFinanceGoals, updateFinanceGoal } from '../../lib/api'
import type { FinanceGoal, FinanceGoalCreate, FinanceGoalUpdate } from '../../lib/api'

function money(n: number) {
    return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function ExpenseGoalsPage() {
    const [goals, setGoals] = useState<FinanceGoal[]>([])
    const [error, setError] = useState<string | null>(null)

    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<FinanceGoalCreate>({
        name: 'Emergency Fund',
        description: '',
        target_amount: 500000,
        category: 'Savings',
        target_date: null,
        is_active: true,
    })

    async function reload() {
        setError(null)
        try {
            const g = await listFinanceGoals(false)
            setGoals(g)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load goals')
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function submit() {
        setError(null)
        try {
            await createFinanceGoal(form)
            setOpen(false)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create goal')
        }
    }

    async function addProgress(goal: FinanceGoal, delta: number) {
        const payload: FinanceGoalUpdate = { current_amount: Number(goal.current_amount) + delta }
        await updateFinanceGoal(goal.id, payload)
        await reload()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Goals</div>
                    <div className="mt-1 text-sm text-zinc-500">Savings goals tracked automatically (and editable)</div>
                </div>
                <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800">
                    Add goal
                </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="grid gap-3 md:grid-cols-2">
                {goals.map((g) => {
                    const pct = g.target_amount ? Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)) : 0
                    return (
                        <div key={g.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-zinc-100">{g.name}</div>
                                    <div className="mt-1 text-xs text-zinc-500">{money(Number(g.current_amount))} / {money(Number(g.target_amount))}</div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                                        <div className="h-full bg-blue-500/60" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-300">{pct}%</div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => void addProgress(g, 1000).catch(() => undefined)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900">+₹1k</button>
                                <button type="button" onClick={() => void addProgress(g, 5000).catch(() => undefined)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900">+₹5k</button>
                            </div>
                        </div>
                    )
                })}
                {goals.length === 0 ? <div className="text-sm text-zinc-500">No goals yet.</div> : null}
            </div>

            <Modal open={open} title="Add Goal" onClose={() => setOpen(false)}>
                <div className="space-y-3">
                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Name</div>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Target amount</div>
                        <input type="number" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: Number(e.target.value) }))} />
                    </label>
                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Category</div>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={form.category ?? ''} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                    </label>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900">Cancel</button>
                        <button type="button" onClick={() => void submit()} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800">Create</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
