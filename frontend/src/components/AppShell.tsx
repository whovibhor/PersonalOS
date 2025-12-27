import { NavLink, Outlet, useLocation } from 'react-router-dom'

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${isActive
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50'
                }`
            }
            end={end}
        >
            {label}
        </NavLink>
    )
}

function HeaderNavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm transition ${isActive
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50'
                }`
            }
            end={end}
        >
            {label}
        </NavLink>
    )
}

type AppShellProps = {
    variant: 'dashboard' | 'page'
}

export function AppShell({ variant }: AppShellProps) {
    const location = useLocation()
    const inExpenseModule = location.pathname === '/expense' || location.pathname.startsWith('/expense/')

    return (
        <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
            <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
                <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold tracking-wide text-zinc-100">PersonalOS</div>

                        {variant === 'dashboard' ? (
                            <div className="rounded-full border border-zinc-800 bg-zinc-900/20 p-1">
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        className="rounded-full px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 hover:text-zinc-50"
                                    >
                                        About
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-full px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 hover:text-zinc-50"
                                    >
                                        Premium
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-full bg-zinc-800 px-3 py-2 text-sm text-zinc-50 transition hover:bg-zinc-700"
                                    >
                                        Login
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-full border border-zinc-800 bg-zinc-900/20 p-1">
                                <div className="flex items-center gap-1">
                                    <HeaderNavItem to="/" label="Dashboard" end />
                                    <HeaderNavItem to="/todo" label="To‑Do" end />
                                    <HeaderNavItem to="/habits" label="Habits" end />
                                    <HeaderNavItem to="/notes" label="Notes" end />
                                    <HeaderNavItem to="/expense" label="Net Worth" end />
                                    <HeaderNavItem to="/analytics" label="Analytics" end />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 gap-4 px-4 pb-6 pt-4 sm:px-6 sm:pt-6 min-h-0">
                {variant === 'dashboard' ? (
                    <aside className="hidden w-64 shrink-0 md:block">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                            <NavItem to="/" label="Dashboard" />
                            <NavItem to="/todo" label="To‑Do" />
                            <NavItem to="/habits" label="Habits" />
                            <NavItem to="/notes" label="Notes" />
                            <NavItem to="/expense" label="Net Worth" />
                            <NavItem to="/analytics" label="Analytics" />
                        </div>
                    </aside>
                ) : variant === 'page' && inExpenseModule ? (
                    <aside className="hidden w-64 shrink-0 md:block">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                            <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-zinc-400">NET WORTH</div>
                            <NavItem to="/expense" label="Dashboard" end />
                            <NavItem to="/expense/history" label="History" end />
                            <NavItem to="/expense/transactions" label="Transactions" end />
                            <NavItem to="/expense/assets" label="Assets & Debts" end />
                            <NavItem to="/expense/budget" label="Budget" end />
                            <NavItem to="/expense/goals" label="Goals" end />
                            <NavItem to="/expense/reports" label="Reports" end />
                        </div>
                    </aside>
                ) : null}

                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                    <div className="min-h-0 flex-1 py-4 sm:py-5">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
