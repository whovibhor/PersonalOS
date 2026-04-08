# PersonalOS — Planning & Feature Tracker

> Single source of truth for all planned features, their breakdown, and current status.
> Update this file whenever a feature is started, modified, or completed.
>
> Last updated: 2026-04-07 (Session 1)

---

## Status Legend
- `[ ]` Not Started
- `[~]` In Progress
- `[x]` Completed

---

## Module 1 — Tasks

**Description:** Core productivity engine. Full lifecycle management of personal tasks.

**Overall Status:** `[x]` Completed (core)

### User Flow
1. User opens To-Do page
2. Creates a task with title, priority, due date, labels, category, recurrence
3. Views tasks by filter: today / all / overdue / done
4. Edits inline or via detail modal
5. Marks done — recurring tasks reset, one-off tasks archive
6. Views task history log

### Sub-features / Components
- `[x]` Create task (title, description, priority, due date, labels, category, assignee)
- `[x]` Edit task inline
- `[x]` Delete task
- `[x]` Mark complete / uncomplete
- `[x]` Recurrence engine (daily / weekly / monthly)
- `[x]` Filter by status: today, all, overdue, done
- `[x]` Task history log (created / updated / deleted / completed)
- `[x]` Calendar view
- `[x]` Board view (Kanban)
- `[ ]` Subtasks
- `[ ]` Task templates (quick-add presets)
- `[ ]` Drag-and-drop ordering
- `[ ]` Reminders / scheduled notifications

---

## Module 2 — Habits

**Description:** Daily habit tracking with check-in, streak logic, and analytics.

**Overall Status:** `[x]` Completed (Daily Canvas — habits + daily log + sleep + attendance on one board)

### User Flow
1. User creates a habit (name, frequency)
2. Each day: opens Habits page, sees today's habits, taps check-in for each
3. System tracks streak (consecutive completions), marks missed days
4. Weekly/monthly habit consistency visible
5. Reminders notify user at chosen times

### Sub-features / Components
- `[x]` Create habit (name, frequency)
- `[x]` List habits
- `[x]` Delete habit
- `[x]` Edit habit
- `[x]` `habit_logs` table in DB (date, habit_id, is_done)
- `[x]` Daily check-in API (`POST /habits/{id}/checkin`)
- `[x]` Streak calculation (current streak, longest streak, last completed)
- `[x]` Missed-day logic (break streak if unchecked by end of day)
- `[x]` Today's check-in UI (show pending / done state per habit)
- `[x]` Streak display on habit card
- `[ ]` Habit completion heatmap
- `[ ]` Weekly consistency stats
- `[ ]` Reminders per habit

---

## Module 3 — Notes

**Description:** Personal notes with tags, color, pin, archive, checklist — Google Keep-style UI.

**Overall Status:** `[x]` Completed (Google Keep-style)

### User Flow
1. User opens Notes page
2. Creates note with title, content, optional tags
3. Views list, searches by keyword or tag
4. Edits note inline with autosave
5. Deletes note

### Sub-features / Components
- `[x]` Create note (backend)
- `[x]` Delete note (backend)
- `[x]` `notes` table in DB (id, title, content, tags comma-string, timestamps)
- `[x]` Backend CRUD API (`/notes`)
- `[x]` Frontend migrated from localStorage → backend
- `[x]` Tags support (add/remove tags per note)
- `[x]` Search by keyword (title + content)
- `[x]` Filter by tag
- `[x]` Edit note (modal)
- `[x]` Autosave on edit (1.5s debounce)
- `[x]` Checklist note type (items with check/uncheck, reorder, auto-move checked)
- `[x]` Color-coded cards (12 colors — red/orange/yellow/green/teal/blue/indigo/purple/pink/brown/gray/default)
- `[x]` Pin notes (pinned section always at top)
- `[x]` Archive notes (separate archived view)
- `[x]` Grid / list view toggle
- `[x]` Color filter chips
- `[x]` Label sidebar navigation
- `[x]` Hover action bar on cards (pin, color, archive, delete)

---

## Module 4 — Finance (Student-focused Personal Finance Tracker)

**Description:** Rebuilt from scratch — fast expense entry, categories with icons/colors, budgets with alerts, analytics with smart insights, subscription tracker, goals with daily savings needed.

**Overall Status:** `[x]` Completed (full rebuild)

### Backend
- `[x]` Models: FinAccount, FinCategory, FinTransaction, FinBudget, FinGoal, FinSubscription
- `[x]` Auto-seed 19 default categories on startup
- `[x]` Accounts CRUD (bank/cash/upi/wallet, balance tracking)
- `[x]` Categories CRUD (with color + lucide icon name)
- `[x]` Transactions CRUD (income/expense, category, account, payment method, date)
- `[x]` Balance auto-update on transaction create/edit/delete
- `[x]` Budgets upsert (total + per-category, spent/pct computed live)
- `[x]` Goals CRUD + add-funds endpoint (pct, days_left, daily_needed computed)
- `[x]` Subscriptions CRUD (monthly/weekly/yearly, days_until, monthly_equivalent)
- `[x]` Dashboard endpoint (total_balance, today/month stats, accounts, recent txns)
- `[x]` Analytics: category spend, daily trend, smart insights (MoM, burn rate, budget alerts)

### Frontend
- `[x]` Finance Dashboard (/finance) — balance hero, accounts, recent txns, quick add
- `[x]` Transactions page (/finance/transactions) — grouped by day, search, type filter, delete
- `[x]` Analytics page (/finance/analytics) — category bars, daily trend chart, insights cards
- `[x]` Budgets page (/finance/budgets) — monthly nav, total + category budgets with progress bars
- `[x]` Goals page (/finance/goals) — color-coded cards, daily needed, add funds modal
- `[x]` Subscriptions page (/finance/subscriptions) — urgency color, days until, monthly total
- `[x]` Manage page (/finance/manage) — accounts + categories CRUD, seed defaults button

---

## Module 5 — Daily Log

**Description:** Daily mood, energy, and focus check-in with reflection notes. Generates a daily wellness score.

**Overall Status:** `[x]` Completed (core)

### User Flow
1. User opens Daily Log (once per day)
2. Rates mood (1–5), energy (1–5), focus (1–5)
3. Writes short reflection (optional)
4. Submits — daily score calculated automatically
5. Can view log history and trends

### Sub-features / Components
- `[x]` `daily_logs` table (date, mood, energy, focus, reflection, score)
- `[x]` `POST /daily-log` — upsert (create or update) by date
- `[x]` `GET /daily-log` — list history (limit param)
- `[x]` `GET /daily-log/today` — get today's log
- `[x]` Daily Log page (sliders + textarea + live score preview)
- `[x]` Daily score formula (average of mood/energy/focus, stored in DB)
- `[x]` Edit today's log (update button)
- `[x]` View log history with color-coded scores

---

## Module 6 — Sleep Tracker

**Description:** Log sleep start/end, quality, and notes. Tracks sleep debt and consistency.

**Overall Status:** `[x]` Completed (core)

### User Flow
1. User opens Sleep page
2. Logs sleep duration (hours), quality (1–5), wake time, optional notes
3. System calculates sleep debt (< 7h target)
4. Trends visible on analytics page

### Sub-features / Components
- `[x]` `sleep_logs` table (date, hours, quality, wake_time, notes)
- `[x]` `POST /sleep` — upsert by date
- `[x]` `GET /sleep` — list history
- `[x]` `GET /sleep/today` — today's log
- `[x]` Sleep page (form + history list + 7-day avg summary)
- `[x]` Sleep debt calculation (vs 7h target)
- `[ ]` Sleep consistency metric (wake time variance)
- `[ ]` Sleep trend on Analytics page

---

## Module 7 — Attendance

**Description:** Daily present/absent log with reason tracking. Useful for tracking work/study consistency.

**Overall Status:** `[x]` Completed (embedded in Daily Canvas at /habits)

### User Flow
1. User opens Attendance page (now part of Daily Canvas)
2. Marks today as Present or Absent with optional reason
3. Views monthly attendance % and history
4. Streak of consecutive present days shown

### Sub-features / Components
- `[x]` `attendance` table (date, status, reason)
- `[x]` `POST /attendance` — upsert today
- `[x]` `GET /attendance` — list history
- `[x]` Attendance UI (toggle + reason, embedded in Daily Canvas)
- `[x]` Monthly attendance % (computed from last 60 days)
- `[x]` Attendance streak (consecutive present days)
- `[ ]` Heatmap view

---

## Module 8 — Life Calendar

**Description:** One-cell-per-day visual calendar. Each cell shows a composite daily score based on habits, mood, sleep.

**Overall Status:** `[x]` Completed (core)

### User Flow
1. User opens Life Calendar
2. Sees a full-year grid (one block per day)
3. Each block colored by daily composite score
4. Clicks a day → inline panel shows: mood/energy/focus, sleep hours+quality, habits done/total
5. Can navigate to previous years

### Sub-features / Components
- `[x]` `GET /life-calendar?year=YYYY` — aggregate day scores from daily_logs, sleep_logs, habit_logs
- `[x]` Day score formula: avg of (daily_score normalised, sleep_quality normalised, habit_pct) → 0-100
- `[x]` Life Calendar page (full-year grid, 53 weeks × 7 days)
- `[x]` Color scale (gray=no data, red→amber→green based on score)
- `[x]` Day detail panel (click a day, shows wellness + sleep + habits)
- `[x]` Cross-module data aggregation per day
- `[x]` Year navigation (prev/next year buttons)

---

## Module 9 — Dashboard (Unified)

**Description:** Morning command center — shows today plan, habits due, bills due, mood/sleep summary.

**Overall Status:** `[x]` Completed

### User Flow
1. User opens app → lands on Dashboard
2. Sees: Today's tasks, habits pending, bills due this week, last mood/sleep, quick links

### Sub-features / Components
- `[x]` Today's tasks widget (with inline mark-done)
- `[x]` Today's habits widget (with inline check-in toggle)
- `[x]` Bills due this week widget (next 7 days, color-coded urgency)
- `[x]` Last mood/sleep summary widget (emoji cards)
- `[x]` Monthly budget status bar
- `[x]` Daily score display (KPI card)
- `[x]` `GET /api/dashboard/today` — single endpoint aggregating all modules
- `[ ]` Quick-add buttons (task, expense, habit check-in)

---

## Module 10 — Analytics (Unified)

**Description:** Cross-module analytics: tasks, mood/energy/sleep trends, habit streaks, cashflow.

**Overall Status:** `[x]` Completed (core — tabbed: Tasks / Wellness / Finance)

### Sub-features / Components
- `[x]` Task completion rate
- `[x]` Task priority distribution
- `[x]` Task overdue stats
- `[x]` Mood timeline sparkline (last 30 days)
- `[x]` Energy timeline sparkline (last 30 days)
- `[x]` Sleep hours trend sparkline (last 30 days)
- `[x]` Habit streak & total completions per habit
- `[x]` Monthly cashflow bar chart (last 6 months)
- `[x]` Avg savings rate over period
- `[ ]` Habit completion heatmap calendar
- `[ ]` Mood vs productivity correlation
- `[ ]` Sleep vs task completion correlation

---

## Module 11 — Reminders / Notifications

**Description:** Browser-based notifications for tasks, habits, bills, and weekly reflection.

**Overall Status:** `[ ]` Not Started

### Sub-features / Components
- `[ ]` Browser Notifications API integration
- `[ ]` Task due reminders (configurable per task)
- `[ ]` Habit reminder at chosen time
- `[ ]` Bill due alerts (7 days / 3 days / 1 day before)
- `[ ]` Weekly reflection prompt (Sunday evening)
- `[ ]` Notification settings page

---

## Module 12 — Global Search & Command Palette

**Description:** `Ctrl+K` command palette to search and quick-add across all modules.

**Overall Status:** `[ ]` Not Started

### Sub-features / Components
- `[ ]` `Ctrl+K` keyboard shortcut
- `[ ]` Search across tasks, notes, transactions
- `[ ]` Quick actions: new task, new note, new expense
- `[ ]` Recent items list
- `[ ]` Fuzzy match search

---

## Module 13 — Backup & Restore

**Description:** Full data export as JSON. Restore from backup file. Prevents data loss.

**Overall Status:** `[~]` In Progress (export done, restore TBD)

### Sub-features / Components
- `[x]` `GET /backup/export` — full JSON dump of all tables (tasks, habits, notes, finance, sleep, reflections, attendance)
- `[x]` Export button in Settings page (downloads dated .json file)
- `[x]` Import file picker — parses file, previews record counts
- `[ ]` `POST /backup/restore` — import JSON and repopulate DB
- `[ ]` Conflict resolution on restore (overwrite / merge option)

---

## Module 14 — Weekly Reflection

**Description:** Prompted Sunday workflow: what went well, what to improve, highlights.

**Overall Status:** `[x]` Completed (core)

### Sub-features / Components
- `[x]` `weekly_reflections` table (year, week_number, went_well, didnt_go_well, improvements, highlight, gratitude)
- `[x]` `POST /reflections` (upsert by year+week), `GET /reflections`, `GET /reflections/this-week`, `PATCH`, `DELETE`
- `[x]` Weekly Reflection page (/reflection) — 5 prompts (went well, didn't go well, improvements, highlight, gratitude)
- `[x]` Save/update button, past reflections history toggle
- `[ ]` Auto-prompt on Sunday
- `[ ]` Link to week's tasks, habits, mood summary

---

## Build Order (Execution Sequence)

| Priority | Module | Reason |
|---|---|---|
| 1 | Notes → Backend | Data-loss risk (localStorage) |
| 2 | Habits Engine | Biggest daily-use gap |
| 3 | Daily Log | Core life-tracking module |
| 4 | Sleep Tracker | Feeds analytics and life calendar |
| 5 | Dashboard (Unified) | Make the home page actually useful |
| 6 | Finance UX fixes | Recurring liability + goal allocation |
| 7 | Attendance | Simple module, high daily value |
| 8 | Life Calendar | Needs Daily Log + Sleep + Habits first |
| 9 | Analytics (Unified) | Needs all data sources first |
| 10 | Weekly Reflection | Needs habit/task/mood data |
| 11 | Reminders | UX polish layer |
| 12 | Global Search | UX polish layer |
| 13 | Backup & Restore | Reliability layer |
