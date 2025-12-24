import { useState } from 'react'

import { createExpense } from '../lib/api'

type ExpenseQuickAddProps = {
    onCreated: () => void
}

function formatToday() {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export function ExpenseQuickAdd({ onCreated }: ExpenseQuickAddProps) {
    const [amount, setAmount] = useState('')
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    const [spentOn, setSpentOn] = useState(formatToday())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const amt = Number(amount)
        if (!Number.isFinite(amt) || amt <= 0) return
        const cat = category.trim()
        if (!cat) return

        setLoading(true)
        setError(null)
        try {
            await createExpense({
                amount: amt,
                category: cat,
                description: description.trim().length > 0 ? description.trim() : null,
                spent_on: spentOn,
            })
            setAmount('')
            setCategory('')
            setDescription('')
            setSpentOn(formatToday())
            onCreated()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create expense')
        } finally {
            setLoading(false)
        }
    }

    const amountNumber = Number(amount)
    const amountValid = Number.isFinite(amountNumber) && amountNumber > 0

    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                    <label className="text-xs text-zinc-400">Amount</label>
                    <input
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>

                <div className="md:col-span-5">
                    <label className="text-xs text-zinc-400">Category</label>
                    <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Food, Transport…"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="text-xs text-zinc-400">Date</label>
                    <input
                        type="date"
                        value={spentOn}
                        onChange={(e) => setSpentOn(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs text-zinc-400">Description (optional)</label>
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes…"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={loading || !amountValid || category.trim().length === 0}
                    onClick={() => void submit()}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-60"
                >
                    {loading ? 'Adding…' : 'Add expense'}
                </button>
            </div>
        </div>
    )
}
