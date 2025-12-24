import { useEffect, useState } from 'react'

import { HabitQuickAdd } from '../components/HabitQuickAdd'
import { Modal } from '../components/Modal'
import { listHabits } from '../lib/api'
import type { Habit } from '../lib/api'

export function HabitsPage() {
    const [habits, setHabits] = useState<Habit[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            const data = await listHabits()
            setHabits(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load habits')
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
            <div className="flex items-end justify-between gap-4">
                <div className="text-sm text-zinc-500">{loading ? 'Loading…' : `${habits.length} habit(s)`}</div>

                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                >
                    Add habit
                </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <section className="space-y-2">
                {habits.map((h) => (
                    <div key={h.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-zinc-100">{h.name}</div>
                                <div className="mt-1 text-sm text-zinc-400">Frequency: {h.frequency}</div>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && habits.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        No habits yet.
                    </div>
                ) : null}
            </section>

            <Modal open={adding} title="Add habit" onClose={() => setAdding(false)}>
                <HabitQuickAdd
                    onCreated={() => {
                        setAdding(false)
                        void reload()
                    }}
                />
            </Modal>
        </div>
    )
}
