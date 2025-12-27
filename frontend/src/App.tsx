import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { HabitsPage } from './pages/HabitsPage'
import { NotesPage } from './pages/NotesPage'
import { TodoPage } from './pages/TodoPage'
import { ExpenseAssetsPage } from './pages/expense/ExpenseAssetsPage'
import { ExpenseBillsPage } from './pages/expense/ExpenseBillsPage'
import { ExpenseBudgetPage } from './pages/expense/ExpenseBudgetPage'
import { ExpenseDashboardPage } from './pages/expense/ExpenseDashboardPage'
import { ExpenseHistoryPage } from './pages/expense/ExpenseHistoryPage'
import { ExpenseGoalsPage } from './pages/expense/ExpenseGoalsPage'
import { ExpenseReportsPage } from './pages/expense/ExpenseReportsPage'
import { ExpenseTransactionsPage } from './pages/expense/ExpenseTransactionsPage'

function App() {
  const [taskMutationTick, setTaskMutationTick] = useState(0)

  // Kept for historical reasons: if we need to force-refresh pages on task mutations.
  // Currently unused after removing the floating quick add button.
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
          <Route path="/analytics" element={<AnalyticsPage />} />

          <Route path="/expense" element={<ExpenseDashboardPage />} />
          <Route path="/expense/transactions" element={<ExpenseTransactionsPage />} />
          <Route path="/expense/bills" element={<ExpenseBillsPage />} />
          <Route path="/expense/assets" element={<ExpenseAssetsPage />} />
          <Route path="/expense/budget" element={<ExpenseBudgetPage />} />
          <Route path="/expense/goals" element={<ExpenseGoalsPage />} />
          <Route path="/expense/reports" element={<ExpenseReportsPage />} />
          <Route path="/expense/history" element={<ExpenseHistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
