import { useEffect, useMemo, useState } from 'react'

import { listFinanceHistory } from '../../lib/api'
import type { FinanceAuditLog } from '../../lib/api'

function fmtWhen(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString()
}

function badgeClass(action: string) {
    if (action === 'created') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    if (action === 'updated') return 'border-blue-500/30 bg-blue-500/10 text-blue-100'
    if (action === 'deleted') return 'border-red-500/30 bg-red-500/10 text-red-100'
    return 'border-zinc-700 bg-zinc-900/40 text-zinc-200'
}

function IconRefresh({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M21 12a9 9 0 0 1-15.3 6.3" />
            <path d="M3 12a9 9 0 0 1 15.3-6.3" />
            <path d="M6 18v-4H2" />
            <path d="M18 6v4h4" />
        </svg>
    )
}

export function ExpenseHistoryPage() {
    const [rows, setRows] = useState<FinanceAuditLog[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            const data = await listFinanceHistory({ limit: 100, offset: 0 })
            setRows(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load history')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const grouped = useMemo(() => rows, [rows])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">History</div>
                    <div className="text-sm text-zinc-500">All creates/edits/deletes in Net Worth</div>
                </div>

                <button
                    type="button"
                    onClick={() => void reload()}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                >
                    <IconRefresh className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="space-y-2">
                {grouped.map((r) => (
                    <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-md border px-2 py-0.5 text-xs ${badgeClass(r.action)}`}>{r.action}</span>
                                    <span className="text-sm font-medium text-zinc-100">{r.entity_type}</span>
                                    <span className="text-xs text-zinc-500">#{r.entity_id ?? '—'}</span>
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">{fmtWhen(r.created_at)}</div>
                            </div>
                        </div>

                        {(r.before_json || r.after_json) ? (
                            <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                <summary className="cursor-pointer text-sm text-zinc-300 hover:text-zinc-50">View details</summary>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div>
                                        <div className="text-xs font-semibold tracking-wide text-zinc-400">Before</div>
                                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">{r.before_json ?? '—'}</pre>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold tracking-wide text-zinc-400">After</div>
                                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">{r.after_json ?? '—'}</pre>
                                    </div>
                                </div>
                            </details>
                        ) : null}
                    </div>
                ))}

                {!loading && grouped.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        No history yet.
                    </div>
                ) : null}

                {loading ? <div className="text-sm text-zinc-500">Loading…</div> : null}
            </div>
        </div>
    )
}
