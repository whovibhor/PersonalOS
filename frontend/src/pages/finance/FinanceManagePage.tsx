import { useEffect, useState } from 'react'
import { CreditCard, Edit2, Plus, Trash2, Wallet } from 'lucide-react'
import type { FinAccount, FinAccountCreate, FinCategory, FinCategoryCreate } from '../../lib/api'
import {
    listFinAccounts, createFinAccount, updateFinAccount, deleteFinAccount,
    listFinCategories, createFinCategory, updateFinCategory, deleteFinCategory,
    seedFinCategories
} from '../../lib/api'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

// ── Color utils ─────────────────────────────────────────────────────────────────
const COLORS = ['blue', 'green', 'red', 'purple', 'orange', 'pink', 'teal', 'indigo', 'rose', 'amber', 'emerald', 'zinc']
const COLOR_BAR: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500', purple: 'bg-purple-500',
    orange: 'bg-orange-500', pink: 'bg-pink-500', teal: 'bg-teal-500', indigo: 'bg-indigo-500',
    rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', zinc: 'bg-zinc-500',
}
const COLOR_BG: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400', green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400', purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400', pink: 'bg-pink-500/20 text-pink-400',
    teal: 'bg-teal-500/20 text-teal-400', indigo: 'bg-indigo-500/20 text-indigo-400',
    rose: 'bg-rose-500/20 text-rose-400', amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400', zinc: 'bg-zinc-500/20 text-zinc-400',
}
function colorBg(c: string | null) { return COLOR_BG[c ?? ''] ?? COLOR_BG.zinc }

// ── Account Modal ──────────────────────────────────────────────────────────────
function AccountModal({ initial, onDone, onClose }: {
    initial?: FinAccount; onDone: () => void; onClose: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [type, setType] = useState(initial?.account_type ?? 'bank')
    const [balance, setBalance] = useState(initial?.balance.toString() ?? '0')
    const [color, setColor] = useState(initial?.color ?? 'blue')
    const [isDefault, setIsDefault] = useState(initial?.is_default ?? false)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function handleSave() {
        if (!name.trim()) { setErr('Name required'); return }
        setSaving(true)
        const payload: FinAccountCreate = { name: name.trim(), account_type: type, balance: Number(balance) || 0, color, is_default: isDefault }
        try {
            if (initial) await updateFinAccount(initial.id, payload)
            else await createFinAccount(payload)
            onDone()
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">{initial ? 'Edit Account' : 'Add Account'}</h2>
                    <button onClick={onClose} className="text-zinc-400 text-xl">&times;</button>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Account name</label>
                    <input type="text" placeholder="e.g. HDFC Savings" value={name} onChange={e => setName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none">
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="upi">UPI Wallet</option>
                            <option value="wallet">Wallet</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Current balance</label>
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                            <span className="text-zinc-400 text-sm">₹</span>
                            <input type="number" value={balance} onChange={e => setBalance(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-semibold text-zinc-100 outline-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`h-5 w-5 rounded-full ${COLOR_BAR[c]} transition ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : 'opacity-50 hover:opacity-100'}`} />
                        ))}
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                        className="rounded border-zinc-600 bg-zinc-800 text-blue-600" />
                    <span className="text-sm text-zinc-300">Set as default account</span>
                </label>

                {err && <p className="text-xs text-red-400">{err}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : initial ? 'Update' : 'Add Account'}
                </button>
            </div>
        </div>
    )
}

// ── Category Modal ─────────────────────────────────────────────────────────────
const ICONS = ['utensils', 'shopping-cart', 'bus', 'home', 'rss', 'shopping-bag', 'tv', 'heart-pulse',
    'book-open', 'zap', 'plane', 'sparkles', 'coffee', 'briefcase', 'laptop', 'users', 'trending-up', 'circle']

function CategoryModal({ initial, onDone, onClose }: {
    initial?: FinCategory; onDone: () => void; onClose: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [catType, setCatType] = useState(initial?.cat_type ?? 'expense')
    const [color, setColor] = useState(initial?.color ?? 'zinc')
    const [icon, setIcon] = useState(initial?.icon ?? 'circle')
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    async function handleSave() {
        if (!name.trim()) { setErr('Name required'); return }
        setSaving(true)
        const payload: FinCategoryCreate = { name: name.trim(), cat_type: catType, color, icon }
        try {
            if (initial) await updateFinCategory(initial.id, payload)
            else await createFinCategory(payload)
            onDone()
        } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); setSaving(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-100">{initial ? 'Edit Category' : 'Add Category'}</h2>
                    <button onClick={onClose} className="text-zinc-400 text-xl">&times;</button>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Category name</label>
                    <input type="text" placeholder="e.g. Coffee" value={name} onChange={e => setName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                    <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                        {(['expense', 'income', 'both'] as const).map(t => (
                            <button key={t} onClick={() => setCatType(t)}
                                className={`flex-1 py-1.5 text-xs font-medium transition ${catType === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`h-5 w-5 rounded-full ${COLOR_BAR[c]} transition ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : 'opacity-50 hover:opacity-100'}`} />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Icon name (lucide)</label>
                    <div className="flex gap-2 flex-wrap">
                        {ICONS.map(ic => (
                            <button key={ic} onClick={() => setIcon(ic)}
                                className={`rounded px-2 py-1 text-xs transition ${icon === ic ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                                {ic}
                            </button>
                        ))}
                    </div>
                </div>

                {err && <p className="text-xs text-red-400">{err}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : initial ? 'Update' : 'Add Category'}
                </button>
            </div>
        </div>
    )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function FinanceManagePage() {
    const [accounts, setAccounts] = useState<FinAccount[]>([])
    const [categories, setCategories] = useState<FinCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [showAccModal, setShowAccModal] = useState(false)
    const [editAcc, setEditAcc] = useState<FinAccount | null>(null)
    const [showCatModal, setShowCatModal] = useState(false)
    const [editCat, setEditCat] = useState<FinCategory | null>(null)
    const [activeTab, setActiveTab] = useState<'accounts' | 'categories'>('accounts')
    const [seeding, setSeeding] = useState(false)
    const [seedMsg, setSeedMsg] = useState('')

    async function load() {
        setLoading(true)
        try {
            const [accs, cats] = await Promise.all([listFinAccounts(), listFinCategories()])
            setAccounts(accs); setCategories(cats)
        } finally { setLoading(false) }
    }
    useEffect(() => { load() }, []) // eslint-disable-line

    async function handleDeleteAcc(id: number) {
        if (!confirm('Delete this account? Transactions will remain.')) return
        await deleteFinAccount(id)
        setAccounts(prev => prev.filter(a => a.id !== id))
    }

    async function handleDeleteCat(id: number) {
        await deleteFinCategory(id).catch(() => alert("Can't delete default category"))
        setCategories(prev => prev.filter(c => c.id !== id))
    }

    async function handleSeed() {
        setSeeding(true); setSeedMsg('')
        try {
            const r = await seedFinCategories()
            setSeedMsg(r.message ?? `Seeded ${r.seeded} categories`)
            await load()
        } catch (e: unknown) {
            setSeedMsg(e instanceof Error ? e.message : 'Failed')
        } finally { setSeeding(false) }
    }

    const expenseCats = categories.filter(c => c.cat_type === 'expense' || c.cat_type === 'both')
    const incomeCats = categories.filter(c => c.cat_type === 'income')

    return (
        <div className="space-y-6">
            {/* Header + tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Manage Finance</h1>
                    <p className="text-sm text-zinc-500">Accounts and categories</p>
                </div>
                <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                    {(['accounts', 'categories'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium transition capitalize ${activeTab === tab ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
            ) : activeTab === 'accounts' ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">{accounts.length} Account{accounts.length !== 1 ? 's' : ''}</p>
                        <button onClick={() => setShowAccModal(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition">
                            <Plus size={12} /> Add Account
                        </button>
                    </div>

                    {accounts.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 py-12 text-center">
                            <p className="text-zinc-500 text-sm">No accounts yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {accounts.map(a => (
                                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorBg(a.color)}`}>
                                        {a.account_type === 'cash' ? <Wallet size={15} /> : <CreditCard size={15} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-200 truncate">
                                            {a.name} {a.is_default && <span className="text-xs text-zinc-500">(default)</span>}
                                        </p>
                                        <p className="text-xs text-zinc-500 capitalize">{a.account_type}</p>
                                    </div>
                                    <p className="text-sm font-bold text-zinc-100 shrink-0">{fmt(a.balance)}</p>
                                    <button onClick={() => setEditAcc(a)} className="text-zinc-600 hover:text-zinc-300 transition">
                                        <Edit2 size={13} />
                                    </button>
                                    <button onClick={() => handleDeleteAcc(a.id)} className="text-zinc-600 hover:text-red-400 transition">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">{categories.length} Categories</p>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSeed} disabled={seeding}
                                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition">
                                {seeding ? 'Seeding…' : 'Seed Defaults'}
                            </button>
                            <button onClick={() => setShowCatModal(true)}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition">
                                <Plus size={12} /> Add
                            </button>
                        </div>
                    </div>
                    {seedMsg && <p className="text-xs text-zinc-400 bg-zinc-800 rounded px-3 py-2">{seedMsg}</p>}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Expense categories */}
                        {expenseCats.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Expense ({expenseCats.length})</p>
                                <div className="space-y-1.5">
                                    {expenseCats.map(c => (
                                        <div key={c.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 py-2">
                                            <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_BAR[c.color] ?? 'bg-zinc-500'}`} />
                                            <p className="flex-1 text-sm text-zinc-300 truncate">{c.name}</p>
                                            {!c.is_default && (
                                                <>
                                                    <button onClick={() => setEditCat(c)} className="text-zinc-600 hover:text-zinc-300 transition"><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteCat(c.id)} className="text-zinc-600 hover:text-red-400 transition"><Trash2 size={12} /></button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Income categories */}
                        {incomeCats.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Income ({incomeCats.length})</p>
                                <div className="space-y-1.5">
                                    {incomeCats.map(c => (
                                        <div key={c.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/20 px-3 py-2">
                                            <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_BAR[c.color] ?? 'bg-zinc-500'}`} />
                                            <p className="flex-1 text-sm text-zinc-300 truncate">{c.name}</p>
                                            {!c.is_default && (
                                                <>
                                                    <button onClick={() => setEditCat(c)} className="text-zinc-600 hover:text-zinc-300 transition"><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteCat(c.id)} className="text-zinc-600 hover:text-red-400 transition"><Trash2 size={12} /></button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAccModal && <AccountModal onDone={() => { setShowAccModal(false); load() }} onClose={() => setShowAccModal(false)} />}
            {editAcc && <AccountModal initial={editAcc} onDone={() => { setEditAcc(null); load() }} onClose={() => setEditAcc(null)} />}
            {showCatModal && <CategoryModal onDone={() => { setShowCatModal(false); load() }} onClose={() => setShowCatModal(false)} />}
            {editCat && <CategoryModal initial={editCat} onDone={() => { setEditCat(null); load() }} onClose={() => setEditCat(null)} />}
        </div>
    )
}
