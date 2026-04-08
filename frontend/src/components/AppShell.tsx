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
    const inFinanceModule = location.pathname === '/finance' || location.pathname.startsWith('/finance/')

    return (
        <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
            <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
                <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold tracking-wide text-zinc-100">PersonalOS</div>

                        {variant === 'dashboard' ? (
                            <div className="rounded-full border border-zinc-800 bg-zinc-900/20 p-1">
                                <div className="flex items-center gap-1">
                                    <HeaderNavItem to="/todo" label="To-Do" end />
                                    <HeaderNavItem to="/habits" label="Daily" end />
                                    <HeaderNavItem to="/notes" label="Notes" end />
                                    <HeaderNavItem to="/finance" label="Finance" end />
                                    <HeaderNavItem to="/analytics" label="Analytics" end />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-full border border-zinc-800 bg-zinc-900/20 p-1">
                                <div className="flex items-center gap-1">
                                    <HeaderNavItem to="/" label="Dashboard" end />
                                    <HeaderNavItem to="/todo" label="To-Do" end />
                                    <HeaderNavItem to="/habits" label="Daily" end />
                                    <HeaderNavItem to="/notes" label="Notes" end />
                                    <HeaderNavItem to="/finance" label="Finance" end />
                                    <HeaderNavItem to="/analytics" label="Analytics" end />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 gap-4 px-4 pb-6 pt-4 sm:px-6 sm:pt-6 min-h-0">
                {variant === 'dashboard' ? (
                    <aside className="hidden w-56 shrink-0 md:block">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                            <NavItem to="/" label="Dashboard" end />
                            <div className="my-1 px-3 pt-3 pb-1 text-xs font-semibold tracking-widest text-zinc-600">PRODUCTIVITY</div>
                            <NavItem to="/todo" label="To-Do" />
                            <NavItem to="/notes" label="Notes" />
                            <NavItem to="/analytics" label="Analytics" />
                            <div className="my-1 px-3 pt-3 pb-1 text-xs font-semibold tracking-widest text-zinc-600">DAILY LIFE</div>
                            <NavItem to="/habits" label="Daily Canvas" />
                            <NavItem to="/calendar" label="Life Calendar" />
                            <NavItem to="/reflection" label="Weekly Reflection" />
                            <div className="my-1 px-3 pt-3 pb-1 text-xs font-semibold tracking-widest text-zinc-600">FINANCE</div>
                            <NavItem to="/finance" label="Overview" end />
                            <NavItem to="/finance/transactions" label="Transactions" end />
                            <NavItem to="/finance/analytics" label="Analytics" end />
                            <NavItem to="/finance/budgets" label="Budgets" end />
                            <NavItem to="/finance/goals" label="Goals" end />
                            <NavItem to="/finance/subscriptions" label="Subscriptions" end />
                            <NavItem to="/finance/manage" label="Manage" end />
                            <div className="my-1 px-3 pt-3 pb-1 text-xs font-semibold tracking-widest text-zinc-600">SYSTEM</div>
                            <NavItem to="/settings" label="Settings & Backup" />
                        </div>
                    </aside>
                ) : variant === 'page' && inFinanceModule ? (
                    <aside className="hidden w-56 shrink-0 md:block">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3">
                            <div className="px-3 pb-2 text-xs font-semibold tracking-widest text-zinc-600">FINANCE</div>
                            <NavItem to="/finance" label="Overview" end />
                            <NavItem to="/finance/transactions" label="Transactions" end />
                            <NavItem to="/finance/analytics" label="Analytics" end />
                            <NavItem to="/finance/budgets" label="Budgets" end />
                            <NavItem to="/finance/goals" label="Goals" end />
                            <NavItem to="/finance/subscriptions" label="Subscriptions" end />
                            <NavItem to="/finance/manage" label="Manage" end />
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
