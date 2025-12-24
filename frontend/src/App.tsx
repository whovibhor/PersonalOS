import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { HabitsPage } from './pages/HabitsPage'
import { NotesPage } from './pages/NotesPage'
import { TodoPage } from './pages/TodoPage'

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
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
