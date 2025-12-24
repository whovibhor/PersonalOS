import { useEffect, useMemo, useState } from 'react'

import { Modal } from '../components/Modal'

type Note = {
    id: string
    title: string
    content: string
    createdAt: string
}

const STORAGE_KEY = 'personalos.notes.v1'

function loadNotes(): Note[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) return []
        return parsed.filter(Boolean) as Note[]
    } catch {
        return []
    }
}

function saveNotes(notes: Note[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [adding, setAdding] = useState(false)

    const countLabel = useMemo(() => `${notes.length} note(s)`, [notes.length])

    useEffect(() => {
        setNotes(loadNotes())
    }, [])

    function add() {
        const t = title.trim()
        const c = content.trim()
        if (!t && !c) return

        const next: Note = {
            id: makeId(),
            title: t.length > 0 ? t : 'Untitled',
            content: c,
            createdAt: new Date().toISOString(),
        }
        const updated = [next, ...notes]
        setNotes(updated)
        saveNotes(updated)
        setTitle('')
        setContent('')
        setAdding(false)
    }

    function remove(noteId: string) {
        const updated = notes.filter((n) => n.id !== noteId)
        setNotes(updated)
        saveNotes(updated)
    }

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between gap-4">
                <div className="text-sm text-zinc-500">{countLabel}</div>

                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                >
                    Add note
                </button>
            </div>

            <section className="space-y-2">
                {notes.map((n) => (
                    <div key={n.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-zinc-100">{n.title}</div>
                                {n.content ? <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{n.content}</div> : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(n.id)}
                                className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}

                {notes.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-10 text-center text-sm text-zinc-500">
                        No notes yet.
                    </div>
                ) : null}
            </section>

            <Modal open={adding} title="Add note" onClose={() => setAdding(false)}>
                <div className="grid gap-3">
                    <div>
                        <label className="text-xs text-zinc-400">Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="New note…"
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

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={add}
                            disabled={title.trim().length === 0 && content.trim().length === 0}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800 disabled:opacity-60"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
