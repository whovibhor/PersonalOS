import { useCallback, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { FloatingQuickAdd } from './components/FloatingQuickAdd'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { HabitsPage } from './pages/HabitsPage'
import { TodoPage } from './pages/TodoPage'

function App() {
  const [taskMutationTick, setTaskMutationTick] = useState(0)

  const onTaskCreated = useCallback(() => {
    setTaskMutationTick((x) => x + 1)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={<DashboardPage key={`dash-${taskMutationTick}`} />}
          />
          <Route
            path="/todo"
            element={<TodoPage key={`todo-${taskMutationTick}`} />}
          />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>

      <FloatingQuickAdd onTaskCreated={onTaskCreated} />
    </BrowserRouter>
  )
}

export default App
