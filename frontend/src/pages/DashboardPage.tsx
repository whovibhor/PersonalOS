import { useEffect, useState } from 'react'

import { listTasks } from '../lib/api'
import type { Task } from '../lib/api'

export function DashboardPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function run() {
            setLoading(true)
            setError(null)
            try {
                const data = await listTasks('today')
                if (!cancelled) setTasks(data.slice(0, 6))
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tasks')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-sm font-medium">To‑Do</div>
                    <div className="mt-1 text-xs text-zinc-400">Today + overdue</div>
                    <div className="mt-4 text-2xl font-semibold">{loading ? '…' : tasks.length}</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-sm font-medium">Habits</div>
                    <div className="mt-1 text-xs text-zinc-400">Coming next</div>
                    <div className="mt-4 text-sm text-zinc-500">Not implemented yet</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="text-sm font-medium">Analytics</div>
                    <div className="mt-1 text-xs text-zinc-400">Coming later</div>
                    <div className="mt-4 text-sm text-zinc-500">Not implemented yet</div>
                </div>
            </div>

            <section>
                <div>
                    <div className="text-sm font-semibold">Today’s tasks</div>
                    <div className="mt-1 text-xs text-zinc-400">Your to-do list is the hero.</div>
                </div>

                <div className="mt-4 space-y-2">
                    {error ? <div className="text-sm text-red-300">{error}</div> : null}
                    {tasks.map((t) => (
                        <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <div className="truncate text-sm text-zinc-100">{t.title}</div>
                            <div className="mt-1 text-xs text-zinc-500">
                                {t.status.toUpperCase()} • Priority {t.priority}
                                {t.due_date ? ` • Due ${t.due_date}` : ''}
                            </div>
                        </div>
                    ))}
                    {!loading && !error && tasks.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
                            No tasks for today.
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    )
}
