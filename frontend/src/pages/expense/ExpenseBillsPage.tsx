import { useEffect, useMemo, useState } from 'react'

import {
    createFinanceRecurring,
    listFinanceAssets,
    listFinanceOccurrences,
    listFinanceRecurring,
    postFinanceOccurrence,
    updateFinanceRecurring,
    type FinanceAsset,
    type FinanceOccurrence,
    type FinanceRecurringCreate,
    type FinanceRecurringRule,
} from '../../lib/api'
import { Modal } from '../../components/Modal'
import { FINANCE_TAGS } from './financeTags'

const TAG_STYLES = [
    'border-blue-500/30 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15',
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15',
    'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15',
    'border-violet-500/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15',
    'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15',
    'border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15',
] as const

function tagStyle(tag: string) {
    let h = 0
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
    return TAG_STYLES[h % TAG_STYLES.length]
}

function money(n: number) {
    const sign = n < 0 ? '-' : ''
    return `${sign}₹${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function isoLocalDate(d: Date) {
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ExpenseBillsPage() {
    const [assets, setAssets] = useState<FinanceAsset[]>([])
    const [rules, setRules] = useState<FinanceRecurringRule[]>([])
    const [occurrences, setOccurrences] = useState<FinanceOccurrence[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<FinanceRecurringRule | null>(null)
    const [form, setForm] = useState<FinanceRecurringCreate>(() => ({
        name: '',
        txn_type: 'expense',
        amount: 0,
        category: '',
        description: '',
        schedule: 'monthly',
        day_of_month: new Date().getDate(),
        day_of_week: null,
        next_due_date: isoLocalDate(new Date()),
        auto_create: false,
        is_active: true,
        asset_id: null,
        liability_id: null,
    }))

    const [editForm, setEditForm] = useState<FinanceRecurringCreate>(() => ({
        name: '',
        txn_type: 'expense',
        amount: 0,
        category: '',
        description: '',
        schedule: 'monthly',
        day_of_month: new Date().getDate(),
        day_of_week: null,
        next_due_date: isoLocalDate(new Date()),
        auto_create: false,
        is_active: true,
        asset_id: null,
        liability_id: null,
    }))

    const upcoming = useMemo(() => occurrences.filter((o) => o.status === 'pending'), [occurrences])
    const posted = useMemo(() => occurrences.filter((o) => o.status !== 'pending'), [occurrences])

    async function reload() {
        setLoading(true)
        setError(null)
        try {
            const [a, r, o] = await Promise.all([listFinanceAssets(), listFinanceRecurring(), listFinanceOccurrences()])
            setAssets(a)
            setRules(r)
            setOccurrences(o)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load bills')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function submit() {
        setError(null)
        try {
            const payload: FinanceRecurringCreate = {
                ...form,
                txn_type: 'expense',
                amount: Number(form.amount),
                day_of_month: form.schedule === 'monthly' ? (form.day_of_month ?? null) : null,
                day_of_week: form.schedule === 'weekly' ? (form.day_of_week ?? null) : null,
                next_due_date: String(form.next_due_date),
                asset_id: form.asset_id ? Number(form.asset_id) : null,
                liability_id: null,
                category: String(form.category ?? ''),
                name: String(form.name ?? ''),
            }
            await createFinanceRecurring(payload)
            setOpen(false)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create bill')
        }
    }

    function openEditRule(r: FinanceRecurringRule) {
        setEditing(r)
        setEditForm({
            name: r.name,
            txn_type: 'expense',
            amount: Number(r.amount),
            category: r.category,
            description: r.description ?? '',
            schedule: r.schedule as any,
            day_of_month: r.day_of_month ?? null,
            day_of_week: r.day_of_week ?? null,
            next_due_date: String(r.next_due_date),
            auto_create: Boolean(r.auto_create),
            is_active: Boolean(r.is_active),
            asset_id: r.asset_id ?? null,
            liability_id: null,
        })
    }

    async function submitEdit() {
        if (!editing) return
        setError(null)
        try {
            await updateFinanceRecurring(editing.id, {
                ...editForm,
                txn_type: 'expense',
                amount: Number(editForm.amount),
                day_of_month: editForm.schedule === 'monthly' ? (editForm.day_of_month ?? null) : null,
                day_of_week: editForm.schedule === 'weekly' ? (editForm.day_of_week ?? null) : null,
                next_due_date: String(editForm.next_due_date),
                asset_id: editForm.asset_id ? Number(editForm.asset_id) : null,
                liability_id: null,
                category: String(editForm.category ?? ''),
                name: String(editForm.name ?? ''),
            })
            setEditing(null)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update bill')
        }
    }

    async function post(occurrenceId: number) {
        setError(null)
        try {
            await postFinanceOccurrence(occurrenceId)
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to post bill')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Bills</div>
                    <div className="mt-1 text-sm text-zinc-500">Recurring bills/EMIs and due occurrences</div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                    >
                        + Add Bill
                    </button>
                </div>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <section className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Upcoming</div>
                        <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${upcoming.length} pending`}</div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">Post creates a real expense transaction and generates the next occurrence.</div>
                    <div className="mt-3 space-y-2">
                        {upcoming.map((o) => (
                            <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="truncate text-sm text-zinc-100">{o.name ?? 'Bill'}</div>
                                    <div className="mt-0.5 text-xs text-zinc-500">Due {o.due_date}{o.category ? ` • ${o.category}` : ''}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-semibold text-zinc-50">{money(Number(o.amount ?? 0))}</div>
                                    <button
                                        type="button"
                                        onClick={() => void post(o.id)}
                                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!loading && upcoming.length === 0 ? <div className="text-sm text-zinc-500">No pending bills.</div> : null}
                    </div>
                </div>

                <div className="md:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Rules</div>
                        <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${rules.length} rules`}</div>
                    </div>
                    <div className="mt-3 space-y-2">
                        {rules.map((r) => (
                            <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-zinc-100">{r.name}</div>
                                        <div className="mt-0.5 text-xs text-zinc-500">
                                            {r.schedule} • Next {r.next_due_date}{r.category ? ` • ${r.category}` : ''}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-zinc-50">{money(Number(r.amount))}</div>
                                        <button
                                            type="button"
                                            onClick={() => openEditRule(r)}
                                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!loading && rules.length === 0 ? <div className="text-sm text-zinc-500">No bills yet.</div> : null}
                    </div>
                </div>
            </section>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5">
                <div className="text-sm font-semibold">Posted (recent)</div>
                <div className="mt-3 space-y-2">
                    {posted.slice(-10).reverse().map((o) => (
                        <div key={o.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                            <div className="min-w-0">
                                <div className="truncate text-sm text-zinc-100">{o.name ?? 'Bill'}</div>
                                <div className="mt-0.5 text-xs text-zinc-500">{o.due_date}{o.category ? ` • ${o.category}` : ''}</div>
                            </div>
                            <div className="text-xs text-zinc-400">{o.status}</div>
                        </div>
                    ))}
                    {!loading && posted.length === 0 ? <div className="text-sm text-zinc-500">No posted bills yet.</div> : null}
                </div>
            </div>

            <Modal open={open} title="Add Bill" onClose={() => setOpen(false)}>
                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Name</div>
                            <input
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                        </label>
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Amount (₹)</div>
                            <input
                                type="number"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.amount}
                                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                            />
                        </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Schedule</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.schedule}
                                onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value as any }))}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="daily">Daily</option>
                            </select>
                        </label>

                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Next due date</div>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.next_due_date}
                                onChange={(e) => setForm((f) => ({ ...f, next_due_date: e.target.value }))}
                            />
                        </label>
                    </div>

                    {form.schedule === 'monthly' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Day of month</div>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.day_of_month ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, day_of_month: e.target.value ? Number(e.target.value) : null }))}
                            />
                        </label>
                    ) : null}

                    {form.schedule === 'weekly' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Day of week (0=Mon … 6=Sun)</div>
                            <input
                                type="number"
                                min={0}
                                max={6}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={form.day_of_week ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value ? Number(e.target.value) : null }))}
                            />
                        </label>
                    ) : null}

                    <div>
                        <div className="mb-1 text-xs text-zinc-400">Tag</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                            placeholder="Select a tag below or type your own"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {FINANCE_TAGS.map((t) => {
                                const selected = String(form.category || '') === t
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, category: t }))}
                                        className={
                                            `rounded-full border px-3 py-1 text-xs transition ` +
                                            (selected
                                                ? `ring-2 ring-zinc-100/40 ${tagStyle(t)}`
                                                : tagStyle(t))
                                        }
                                    >
                                        {t}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Description</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.description ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Pay from account</div>
                        <select
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={form.asset_id ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, asset_id: e.target.value ? Number(e.target.value) : null }))}
                        >
                            <option value="">Primary Account</option>
                            {assets.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}{a.is_primary ? ' (primary)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <div>
                            <div className="text-sm text-zinc-100">Active</div>
                            <div className="text-xs text-zinc-500">Include in upcoming list</div>
                        </div>
                        <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void submit()}
                            className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal open={!!editing} title="Edit Bill" onClose={() => setEditing(null)}>
                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Name</div>
                            <input
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            />
                        </label>
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Amount (₹)</div>
                            <input
                                type="number"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={editForm.amount}
                                onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                            />
                        </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Schedule</div>
                            <select
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={editForm.schedule}
                                onChange={(e) => setEditForm((f) => ({ ...f, schedule: e.target.value as any }))}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="daily">Daily</option>
                            </select>
                        </label>

                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Next due date</div>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={editForm.next_due_date}
                                onChange={(e) => setEditForm((f) => ({ ...f, next_due_date: e.target.value }))}
                            />
                        </label>
                    </div>

                    {editForm.schedule === 'monthly' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Day of month</div>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={editForm.day_of_month ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, day_of_month: e.target.value ? Number(e.target.value) : null }))}
                            />
                        </label>
                    ) : null}

                    {editForm.schedule === 'weekly' ? (
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Day of week (0=Mon … 6=Sun)</div>
                            <input
                                type="number"
                                min={0}
                                max={6}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                                value={editForm.day_of_week ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, day_of_week: e.target.value ? Number(e.target.value) : null }))}
                            />
                        </label>
                    ) : null}

                    <div>
                        <div className="mb-1 text-xs text-zinc-400">Tag</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={editForm.category}
                            onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                            placeholder="Select a tag below or type your own"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {FINANCE_TAGS.map((t) => {
                                const selected = String(editForm.category || '') === t
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setEditForm((f) => ({ ...f, category: t }))}
                                        className={
                                            `rounded-full border px-3 py-1 text-xs transition ` +
                                            (selected
                                                ? `ring-2 ring-zinc-100/40 ${tagStyle(t)}`
                                                : tagStyle(t))
                                        }
                                    >
                                        {t}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Description</div>
                        <input
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={editForm.description ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Pay from account</div>
                        <select
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                            value={editForm.asset_id ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, asset_id: e.target.value ? Number(e.target.value) : null }))}
                        >
                            <option value="">Primary Account</option>
                            {assets.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}{a.is_primary ? ' (primary)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <div>
                            <div className="text-sm text-zinc-100">Active</div>
                            <div className="text-xs text-zinc-500">Include in upcoming list</div>
                        </div>
                        <input type="checkbox" checked={Boolean(editForm.is_active)} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} />
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void submitEdit()}
                            className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
