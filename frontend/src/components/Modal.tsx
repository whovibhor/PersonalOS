import { useEffect } from 'react'
import type { ReactNode } from 'react'

type ModalProps = {
    open: boolean
    title: string
    children: ReactNode
    onClose: () => void
    maxWidthClassName?: string
}

export function Modal({ open, title, children, onClose, maxWidthClassName }: ModalProps) {
    useEffect(() => {
        if (!open) return

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
                <div
                    className={`${maxWidthClassName ?? 'w-[min(720px,calc(100%-2rem))]'} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]`}
                >
                    <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/40 px-5 py-4">
                            <div className="text-sm font-semibold">{title}</div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                            >
                                Close
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
