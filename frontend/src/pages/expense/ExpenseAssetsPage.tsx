import { useEffect, useState } from 'react'

import { Modal } from '../../components/Modal'
import {
    createFinanceAsset,
    createFinanceLiability,
    listFinanceAssets,
    listFinanceLiabilities,
    updateFinanceAsset,
} from '../../lib/api'
import type { FinanceAsset, FinanceAssetCreate, FinanceLiability, FinanceLiabilityCreate } from '../../lib/api'

function money(n: number) {
    return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function ExpenseAssetsPage() {
    const [assets, setAssets] = useState<FinanceAsset[]>([])
    const [liabilities, setLiabilities] = useState<FinanceLiability[]>([])
    const [error, setError] = useState<string | null>(null)

    const [view, setView] = useState<'assets' | 'debts'>('assets')

    const [addingAsset, setAddingAsset] = useState(false)
    const [addingLiability, setAddingLiability] = useState(false)

    const [assetForm, setAssetForm] = useState<FinanceAssetCreate>({
        name: 'HDFC Bank',
        asset_type: 'bank',
        asset_subtype: null,
        currency: 'INR',
        balance: 0,
        is_primary: true,
        notes: null,
    })

    const [liabilityForm, setLiabilityForm] = useState<FinanceLiabilityCreate>({
        name: 'Credit Card',
        liability_type: 'credit_card',
        balance: 0,
        credit_limit: null,
        due_day: null,
        minimum_payment: null,
        emi_amount: null,
        interest_rate: null,
        tenure_months_left: null,
        notes: null,
    })

    async function reload() {
        setError(null)
        try {
            const [a, l] = await Promise.all([listFinanceAssets(), listFinanceLiabilities()])
            setAssets(a)
            setLiabilities(l)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load assets')
        }
    }

    useEffect(() => {
        void reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function setPrimary(assetId: number) {
        try {
            await updateFinanceAsset(assetId, { is_primary: true })
            await reload()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to set primary')
        }
    }

    const totalAssets = assets.reduce((s, a) => s + Number(a.balance), 0)
    const totalDebts = liabilities.reduce((s, l) => s + Number(l.balance), 0)
    const netWorth = totalAssets - totalDebts

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-1">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setView('assets')}
                            className={
                                `rounded-lg px-3 py-2 text-sm transition ` +
                                (view === 'assets' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50')
                            }
                        >
                            Assets <span className="ml-2 text-xs text-zinc-400">{money(totalAssets)}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('debts')}
                            className={
                                `rounded-lg px-3 py-2 text-sm transition ` +
                                (view === 'debts' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50')
                            }
                        >
                            Debts <span className="ml-2 text-xs text-zinc-400">{money(totalDebts)}</span>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => (view === 'assets' ? setAddingAsset(true) : setAddingLiability(true))}
                    className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-sm text-zinc-50 transition hover:bg-blue-600/30"
                >
                    {view === 'assets' ? '+ Add Asset' : '+ Add Debt'}
                </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 text-center">
                    <div className="text-xs text-zinc-400">Total assets</div>
                    <div className="mt-1 text-2xl font-semibold">{money(totalAssets)}</div>
                </div>
                <div className="md:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 text-center">
                    <div className="text-xs text-zinc-400">Total liabilities</div>
                    <div className="mt-1 text-2xl font-semibold">{money(totalDebts)}</div>
                </div>
                <div className="md:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 text-center">
                    <div className="text-xs text-zinc-400">Net worth</div>
                    <div className="mt-1 text-2xl font-semibold">
                        {money(netWorth)}
                    </div>
                </div>
            </div>

            {view === 'assets' ? (
                <div className="grid gap-3 md:grid-cols-2">
                    {assets.map((a) => (
                        <div key={a.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 transition hover:border-blue-500/40">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-xl">🏦</div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-zinc-100">{a.name}</div>
                                            <div className="mt-1 text-xs text-zinc-500">{a.asset_type} • {a.currency}</div>
                                        </div>
                                    </div>
                                    {a.is_primary ? <div className="mt-3 inline-flex rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200">Primary</div> : null}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-semibold">{money(Number(a.balance))}</div>
                                    {!a.is_primary ? (
                                        <button
                                            type="button"
                                            onClick={() => void setPrimary(a.id)}
                                            className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900"
                                        >
                                            Set Primary
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                    {assets.length === 0 ? <div className="text-sm text-zinc-500">No assets yet.</div> : null}
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {liabilities.map((l) => (
                        <div key={l.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 transition hover:border-blue-500/40">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-xl">💳</div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-zinc-100">{l.name}</div>
                                            <div className="mt-1 text-xs text-zinc-500">{l.liability_type}{l.due_day ? ` • Due ${l.due_day}` : ''}</div>
                                        </div>
                                    </div>
                                    {l.credit_limit ? <div className="mt-3 text-xs text-zinc-500">Limit: {money(Number(l.credit_limit))}</div> : null}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-semibold text-red-200">{money(Number(l.balance))}</div>
                                    {l.minimum_payment ? <div className="mt-2 text-xs text-zinc-500">Min: {money(Number(l.minimum_payment))}</div> : null}
                                </div>
                            </div>
                        </div>
                    ))}
                    {liabilities.length === 0 ? <div className="text-sm text-zinc-500">No debts yet.</div> : null}
                </div>
            )}

            <Modal open={addingAsset} title="Add Asset" onClose={() => setAddingAsset(false)}>
                <div className="space-y-3">
                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Name</div>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={assetForm.name} onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Type</div>
                            <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={assetForm.asset_type} onChange={(e) => setAssetForm((f) => ({ ...f, asset_type: e.target.value }))} />
                        </label>
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Balance</div>
                            <input type="number" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={assetForm.balance} onChange={(e) => setAssetForm((f) => ({ ...f, balance: Number(e.target.value) }))} />
                        </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                        <input type="checkbox" checked={assetForm.is_primary} onChange={(e) => setAssetForm((f) => ({ ...f, is_primary: e.target.checked }))} />
                        Set as primary account
                    </label>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setAddingAsset(false)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900">Cancel</button>
                        <button
                            type="button"
                            onClick={() => {
                                setError(null)
                                createFinanceAsset(assetForm)
                                    .then(() => reload())
                                    .then(() => setAddingAsset(false))
                                    .catch((e) => setError(e instanceof Error ? e.message : 'Failed to create asset'))
                            }}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal open={addingLiability} title="Add Liability" onClose={() => setAddingLiability(false)}>
                <div className="space-y-3">
                    <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Name</div>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={liabilityForm.name} onChange={(e) => setLiabilityForm((f) => ({ ...f, name: e.target.value }))} />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Type</div>
                            <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={liabilityForm.liability_type} onChange={(e) => setLiabilityForm((f) => ({ ...f, liability_type: e.target.value }))} />
                        </label>
                        <label className="block">
                            <div className="mb-1 text-xs text-zinc-400">Balance</div>
                            <input type="number" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={liabilityForm.balance} onChange={(e) => setLiabilityForm((f) => ({ ...f, balance: Number(e.target.value) }))} />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setAddingLiability(false)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900">Cancel</button>
                        <button
                            type="button"
                            onClick={() => {
                                setError(null)
                                createFinanceLiability(liabilityForm)
                                    .then(() => reload())
                                    .then(() => setAddingLiability(false))
                                    .catch((e) => setError(e instanceof Error ? e.message : 'Failed to create liability'))
                            }}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
