import { useEffect, useRef, useState } from 'react'

import { Modal } from '../components/Modal'
import { createNote, deleteNote, listNotes, updateNote } from '../lib/api'
import type { Note } from '../lib/api'

// ─── Tag pill ────────────────────────────────────────────────────────────────

function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            {tag}
            {onRemove && (
                <button type="button" onClick={onRemove} className="ml-0.5 text-zinc-500 hover:text-zinc-200">
                    ×
                </button>
            )}
        </span>
    )
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
    const [input, setInput] = useState('')

    function commit() {
        const val = input.trim().toLowerCase()
        if (val && !tags.includes(val)) {
            onChange([...tags, val])
        }
        setInput('')
    }

    return (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 min-h-[2.25rem]">
            {tags.map((t) => (
                <TagPill key={t} tag={t} onRemove={() => onChange(tags.filter((x) => x !== t))} />
            ))}
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        commit()
                    }
                    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
                        onChange(tags.slice(0, -1))
                    }
                }}
                onBlur={commit}
                placeholder={tags.length === 0 ? 'Add tags… (Enter or comma)' : ''}
                className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
            />
        </div>
    )
}

// ─── Note form (create / edit) ────────────────────────────────────────────────

type NoteFormProps = {
    initialTitle?: string
    initialContent?: string
    initialTags?: string[]
    submitLabel: string
    onSubmit: (title: string, content: string, tags: string[]) => Promise<void>
    onCancel: () => void
}

function NoteForm({ initialTitle = '', initialContent = '', initialTags = [], submitLabel, onSubmit, onCancel }: NoteFormProps) {
    const [title, setTitle] = useState(initialTitle)
    const [content, setContent] = useState(initialContent)
    const [tags, setTags] = useState<string[]>(initialTags)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit() {
        setSaving(true)
        setError(null)
        try {
            await onSubmit(title, content, tags)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const disabled = title.trim().length === 0 && content.trim().length === 0

    return (
        <div className="grid gap-3">
            <div>
                <label className="text-xs text-zinc-400">Title</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title…"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>

            <div>
                <label className="text-xs text-zinc-400">Content</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write something…"
                    rows={6}
                    className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
            </div>

            <div>
                <label className="text-xs text-zinc-400">Tags</label>
                <div className="mt-1">
                    <TagInput tags={tags} onChange={setTags} />
                </div>
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled || saving}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : submitLabel}
                </button>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)

    const [adding, setAdding] = useState(false)
    const [editing, setEditing] = useState<Note | null>(null)

    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    async function reload(q?: string, tag?: string | null) {
        setLoading(true)
        setError(null)
        try {
            const data = await listNotes(q || undefined, tag || undefined)
            setNotes(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load notes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
    }, [])

    // Debounced search
    function handleSearch(val: string) {
        setSearch(val)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            void reload(val, activeTag)
        }, 300)
    }

    function handleTagFilter(tag: string) {
        const next = activeTag === tag ? null : tag
        setActiveTag(next)
        void reload(search, next)
    }

    async function handleCreate(title: string, content: string, tags: string[]) {
        await createNote({ title, content, tags })
        setAdding(false)
        void reload(search, activeTag)
    }

    async function handleEdit(title: string, content: string, tags: string[]) {
        if (!editing) return
        await updateNote(editing.id, { title, content, tags })
        setEditing(null)
        void reload(search, activeTag)
    }

    async function handleDelete(noteId: number) {
        await deleteNote(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }

    // Collect all unique tags from current notes for the filter bar
    const allTags = [...new Set(notes.flatMap((n) => n.tags))].sort()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div className="text-sm text-zinc-500">
                    {loading ? 'Loading…' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
                </div>
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                >
                    Add note
                </button>
            </div>

            {/* Search */}
            <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search notes…"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />

            {/* Tag filter bar */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagFilter(tag)}
                            className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                                activeTag === tag
                                    ? 'bg-zinc-200 text-zinc-900'
                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                    {activeTag && (
                        <button
                            type="button"
                            onClick={() => handleTagFilter(activeTag)}
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                            Clear filter
                        </button>
                    )}
                </div>
            )}

            {error && <div className="text-sm text-red-300">{error}</div>}

            {/* Notes list */}
            <section className="space-y-2">
                {notes.map((n) => (
                    <div key={n.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-zinc-100">{n.title || 'Untitled'}</div>
                                {n.content && (
                                    <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-400">
                                        {n.content}
                                    </div>
                                )}
                                {n.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {n.tags.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => handleTagFilter(t)}
                                                className="cursor-pointer"
                                            >
                                                <TagPill tag={t} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-2 text-xs text-zinc-600">
                                    {new Date(n.updated_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(n)}
                                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleDelete(n.id)}
                                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && notes.length === 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        {search || activeTag ? 'No notes match your search.' : 'No notes yet.'}
                    </div>
                )}
            </section>

            {/* Create modal */}
            <Modal open={adding} title="New note" onClose={() => setAdding(false)}>
                <NoteForm
                    submitLabel="Add"
                    onSubmit={handleCreate}
                    onCancel={() => setAdding(false)}
                />
            </Modal>

            {/* Edit modal */}
            <Modal open={editing !== null} title="Edit note" onClose={() => setEditing(null)}>
                {editing && (
                    <NoteForm
                        initialTitle={editing.title}
                        initialContent={editing.content}
                        initialTags={editing.tags}
                        submitLabel="Save"
                        onSubmit={handleEdit}
                        onCancel={() => setEditing(null)}
                    />
                )}
            </Modal>
        </div>
    )
}
