import { useEffect, useMemo, useState } from 'react'

import { ExpenseQuickAdd } from '../components/ExpenseQuickAdd'
import { Modal } from '../components/Modal'
import { listExpenses } from '../lib/api'
import type { Expense } from '../lib/api'

function money(amount: number) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)

    const total = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0), [expenses])

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            const data = await listExpenses()
            setExpenses(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load expenses')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="text-sm text-zinc-500">
                    {loading ? 'Loading…' : `${expenses.length} expense(s) · Total ${money(total)}`}
                </div>

                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                >
                    Add expense
                </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <section className="space-y-2">
                {expenses.map((e) => (
                    <div key={e.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-medium text-zinc-100">{money(e.amount)}</div>
                                    <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                        {e.category}
                                    </span>
                                    <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                        {e.spent_on}
                                    </span>
                                </div>
                                {e.description ? <div className="mt-2 text-sm text-zinc-400">{e.description}</div> : null}
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && expenses.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        No expenses yet.
                    </div>
                ) : null}
            </section>

            <Modal open={adding} title="Add expense" onClose={() => setAdding(false)}>
                <ExpenseQuickAdd
                    onCreated={() => {
                        setAdding(false)
                        void reload()
                    }}
                />
            </Modal>
        </div>
    )
}
