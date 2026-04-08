import { useCallback, useEffect, useRef, useState } from 'react'
import { createNote, deleteNote, listNotes, updateNote } from '../lib/api'
import type { ChecklistItem, Note, NoteCreate, NoteType, NoteUpdate } from '../lib/api'

// ── Color palette (Keep-inspired, dark-mode adapted) ─────────────────────────

type ColorKey = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'gray'

const COLORS: Record<ColorKey, { bg: string; border: string; dot: string; label: string }> = {
    default: { bg: 'bg-zinc-900',         border: 'border-zinc-700',        dot: 'bg-zinc-600',        label: 'Default' },
    red:     { bg: 'bg-rose-950/80',       border: 'border-rose-800/50',     dot: 'bg-rose-500',        label: 'Red' },
    orange:  { bg: 'bg-orange-950/80',     border: 'border-orange-800/50',   dot: 'bg-orange-400',      label: 'Orange' },
    yellow:  { bg: 'bg-yellow-950/70',     border: 'border-yellow-800/50',   dot: 'bg-yellow-400',      label: 'Yellow' },
    green:   { bg: 'bg-green-950/80',      border: 'border-green-800/50',    dot: 'bg-green-500',       label: 'Green' },
    teal:    { bg: 'bg-teal-950/80',       border: 'border-teal-800/50',     dot: 'bg-teal-400',        label: 'Teal' },
    blue:    { bg: 'bg-blue-950/80',       border: 'border-blue-800/50',     dot: 'bg-blue-400',        label: 'Blue' },
    indigo:  { bg: 'bg-indigo-950/80',     border: 'border-indigo-800/50',   dot: 'bg-indigo-400',      label: 'Indigo' },
    purple:  { bg: 'bg-purple-950/80',     border: 'border-purple-800/50',   dot: 'bg-purple-500',      label: 'Purple' },
    pink:    { bg: 'bg-pink-950/80',       border: 'border-pink-800/50',     dot: 'bg-pink-500',        label: 'Pink' },
    brown:   { bg: 'bg-stone-900/90',      border: 'border-stone-700/50',    dot: 'bg-stone-500',       label: 'Brown' },
    gray:    { bg: 'bg-zinc-800/90',       border: 'border-zinc-600/50',     dot: 'bg-zinc-400',        label: 'Gray' },
}

function colorStyle(color: string | null | undefined): { bg: string; border: string } {
    return COLORS[(color as ColorKey) ?? 'default'] ?? COLORS.default
}

// ── Checklist helpers ─────────────────────────────────────────────────────────

function parseChecklist(raw: string | null | undefined): ChecklistItem[] {
    if (!raw) return []
    try { return JSON.parse(raw) } catch { return [] }
}

function serializeChecklist(items: ChecklistItem[]): string {
    return JSON.stringify(items)
}

function newItem(text = ''): ChecklistItem {
    return { id: `${Date.now()}-${Math.random()}`, text, checked: false }
}

// ── Small icon buttons ────────────────────────────────────────────────────────

function IconBtn({ title, onClick, children, active }: { title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode; active?: boolean }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:bg-white/10 ${active ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'}`}
        >
            {children}
        </button>
    )
}

// ── Color picker ──────────────────────────────────────────────────────────────

function ColorPicker({ current, onChange }: { current: string | null; onChange: (c: string | null) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            {(Object.keys(COLORS) as ColorKey[]).map((key) => (
                <button
                    key={key}
                    type="button"
                    title={COLORS[key].label}
                    onClick={() => onChange(key === 'default' ? null : key)}
                    className={`h-6 w-6 rounded-full border-2 transition ${COLORS[key].dot} ${(current ?? 'default') === key ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                />
            ))}
        </div>
    )
}

// ── Tag pill ──────────────────────────────────────────────────────────────────

function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
            {tag}
            {onRemove && (
                <button type="button" onClick={onRemove} className="text-zinc-500 hover:text-zinc-200 ml-0.5">×</button>
            )}
        </span>
    )
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
    const [input, setInput] = useState('')
    function commit() {
        const v = input.trim().toLowerCase()
        if (v && !tags.includes(v)) onChange([...tags, v])
        setInput('')
    }
    return (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/60 px-2 py-1.5 min-h-[2.25rem]">
            {tags.map((t) => <TagPill key={t} tag={t} onRemove={() => onChange(tags.filter((x) => x !== t))} />)}
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
                    if (e.key === 'Backspace' && input === '' && tags.length > 0) onChange(tags.slice(0, -1))
                }}
                onBlur={commit}
                placeholder={tags.length === 0 ? 'Add labels…' : ''}
                className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
            />
        </div>
    )
}

// ── Checklist editor ──────────────────────────────────────────────────────────

function ChecklistEditor({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const unchecked = items.filter((i) => !i.checked)
    const checked = items.filter((i) => i.checked)

    function toggle(id: string) {
        onChange(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i))
    }
    function update(id: string, text: string) {
        onChange(items.map((i) => i.id === id ? { ...i, text } : i))
    }
    function remove(id: string) {
        onChange(items.filter((i) => i.id !== id))
    }
    function addItem() {
        const item = newItem()
        onChange([...items, item])
        setTimeout(() => {
            const el = document.getElementById(`checklist-item-${item.id}`)
            el?.focus()
        }, 50)
    }

    return (
        <div className="space-y-1">
            {unchecked.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                    <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggle(item.id)}
                        className="h-4 w-4 shrink-0 rounded accent-zinc-400 cursor-pointer"
                    />
                    <input
                        id={`checklist-item-${item.id}`}
                        type="text"
                        value={item.text}
                        onChange={(e) => update(item.id, e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addItem() }
                            if (e.key === 'Backspace' && item.text === '') { e.preventDefault(); remove(item.id) }
                        }}
                        placeholder="List item"
                        className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    <button type="button" onClick={() => remove(item.id)} className="invisible group-hover:visible text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
                </div>
            ))}

            <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition mt-1"
            >
                <span className="text-lg leading-none">+</span> List item
            </button>

            {checked.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-white/5 pt-2">
                    <div className="text-xs text-zinc-600 mb-1">{checked.length} checked item{checked.length !== 1 ? 's' : ''}</div>
                    {checked.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                            <input
                                type="checkbox"
                                checked={true}
                                onChange={() => toggle(item.id)}
                                className="h-4 w-4 shrink-0 rounded accent-zinc-400 cursor-pointer"
                            />
                            <span className="flex-1 text-sm text-zinc-600 line-through">{item.text}</span>
                            <button type="button" onClick={() => remove(item.id)} className="invisible group-hover:visible text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Note editor modal ─────────────────────────────────────────────────────────

type NoteEditorProps = {
    note: Note | null        // null = creating new
    initialType?: NoteType
    onClose: () => void
    onSave: (id: number | null, data: NoteCreate | NoteUpdate) => Promise<Note>
    onDelete?: (id: number) => Promise<void>
}

function NoteEditor({ note, initialType = 'text', onClose, onSave, onDelete }: NoteEditorProps) {
    const [title, setTitle] = useState(note?.title ?? '')
    const [content, setContent] = useState(note?.content ?? '')
    const [type, setType] = useState<NoteType>(note?.note_type ?? initialType)
    const [items, setItems] = useState<ChecklistItem[]>(() => parseChecklist(note?.checklist_items))
    const [tags, setTags] = useState<string[]>(note?.tags ?? [])
    const [color, setColor] = useState<string | null>(note?.color ?? null)
    const [isPinned, setIsPinned] = useState(note?.is_pinned ?? false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showTagInput, setShowTagInput] = useState(false)
    const [saving, setSaving] = useState(false)

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const doSave = useCallback(async (opts?: { close?: boolean }) => {
        const isEmpty = !title.trim() && !content.trim() && items.length === 0
        if (isEmpty && !note) { onClose(); return }
        setSaving(true)
        try {
            const payload: NoteCreate | NoteUpdate = {
                title: title.trim(),
                content: type === 'text' ? content.trim() : '',
                tags,
                note_type: type,
                checklist_items: type === 'checklist' ? serializeChecklist(items) : null,
                color: color || null,
                is_pinned: isPinned,
            }
            await onSave(note?.id ?? null, payload)
            if (opts?.close) onClose()
        } finally {
            setSaving(false)
        }
    }, [title, content, type, items, tags, color, isPinned, note, onSave, onClose])

    // Autosave on change (edit mode only)
    useEffect(() => {
        if (!note) return
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => { void doSave() }, 1200)
        return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
    }, [title, content, type, items, tags, color, isPinned])  // eslint-disable-line react-hooks/exhaustive-deps

    const { bg, border } = colorStyle(color)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) void doSave({ close: true }) }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => void doSave({ close: true })} />

            <div
                className={`relative w-full max-w-lg rounded-2xl border ${bg} ${border} shadow-2xl flex flex-col max-h-[85vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Pin button top-right */}
                <div className="absolute top-3 right-3 z-10">
                    <IconBtn title={isPinned ? 'Unpin' : 'Pin'} onClick={() => setIsPinned((p) => !p)} active={isPinned}>
                        {isPinned ? '📌' : '📍'}
                    </IconBtn>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Title */}
                    <input
                        autoFocus={!note}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full bg-transparent text-base font-semibold text-zinc-100 outline-none placeholder:text-zinc-500 pr-8"
                    />

                    {/* Content / Checklist */}
                    {type === 'text' ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Take a note…"
                            rows={5}
                            className="w-full resize-none bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                        />
                    ) : (
                        <ChecklistEditor items={items} onChange={setItems} />
                    )}

                    {/* Tags */}
                    {(showTagInput || tags.length > 0) && (
                        <div>
                            <TagInput tags={tags} onChange={setTags} />
                        </div>
                    )}
                </div>

                {/* Bottom toolbar */}
                <div className={`flex items-center justify-between gap-2 px-3 py-2 border-t ${border}`}>
                    <div className="flex items-center gap-0.5">
                        {/* Note type toggle */}
                        <IconBtn
                            title="Checklist"
                            active={type === 'checklist'}
                            onClick={() => setType((t) => t === 'checklist' ? 'text' : 'checklist')}
                        >
                            ☑
                        </IconBtn>

                        {/* Color picker */}
                        <div className="relative">
                            <IconBtn title="Color" onClick={() => setShowColorPicker((s) => !s)}>
                                🎨
                            </IconBtn>
                            {showColorPicker && (
                                <div className="absolute bottom-9 left-0 z-20">
                                    <ColorPicker current={color} onChange={(c) => { setColor(c); setShowColorPicker(false) }} />
                                </div>
                            )}
                        </div>

                        {/* Label */}
                        <IconBtn title="Add label" onClick={() => setShowTagInput((s) => !s)} active={showTagInput || tags.length > 0}>
                            🏷
                        </IconBtn>

                        {/* Delete */}
                        {note && onDelete && (
                            <IconBtn title="Delete" onClick={() => { void onDelete(note.id); onClose() }}>
                                🗑
                            </IconBtn>
                        )}

                        {/* Archive */}
                        {note && (
                            <IconBtn title={note.is_archived ? 'Unarchive' : 'Archive'} onClick={() => {
                                void onSave(note.id, { is_archived: !note.is_archived })
                                onClose()
                            }}>
                                {note.is_archived ? '📤' : '📥'}
                            </IconBtn>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {saving && <span className="text-xs text-zinc-600">Saving…</span>}
                        <button
                            type="button"
                            onClick={() => void doSave({ close: true })}
                            className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/10"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({ note, onClick, onPin, onArchive, onDelete, onColor }: {
    note: Note
    onClick: () => void
    onPin: () => void
    onArchive: () => void
    onDelete: () => void
    onColor: (c: string | null) => void
}) {
    const [showActions, setShowActions] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const { bg, border } = colorStyle(note.color)

    const items = parseChecklist(note.checklist_items)
    const unchecked = items.filter((i) => !i.checked)
    const checkedCount = items.filter((i) => i.checked).length

    return (
        <div
            className={`group relative rounded-2xl border ${bg} ${border} cursor-pointer transition hover:shadow-lg hover:brightness-110 break-inside-avoid mb-3`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowColorPicker(false) }}
            onClick={onClick}
        >
            <div className="p-4 space-y-2">
                {/* Title */}
                {note.title && (
                    <div className="font-semibold text-sm text-zinc-100 leading-snug">{note.title}</div>
                )}

                {/* Content or checklist preview */}
                {note.note_type === 'checklist' ? (
                    <div className="space-y-1">
                        {unchecked.slice(0, 8).map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                                <div className="h-3.5 w-3.5 shrink-0 rounded border border-zinc-500" />
                                <span className="text-xs text-zinc-300 truncate">{item.text}</span>
                            </div>
                        ))}
                        {unchecked.length > 8 && (
                            <div className="text-xs text-zinc-500">+{unchecked.length - 8} more</div>
                        )}
                        {checkedCount > 0 && (
                            <div className="text-xs text-zinc-600 mt-1">{checkedCount} checked</div>
                        )}
                    </div>
                ) : (
                    note.content && (
                        <div className="text-xs text-zinc-400 line-clamp-6 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                        </div>
                    )
                )}

                {/* Tags */}
                {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                        {note.tags.map((t) => (
                            <TagPill key={t} tag={t} />
                        ))}
                    </div>
                )}
            </div>

            {/* Pin badge */}
            {note.is_pinned && (
                <div className="absolute top-2.5 right-2.5 text-sm opacity-60">📌</div>
            )}

            {/* Hover action bar */}
            <div
                className={`absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full border border-zinc-700 bg-zinc-900/90 px-1 py-0.5 shadow transition ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <IconBtn title={note.is_pinned ? 'Unpin' : 'Pin'} onClick={onPin}>
                    {note.is_pinned ? '📌' : '📍'}
                </IconBtn>

                <div className="relative">
                    <IconBtn title="Color" onClick={() => setShowColorPicker((s) => !s)}>🎨</IconBtn>
                    {showColorPicker && (
                        <div className="absolute bottom-9 right-0 z-20" onClick={(e) => e.stopPropagation()}>
                            <ColorPicker current={note.color} onChange={(c) => { onColor(c); setShowColorPicker(false) }} />
                        </div>
                    )}
                </div>

                <IconBtn title={note.is_archived ? 'Unarchive' : 'Archive'} onClick={onArchive}>
                    {note.is_archived ? '📤' : '📥'}
                </IconBtn>

                <IconBtn title="Delete" onClick={onDelete}>🗑</IconBtn>
            </div>
        </div>
    )
}

// ── Quick-create bar ──────────────────────────────────────────────────────────

function QuickCreate({ onOpen }: { onOpen: (type: NoteType) => void }) {
    return (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-md flex items-center justify-between gap-3 cursor-text" onClick={() => onOpen('text')}>
            <span className="text-sm text-zinc-500 select-none">Take a note…</span>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <IconBtn title="New checklist" onClick={() => onOpen('checklist')}>☑</IconBtn>
            </div>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list'

export function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [activeLabel, setActiveLabel] = useState<string | null>(null)
    const [activeColor, setActiveColor] = useState<string | null>(null)
    const [showArchived, setShowArchived] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('grid')

    const [editingNote, setEditingNote] = useState<Note | null | 'new-text' | 'new-checklist'>(null)

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const reload = useCallback(async (q?: string, label?: string | null, color?: string | null, archived?: boolean) => {
        setLoading(true)
        setError(null)
        try {
            const data = await listNotes(q || undefined, label || undefined, color || undefined, archived ?? false)
            setNotes(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load notes')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void reload('', activeLabel, activeColor, showArchived) }, [showArchived])  // eslint-disable-line react-hooks/exhaustive-deps

    function handleSearch(val: string) {
        setSearch(val)
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            void reload(val, activeLabel, activeColor, showArchived)
        }, 250)
    }

    function handleLabelClick(label: string) {
        const next = activeLabel === label ? null : label
        setActiveLabel(next)
        setActiveColor(null)
        void reload(search, next, null, showArchived)
    }

    function handleColorFilter(color: string) {
        const next = activeColor === color ? null : color
        setActiveColor(next)
        void reload(search, activeLabel, next, showArchived)
    }

    function clearFilters() {
        setActiveLabel(null)
        setActiveColor(null)
        setSearch('')
        void reload('', null, null, showArchived)
    }

    async function handleSave(id: number | null, data: NoteCreate | NoteUpdate): Promise<Note> {
        let result: Note
        if (id == null) {
            result = await createNote(data as NoteCreate)
            setNotes((prev) => [result, ...prev])
        } else {
            result = await updateNote(id, data)
            setNotes((prev) => prev.map((n) => n.id === id ? result : n).filter((n) => {
                // Remove from current view if archived status changed
                if (showArchived !== result.is_archived && n.id === result.id) return false
                return true
            }))
        }
        return result
    }

    async function handleDelete(id: number) {
        await deleteNote(id)
        setNotes((prev) => prev.filter((n) => n.id !== id))
    }

    async function handlePin(note: Note) {
        const result = await updateNote(note.id, { is_pinned: !note.is_pinned })
        setNotes((prev) => prev.map((n) => n.id === note.id ? result : n))
    }

    async function handleArchive(note: Note) {
        const result = await updateNote(note.id, { is_archived: !note.is_archived })
        setNotes((prev) => prev.filter((n) => n.id !== note.id).concat(showArchived ? [result] : []))
        void reload(search, activeLabel, activeColor, showArchived)
    }

    async function handleColor(note: Note, color: string | null) {
        const result = await updateNote(note.id, { color: color ?? '' })
        setNotes((prev) => prev.map((n) => n.id === note.id ? result : n))
    }

    // Derive all unique labels from all notes
    const allLabels = [...new Set(notes.flatMap((n) => n.tags))].sort()

    // Split pinned vs others
    const pinned = notes.filter((n) => n.is_pinned)
    const others = notes.filter((n) => !n.is_pinned)

    const colClass = viewMode === 'grid'
        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4'
        : 'columns-1 max-w-xl'

    const hasFilters = !!activeLabel || !!activeColor || !!search

    return (
        <div className="flex gap-5 min-h-0">
            {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
            <aside className="hidden lg:flex w-48 shrink-0 flex-col gap-1">
                <div className="text-xs font-semibold tracking-widest text-zinc-600 px-2 pt-1 pb-2">LABELS</div>

                <button
                    type="button"
                    onClick={() => { setShowArchived(false); clearFilters() }}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${!showArchived && !hasFilters ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                >
                    📝 Notes
                </button>

                {allLabels.map((label) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => { setShowArchived(false); handleLabelClick(label) }}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${activeLabel === label ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                    >
                        🏷 {label}
                    </button>
                ))}

                <div className="mt-2 border-t border-zinc-800 pt-2">
                    <button
                        type="button"
                        onClick={() => { setShowArchived((s) => !s); clearFilters() }}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition w-full ${showArchived ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                    >
                        📥 Archive
                    </button>
                </div>
            </aside>

            {/* ── MAIN AREA ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-4">
                {/* Search + controls */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
                        <input
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search notes…"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-4 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 placeholder:text-zinc-600"
                        />
                        {search && (
                            <button type="button" onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">×</button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setViewMode((v) => v === 'grid' ? 'list' : 'grid')}
                        title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                        className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition hover:bg-zinc-800"
                    >
                        {viewMode === 'grid' ? '≡' : '⊞'}
                    </button>
                </div>

                {/* Color filter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.keys(COLORS) as ColorKey[]).filter((k) => k !== 'default').map((key) => {
                        const hasNotes = notes.some((n) => n.color === key)
                        if (!hasNotes && activeColor !== key) return null
                        return (
                            <button
                                key={key}
                                type="button"
                                title={COLORS[key].label}
                                onClick={() => handleColorFilter(key)}
                                className={`h-5 w-5 rounded-full border-2 transition ${COLORS[key].dot} ${activeColor === key ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                            />
                        )
                    })}
                    {hasFilters && (
                        <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-zinc-300 ml-1 transition">
                            Clear filters
                        </button>
                    )}
                </div>

                {error ? <div className="text-sm text-red-300">{error}</div> : null}

                {/* Archive banner */}
                {showArchived && (
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/40 px-4 py-2">
                        <span className="text-sm text-zinc-400">📥 Archived notes</span>
                        <button type="button" onClick={() => setShowArchived(false)} className="text-xs text-zinc-600 hover:text-zinc-300 ml-auto transition">← Back to notes</button>
                    </div>
                )}

                {/* Quick-create bar */}
                {!showArchived && (
                    <QuickCreate onOpen={(type) => setEditingNote(type === 'text' ? 'new-text' : 'new-checklist')} />
                )}

                {/* Notes grid */}
                {loading && notes.length === 0 ? (
                    <div className="text-sm text-zinc-500">Loading…</div>
                ) : notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-5xl mb-4 opacity-20">📝</div>
                        <div className="text-sm text-zinc-500">
                            {showArchived ? 'No archived notes.' : search || hasFilters ? 'No notes match your search.' : 'Your notes will appear here.'}
                        </div>
                    </div>
                ) : (
                    <>
                        {pinned.length > 0 && (
                            <div>
                                <div className="text-xs font-semibold tracking-widest text-zinc-600 mb-3">PINNED</div>
                                <div className={colClass}>
                                    {pinned.map((note) => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            onClick={() => setEditingNote(note)}
                                            onPin={() => void handlePin(note)}
                                            onArchive={() => void handleArchive(note)}
                                            onDelete={() => void handleDelete(note.id)}
                                            onColor={(c) => void handleColor(note, c)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {others.length > 0 && (
                            <div>
                                {pinned.length > 0 && (
                                    <div className="text-xs font-semibold tracking-widest text-zinc-600 mb-3">OTHERS</div>
                                )}
                                <div className={colClass}>
                                    {others.map((note) => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            onClick={() => setEditingNote(note)}
                                            onPin={() => void handlePin(note)}
                                            onArchive={() => void handleArchive(note)}
                                            onDelete={() => void handleDelete(note.id)}
                                            onColor={(c) => void handleColor(note, c)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── NOTE EDITOR MODAL ────────────────────────────────────── */}
            {editingNote !== null && (
                <NoteEditor
                    note={typeof editingNote === 'object' ? editingNote : null}
                    initialType={editingNote === 'new-checklist' ? 'checklist' : 'text'}
                    onClose={() => setEditingNote(null)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}
        </div>
    )
}
