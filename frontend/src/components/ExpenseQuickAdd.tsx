import { Link } from 'react-router-dom'

export function ExpenseQuickAdd() {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 text-sm text-zinc-300">
            This legacy expense quick-add has moved to the Net Worth module.
            <div className="mt-3">
                <Link to="/expense" className="text-blue-200/80 hover:text-blue-200">
                    Go to /expense →
                </Link>
            </div>
        </div>
    )
}
