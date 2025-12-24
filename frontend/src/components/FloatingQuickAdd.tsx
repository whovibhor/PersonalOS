import { useCallback, useMemo, useState } from 'react'

import { Modal } from './Modal'
import { ExpenseQuickAdd } from './ExpenseQuickAdd.tsx'
import { HabitQuickAdd } from './HabitQuickAdd.tsx'
import { TaskQuickAdd } from './TaskQuickAdd'

type Feature = 'task' | 'habit' | 'expense'

type FloatingQuickAddProps = {
    onTaskCreated: () => void
}

export function FloatingQuickAdd({ onTaskCreated }: FloatingQuickAddProps) {
    const [open, setOpen] = useState(false)
    const [feature, setFeature] = useState<Feature | null>(null)

    const title = useMemo(() => {
        if (!feature) return 'Quick add'
        if (feature === 'task') return 'Quick add: Task'
        if (feature === 'habit') return 'Quick add: Habit'
        return 'Quick add: Expense'
    }, [feature])

    const close = useCallback(() => {
        setOpen(false)
        setFeature(null)
    }, [])

    const openPicker = useCallback(() => {
        setOpen(true)
        setFeature(null)
    }, [])

    const onBack = useCallback(() => setFeature(null), [])

    return (
        <>
            <button
                type="button"
                onClick={openPicker}
                aria-label="Quick add"
                className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800"
            >
                +
            </button>

            <Modal open={open} title={title} onClose={close}>
                {!feature ? (
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setFeature('task')}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm transition hover:bg-zinc-800"
                        >
                            Task
                        </button>
                        <button
                            type="button"
                            onClick={() => setFeature('habit')}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm transition hover:bg-zinc-800"
                        >
                            Habit
                        </button>
                        <button
                            type="button"
                            onClick={() => setFeature('expense')}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm transition hover:bg-zinc-800"
                        >
                            Expense
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="text-sm text-zinc-300 transition hover:text-zinc-50"
                        >
                            Back
                        </button>

                        {feature === 'task' ? (
                            <TaskQuickAdd
                                onCreated={() => {
                                    onTaskCreated()
                                    close()
                                }}
                            />
                        ) : null}

                        {feature === 'habit' ? (
                            <HabitQuickAdd
                                onCreated={() => {
                                    close()
                                }}
                            />
                        ) : null}

                        {feature === 'expense' ? (
                            <ExpenseQuickAdd
                                onCreated={() => {
                                    close()
                                }}
                            />
                        ) : null}
                    </div>
                )}
            </Modal>
        </>
    )
}
