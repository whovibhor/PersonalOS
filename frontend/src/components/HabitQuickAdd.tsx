import { useState } from 'react'

import { createHabit } from '../lib/api'

type HabitQuickAddProps = {
    onCreated: () => void
}

export function HabitQuickAdd({ onCreated }: HabitQuickAddProps) {
    const [name, setName] = useState('')
    const [frequency, setFrequency] = useState('daily')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        const n = name.trim()
        if (!n) return

        setLoading(true)
        setError(null)
        try {
            await createHabit({ name: n, frequency: frequency.trim().length > 0 ? frequency.trim() : 'daily' })
            setName('')
            setFrequency('daily')
            onCreated()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create habit')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-8">
                    <label className="text-xs text-zinc-400">Name</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void submit()
                        }}
                        placeholder="New habit…"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>

                <div className="md:col-span-4">
                    <label className="text-xs text-zinc-400">Frequency</label>
                    <input
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        placeholder="daily / weekly / 3x week"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={loading || name.trim().length === 0}
                    onClick={() => void submit()}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-60"
                >
                    {loading ? 'Adding…' : 'Add habit'}
                </button>
            </div>
        </div>
    )
}
