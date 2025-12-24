import { NavLink, Outlet } from 'react-router-dom'

function NavItem({ to, label }: { to: string; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${isActive
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50'
                }`
            }
            end
        >
            {label}
        </NavLink>
    )
}

export function AppShell() {
    return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-50">
            <header className="sticky top-0 z-20 bg-zinc-950/70 backdrop-blur">
                <div className="mx-auto w-full max-w-screen-2xl px-3 py-4 sm:px-4">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold tracking-wide text-zinc-100">PersonalOS</div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                >
                                    About
                                </button>
                                <button
                                    type="button"
                                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
                                >
                                    Premium
                                </button>
                                <button
                                    type="button"
                                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition hover:bg-zinc-800"
                                >
                                    Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex min-h-[calc(100dvh-88px)] w-full max-w-screen-2xl gap-4 px-3 pb-6 sm:px-4">
                <aside className="hidden w-64 shrink-0 md:block">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                        <NavItem to="/" label="Dashboard" />
                        <NavItem to="/todo" label="To‑Do" />
                        <NavItem to="/habits" label="Habits" />
                        <NavItem to="/analytics" label="Analytics" />
                    </div>
                    <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/10 px-3 py-3 text-xs text-zinc-500">
                        Single-user mode
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 sm:p-5">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
