import { useEffect, useState } from 'react'

import { deleteTask, listTasks, updateTask } from '../lib/api'
import type { Task } from '../lib/api'

type EditState = {
    id: number
    title: string
    description: string
    dueDate: string
    priority: 1 | 2 | 3
}

function priorityLabel(p: 1 | 2 | 3) {
    if (p === 1) return 'Low'
    if (p === 2) return 'Medium'
    return 'High'
}

function statusBadge(status: Task['status']) {
    switch (status) {
        case 'done':
            return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20'
        case 'overdue':
            return 'bg-red-500/15 text-red-200 border-red-500/20'
        default:
            return 'bg-zinc-500/10 text-zinc-200 border-zinc-500/20'
    }
}

export function TodoPage() {
    const [view, setView] = useState<'all' | 'today'>('today')
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState<EditState | null>(null)

    async function reload(nextView: 'all' | 'today' = view) {
        setLoading(true)
        setError(null)
        try {
            const data = await listTasks(nextView)
            setTasks(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload(view)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view])

    function startEdit(t: Task) {
        setEditing({
            id: t.id,
            title: t.title,
            description: t.description ?? '',
            dueDate: t.due_date ?? '',
            priority: t.priority,
        })
    }

    async function saveEdit() {
        if (!editing) return
        const title = editing.title.trim()
        if (!title) return

        setLoading(true)
        setError(null)
        try {
            await updateTask(editing.id, {
                title,
                description: editing.description.trim().length > 0 ? editing.description.trim() : null,
                due_date: editing.dueDate.trim().length > 0 ? editing.dueDate : null,
                priority: editing.priority,
            })
            setEditing(null)
            await reload(view)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update task')
        } finally {
            setLoading(false)
        }
    }

    async function toggleComplete(t: Task) {
        setLoading(true)
        setError(null)
        try {
            await updateTask(t.id, { completed: t.completed_at == null })
            await reload(view)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update task')
        } finally {
            setLoading(false)
        }
    }

    async function remove(t: Task) {
        setLoading(true)
        setError(null)
        try {
            await deleteTask(t.id)
            await reload(view)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete task')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between gap-4">
                <div className="text-sm text-zinc-500">{loading ? 'Loading…' : `${tasks.length} task(s)`}</div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/20 p-1">
                        <button
                            type="button"
                            onClick={() => setView('today')}
                            className={`rounded-md px-3 py-1.5 text-sm transition ${view === 'today' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('all')}
                            className={`rounded-md px-3 py-1.5 text-sm transition ${view === 'all' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900'}`}
                        >
                            All
                        </button>
                    </div>
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <section className="space-y-2">
                {tasks.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        {editing?.id === t.id ? (
                            <div className="grid gap-3 md:grid-cols-12">
                                <div className="md:col-span-6">
                                    <label className="text-xs text-zinc-400">Title</label>
                                    <input
                                        value={editing.title}
                                        onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs text-zinc-400">Due date</label>
                                    <input
                                        type="date"
                                        value={editing.dueDate}
                                        onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-zinc-400">Priority</label>
                                    <select
                                        value={editing.priority}
                                        onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) as 1 | 2 | 3 })}
                                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                    >
                                        <option value={1}>Low</option>
                                        <option value={2}>Medium</option>
                                        <option value={3}>High</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1 md:flex md:items-end">
                                    <button
                                        type="button"
                                        disabled={loading || editing.title.trim().length === 0}
                                        onClick={() => void saveEdit()}
                                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-60"
                                    >
                                        Save
                                    </button>
                                </div>

                                <div className="md:col-span-12">
                                    <label className="text-xs text-zinc-400">Notes</label>
                                    <textarea
                                        value={editing.description}
                                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                        rows={2}
                                        className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                                    />
                                </div>

                                <div className="md:col-span-12 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditing(null)}
                                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void toggleComplete(t)}
                                            className={`h-5 w-5 rounded border ${t.completed_at ? 'border-emerald-400 bg-emerald-400/20' : 'border-zinc-600 bg-transparent'} transition`}
                                            aria-label="Toggle complete"
                                        />
                                        <div className={`truncate text-sm font-medium ${t.completed_at ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                                            {t.title}
                                        </div>
                                        <span className={`rounded-md border px-2 py-0.5 text-xs ${statusBadge(t.status)}`}>{t.status}</span>
                                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                            {priorityLabel(t.priority)}
                                        </span>
                                        {t.due_date ? (
                                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
                                                Due {t.due_date}
                                            </span>
                                        ) : null}
                                    </div>
                                    {t.description ? <div className="mt-2 text-sm text-zinc-400">{t.description}</div> : null}
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(t)}
                                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void remove(t)}
                                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {!loading && tasks.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        No tasks yet.
                    </div>
                ) : null}
            </section>
        </div>
    )
}
