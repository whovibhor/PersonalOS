import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DailyLogPage } from './pages/DailyLogPage'
import { DashboardPage } from './pages/DashboardPage'
import { HabitsPage } from './pages/HabitsPage'
import { LifeCalendarPage } from './pages/LifeCalendarPage'
import { NotesPage } from './pages/NotesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SleepPage } from './pages/SleepPage'
import { TodoPage } from './pages/TodoPage'
import { WeeklyReflectionPage } from './pages/WeeklyReflectionPage'
import { FinancePage } from './pages/finance/FinancePage'
import { FinanceTransactionsPage } from './pages/finance/FinanceTransactionsPage'
import { FinanceAnalyticsPage } from './pages/finance/FinanceAnalyticsPage'
import { FinanceBudgetsPage } from './pages/finance/FinanceBudgetsPage'
import { FinanceGoalsPage } from './pages/finance/FinanceGoalsPage'
import { FinanceSubscriptionsPage } from './pages/finance/FinanceSubscriptionsPage'
import { FinanceManagePage } from './pages/finance/FinanceManagePage'

function App() {
  const [taskMutationTick, setTaskMutationTick] = useState(0)
  void setTaskMutationTick

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell variant="dashboard" />}>
          <Route
            path="/"
            element={<DashboardPage key={`dash-${taskMutationTick}`} />}
          />
        </Route>

        <Route element={<AppShell variant="page" />}>
          <Route
            path="/todo"
            element={<TodoPage key={`todo-${taskMutationTick}`} />}
          />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/daily-log" element={<DailyLogPage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/calendar" element={<LifeCalendarPage />} />
          <Route path="/reflection" element={<WeeklyReflectionPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/finance" element={<FinancePage />} />
          <Route path="/finance/transactions" element={<FinanceTransactionsPage />} />
          <Route path="/finance/analytics" element={<FinanceAnalyticsPage />} />
          <Route path="/finance/budgets" element={<FinanceBudgetsPage />} />
          <Route path="/finance/goals" element={<FinanceGoalsPage />} />
          <Route path="/finance/subscriptions" element={<FinanceSubscriptionsPage />} />
          <Route path="/finance/manage" element={<FinanceManagePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
