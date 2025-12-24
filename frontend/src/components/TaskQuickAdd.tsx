import { useState } from 'react'

import { createTask } from '../lib/api'

type TaskQuickAddProps = {
    onCreated: () => void
}

export function TaskQuickAdd({ onCreated }: TaskQuickAddProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [priority, setPriority] = useState<1 | 2 | 3>(2)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const t = title.trim()
        if (!t) return

        setLoading(true)
        setError(null)
        try {
            await createTask({
                title: t,
                description: description.trim().length > 0 ? description.trim() : undefined,
                due_date: dueDate.trim().length > 0 ? dueDate : undefined,
                priority,
            })
            setTitle('')
            setDescription('')
            setDueDate('')
            setPriority(2)
            onCreated()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create task')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-7">
                    <label className="text-xs text-zinc-400">Title</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void submit()
                        }}
                        placeholder="Add a task…"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="text-xs text-zinc-400">Due date</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="text-xs text-zinc-400">Priority</label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    >
                        <option value={1}>Low</option>
                        <option value={2}>Medium</option>
                        <option value={3}>High</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-xs text-zinc-400">Notes (optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional details…"
                    className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={loading || title.trim().length === 0}
                    onClick={() => void submit()}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-60"
                >
                    {loading ? 'Adding…' : 'Add task'}
                </button>
            </div>
        </div>
    )
}
