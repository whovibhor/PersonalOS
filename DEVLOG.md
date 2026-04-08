# PersonalOS — Implementation Log

> Running log of development progress. Update whenever work is started, completed, or paused.
> Check this first before making any new changes.
>
> Format: newest entries at the top.

---

## How to Use This File

Before starting work:
1. Check if the feature is already in progress
2. Note the "Remaining" items to pick up from where it left off

After finishing work:
1. Mark items complete
2. Add any blockers or notes for next session

---

## [2026-04-07] — Project Audit & Tracker Setup

**Feature:** Full project audit

**What was implemented (pre-existing):**
- Tasks module: full CRUD, recurrence (daily/weekly/monthly), history log, filters (today/all/overdue/done), labels, priority, calendar view, board view — backend + frontend complete
- Habits module: `Habit` model (name, frequency), `GET /habits` and `POST /habits` API, basic list + create UI — skeleton only, no logs or check-in
- Notes module: localStorage-only create/delete — no backend at all, data-loss risk
- Finance module: Assets, Liabilities, Transactions, Budgets (monthly + category), Goals, Recurring Rules + Occurrences, Audit Log, Reports — backend + frontend complete
- Analytics page: task-only stats (completion rate, priority distribution, overdue count)
- Dashboard: skeleton — shows today's tasks count only; habits and analytics cards say "Not implemented yet"
- AppShell with GooeyNav, Modal component, FloatingQuickAdd, TaskQuickAdd, HabitQuickAdd, ExpenseQuickAdd

**What is remaining (entire project backlog):**
- Habits: delete, edit, habit_logs table, daily check-in, streak logic, heatmap
- Notes: backend model + API, frontend migration, tags, search, edit
- Daily Log module: full build (model, API, page)
- Sleep Tracker module: full build (model, API, page)
- Attendance module: full build (model, API, page)
- Life Calendar page: full build (aggregation API + frontend grid)
- Dashboard: unified today-state API, habits widget, bills due widget, mood/sleep summary
- Analytics: unified cross-module (habits, sleep, mood, expense) graphs
- Reminders / notifications engine
- Global search + command palette (Ctrl+K)
- Backup & restore (export/import JSON)
- Weekly reflection module
- Finance UX gaps: recurring liability payment flow, goal allocation frontend, advanced transaction filters

**Status:** Audit complete. Tracking files created. Ready to build.

---

## [2026-04-07] — Notes Backend + Habits Engine

**Feature:** Notes (backend migration) + Habits (full engine)

**What was implemented:**

Notes:
- `backend/app/models/note.py` — `notes` table (id, title, content, tags as comma-string, timestamps)
- `backend/app/schemas/note.py` — `NoteCreate`, `NoteUpdate`, `NoteOut` (tags serialized as `list[str]`)
- `backend/app/api/notes.py` — full CRUD + search (`?q=`) + tag filter (`?tag=`)
- Registered in `router.py` and model registered in `main.py` (auto-creates table on startup)
- `frontend/src/lib/api.ts` — added `Note`, `NoteCreate`, `NoteUpdate` types + `listNotes`, `createNote`, `updateNote`, `deleteNote` functions
- `frontend/src/pages/NotesPage.tsx` — full rewrite: backend-connected, tag input, search with 300ms debounce, tag filter bar, edit modal, date shown on card

Habits:
- `backend/app/models/habit_log.py` — `habit_logs` table (habit_id FK, log_date, is_done, unique constraint per habit+date)
- `backend/app/schemas/habit.py` — added `HabitUpdate`, `HabitLogOut`; `HabitOut` now includes `done_today`, `current_streak`, `longest_streak`, `total_done`
- `backend/app/api/habits.py` — full rewrite: list (enriched with streaks), create, `PATCH /{id}` edit, `DELETE /{id}`, `POST /{id}/checkin` (toggle), `GET /{id}/logs`
- Streak logic: current streak counts consecutive days back from today; longest streak scans all done dates
- Model registered in `main.py`
- `frontend/src/lib/api.ts` — `Habit` type updated with streak fields; added `updateHabit`, `deleteHabit`, `checkinHabit`
- `frontend/src/pages/HabitsPage.tsx` — full rewrite: check-in toggle button (○/✓), streak badge (🔥), progress bar (done/total), edit + delete per card, add + edit modals

**What is remaining:**
- Habit heatmap (completion calendar visualization)
- Habit reminders
- Notes: autosave on edit (currently requires explicit Save button)

**Status / Notes:**
- `habit_logs` table created via SQLAlchemy `create_all` on startup — no manual migration needed
- `notes` table same — auto-created on startup
- Tags stored as comma-separated string in DB, exposed as `list[str]` to frontend
- Check-in is a toggle: calling it again on a done habit un-marks it

---

## [2026-04-07] — Persistence Audit + Daily Log + Sleep Tracker

**Feature:** Data persistence audit + Daily Log module + Sleep Tracker module

**Audit findings:**
- All task data → MySQL ✓. localStorage in TodoPage is ONLY for UI filter prefs (which tab is active), not task data. Intentional and correct.
- Habits → MySQL ✓ (after session 1). Habit logs → MySQL ✓.
- Notes → MySQL ✓ (migrated session 1, zero localStorage remaining).
- Finance → MySQL ✓. No caching anywhere in backend.
- No Redis, no application-level cache. Every request goes directly to MySQL.
- **Verdict: all user data is permanently stored in MySQL. No data loss risk.**

**What was implemented:**

Daily Log backend:
- `backend/app/models/daily_log.py` — `daily_logs` table (log_date unique, mood 1-5, energy 1-5, focus 1-5, reflection, score float)
- `backend/app/schemas/daily_log.py` — Create/Update/Out schemas, `_compute_score()` helper (avg of non-null values)
- `backend/app/api/daily_log.py` — `GET /daily-log` (list, limit param), `GET /daily-log/today`, `POST /daily-log` (upsert by date), `PATCH /daily-log/{id}`, `DELETE /daily-log/{id}`

Sleep Tracker backend:
- `backend/app/models/sleep_log.py` — `sleep_logs` table (sleep_date unique, hours_slept decimal, quality 1-5, wake_time HH:MM string, notes)
- `backend/app/schemas/sleep_log.py` — Create/Update/Out schemas with Decimal→float conversion
- `backend/app/api/sleep_log.py` — `GET /sleep`, `GET /sleep/today`, `POST /sleep` (upsert), `PATCH /sleep/{id}`, `DELETE /sleep/{id}`

Frontend:
- Added `DailyLog`, `SleepLog` types + all API functions to `frontend/src/lib/api.ts`
- `frontend/src/pages/DailyLogPage.tsx` — today form (3 sliders: mood/energy/focus, reflection textarea, live preview score), history list with score color coding
- `frontend/src/pages/SleepPage.tsx` — today form (hours, wake time, quality slider, notes), 7-day avg summary widgets, sleep debt calculation, history list
- `frontend/src/App.tsx` — added `/daily-log` and `/sleep` routes
- `frontend/src/components/AppShell.tsx` — nav reorganized with section headers (PRODUCTIVITY / DAILY LIFE / FINANCE), new pages added to both sidebar and header nav

**What is remaining:**
- Attendance module
- Dashboard: unified today-state API
- Life Calendar
- Analytics: cross-module graphs

**Status / Notes:**
- Both `daily_logs` and `sleep_logs` tables auto-created on backend startup via `create_all`
- Both POST endpoints are upserts — calling them again for the same date updates the existing record
- Score is stored in DB (not just computed on read) for fast calendar aggregation later

---

## [2026-04-07] — Unified Dashboard

**Feature:** Dashboard (Unified Today State)

**What was implemented:**

Backend:
- `backend/app/api/dashboard.py` — `GET /dashboard/today` endpoint aggregating all modules into one response:
  - Tasks: pending count, overdue count, up to 8 task items (title, priority, status, due date)
  - Habits: done/total count, all habit items with done_today + current_streak
  - Bills: recurring rules due within next 7 days (name, amount, due_date, days_until)
  - Daily log: today's mood/energy/focus/score (null if not logged yet)
  - Last sleep: most recent sleep log (hours, quality, wake_time)
  - Finance: net worth, expenses this month, income this month, budget total + used %
- Registered in `router.py` (mounted first so `/dashboard/today` isn't shadowed)

Frontend:
- Added `TodayState`, `DashTaskItem`, `DashHabitItem`, `DashBillItem`, `DashDailyLog`, `DashSleepLog`, `DashFinance` types to `api.ts`
- Added `getTodayState()` function
- `frontend/src/pages/DashboardPage.tsx` — complete rewrite:
  - Greeting (Good morning/afternoon/evening) + today's date
  - 4 KPI cards (clickable): Tasks left, Habits done/total, Net worth, Daily score — all color-coded
  - 2-column grid: Today's tasks (inline mark-done), Today's habits (inline check-in toggle)
  - Bills due soon section (overdue/urgent color coding)
  - Wellness snapshot: mood emoji + sleep emoji cards, monthly spend vs budget bar

**What is remaining:**
- Attendance module
- Life Calendar
- Analytics: cross-module graphs

**Status / Notes:**
- Dashboard makes a single API call; all data from one endpoint
- Task mark-done and habit check-in work inline without full reload
- KPI cards are links — clicking navigates to the relevant module
- Removed unused `ScoreRing` component (lint warning)

---

## [2026-04-07] — Daily Canvas + Attendance Module

**Feature:** Attendance module + Daily Canvas (habits page redesign)

**What was implemented:**

Attendance backend:
- `backend/app/models/attendance.py` — `attendance` table (attend_date unique, status present/absent, reason)
- `backend/app/schemas/attendance.py` — `AttendanceCreate`, `AttendanceUpdate`, `AttendanceOut`
- `backend/app/api/attendance.py` — `GET /attendance`, `GET /attendance/today`, `POST /attendance` (upsert), `PATCH`, `DELETE`
- Registered in `router.py` and `main.py`
- Added `DashAttendance` to dashboard `today-state` response (today's attendance status)

Frontend:
- Added `Attendance`, `AttendanceCreate`, `DashAttendance` types + `listAttendance`, `getTodayAttendance`, `saveAttendance`, `updateAttendance` to `api.ts`
- `DashAttendance` added to `TodayState` type
- `frontend/src/pages/HabitsPage.tsx` — fully rewritten as **Daily Canvas** with 4 self-contained sections:
  - **Habits** — grid of habit cards (check-in ○/✓, streak flame, hover edit/delete)
  - **Wellness Check-in** — side-by-side: Daily Log (mood/energy/focus sliders + reflection, live score preview) + Sleep (hours, wake time, quality slider, notes, debt indicator)
  - **Attendance** — Present/Absent toggle, reason field appears on Absent, auto-saves on mark
  - Each section loads and saves independently
- `frontend/src/components/AppShell.tsx` — nav simplified: Daily Log and Sleep removed as separate nav entries; Habits renamed to "Daily" (header) / "Daily Canvas" (sidebar); routes `/daily-log` and `/sleep` still exist in App.tsx for backward compatibility
- Dashboard wellness cards now link to `/habits` (the canvas)

**What is remaining:**
- Life Calendar
- Analytics: cross-module graphs
- Finance UX fixes (recurring liability flow, goal allocation frontend)

**Status / Notes:**
- Each canvas section (Habits, Daily Log, Sleep, Attendance) is a self-contained component — they load their own data independently so a slow section doesn't block the rest
- All data saves to MySQL immediately on interaction (no form submit required for attendance marking)
- `/daily-log` and `/sleep` routes kept in App.tsx — standalone pages still accessible if needed (from bookmarks etc)

---

## [2026-04-07] — Notes: Full Google Keep-Style Redesign

**Feature:** Notes module — complete UI/UX redesign (Google Keep parity)

**What was implemented:**

Backend:
- `backend/app/models/note.py` — Added 5 new columns: `note_type` (text/checklist), `checklist_items` (JSON Text), `color` (VARCHAR), `is_pinned` (Bool), `is_archived` (Bool)
- `backend/app/main.py` — `_ensure_notes_schema()` additive migration: adds all 5 columns if missing on existing `notes` tables
- `backend/app/schemas/note.py` — Updated NoteCreate/NoteUpdate/NoteOut to include all new fields; `from_orm_obj()` uses `getattr(..., default)` for backward compat
- `backend/app/api/notes.py` — Updated `list_notes`: added `color`, `archived` query params; search now also searches `checklist_items`; result sorted pinned-first then updated_at desc; PATCH handles all new fields (`color=''` clears color)

Frontend:
- `frontend/src/lib/api.ts` — Updated `Note` type (added all 5 fields + `ChecklistItem`/`NoteType`); updated `listNotes(q, tag, color, archived)`, `NoteCreate`/`NoteUpdate`
- `frontend/src/pages/NotesPage.tsx` — Full rewrite (Google Keep architecture):
  - **Color system**: 12 colors (default + red/orange/yellow/green/teal/blue/indigo/purple/pink/brown/gray), each maps to dark-mode bg/border/dot CSS
  - **Left sidebar**: label navigation (one button per unique label), Notes / Archive toggle
  - **Top bar**: full-width search with clear button, grid/list view toggle
  - **Color filter chips**: dot buttons for each color that exists in notes, click to filter
  - **PINNED / OTHERS sections**: pinned notes float to top in their own section
  - **Masonry layout**: CSS `columns-N` with `break-inside-avoid` on each card (1/2/3/4 cols by breakpoint)
  - **Note cards**: color background, title, content preview (6-line clamp), checklist item preview (max 8), tag pills, pin badge; hover reveals action bar (pin, color picker, archive, delete)
  - **Color picker**: 12-dot grid popover on card hover bar and inside editor
  - **Quick-create bar**: "Take a note…" → opens text editor; checklist icon → opens checklist editor
  - **Note editor modal**: backdrop blur overlay, color-matched background, pin toggle top-right, title + content/checklist editor, tag input, bottom toolbar (type toggle, color, label, delete, archive); autosave 1200ms debounce on all changes
  - **Checklist editor**: unchecked items first, inline add (Enter), delete (Backspace on empty), checked items in separate "X checked" section with strikethrough
  - **Archive**: separate view (triggered from sidebar or card action), unarchive supported

**What is remaining (Keep features not built):**
- Voice notes / image attachments
- Drawings / freehand canvas
- Reminder integration (needs notification engine first)
- Real-time collaboration / sharing
- Drag-and-drop reorder within card

---

## [2026-04-07] — Weekly Reflection + Backup + Attendance Stats + Notes Autosave

**Feature:** Weekly Reflection module, Backup/Settings page, Attendance stats, Notes autosave

**What was implemented:**

Weekly Reflection:
- `backend/app/models/weekly_reflection.py` — `weekly_reflections` table (year, week_number, went_well, didnt_go_well, improvements, highlight, gratitude; UniqueConstraint on year+week)
- `backend/app/schemas/weekly_reflection.py` — Create/Update/Out schemas
- `backend/app/api/weekly_reflection.py` — `GET /reflections`, `GET /reflections/this-week`, `POST /reflections` (upsert), `PATCH /{id}`, `DELETE /{id}`; `_current_iso_week()` helper
- `frontend/src/lib/api.ts` — added `WeeklyReflection`, `WeeklyReflectionCreate`, `WeeklyReflectionUpdate` types + `listReflections`, `getThisWeekReflection`, `upsertReflection`, `updateReflection`, `deleteReflection`
- `frontend/src/pages/WeeklyReflectionPage.tsx` — 5 prompts (went well, didn't go well, improvements, highlight, gratitude), ISO week date range display, save/update button, past reflections history panel, week number + date range computed client-side
- Route `/reflection` + sidebar nav entry under DAILY LIFE

Backup & Settings:
- `backend/app/api/backup.py` — `GET /backup/export` dumps all tables to JSON (18 collections), returned as downloadable JSON response
- `frontend/src/lib/api.ts` — `downloadBackup()` function (creates blob URL + triggers download)
- `frontend/src/pages/SettingsPage.tsx` — Export button, file picker for import preview (parses JSON, shows per-table record counts), About section
- Route `/settings` + sidebar nav entry under SYSTEM section

Attendance stats (Daily Canvas):
- `HabitsPage.tsx` AttendanceSection — now loads last 60 days instead of 3
- Added `computeStats()`: monthly attendance % (present days / days elapsed this month), consecutive present streak
- Stats shown in card header as "This month: X%" and "Streak: 🔥 Xd" (color-coded: green ≥80%, amber ≥60%, red <60%)
- Streak refreshes after each mark action

Notes autosave:
- `NoteForm` now accepts `autoSave?: boolean` prop
- When `autoSave=true`: 1.5s debounce effect on title/content/tags changes fires `onSubmit` silently
- Status shown as "Autosaved HH:MM" / "Saving…" / "Autosave on"
- Cancel button becomes "Close" in autosave mode (no manual Save button shown)
- Edit modal passes `autoSave` prop; Create modal unchanged

**What is remaining:**
- Backup: `POST /backup/restore` endpoint (full DB restore from JSON)
- Attendance: heatmap view
- Reminders, Global Search modules (not started)

**Status / Notes:**
- `weekly_reflections` table auto-created on startup
- ISO week uses Python's `date.isocalendar()` for accuracy (handles year-boundary correctly)
- Autosave skips the first render via `isFirstRender` ref to avoid saving on modal open

---

## [2026-04-07] — Life Calendar + Analytics Rewrite + Finance Fixes

**Feature:** Life Calendar, cross-module Analytics, Finance Goals/Bills fixes

**What was implemented:**

Life Calendar backend:
- `backend/app/api/life_calendar.py` — `GET /api/life-calendar?year=YYYY`
  - Aggregates `daily_logs` (score), `sleep_logs` (quality), `habit_logs` (done/total) per day
  - Composite score = avg of (daily_score 0-100) + (sleep_quality 0-100) + (habit_pct 0-100) — only includes components that have data
  - Returns full year as array of `CalendarDay` objects (one per day)
- Registered in `router.py`

Life Calendar frontend:
- `frontend/src/lib/api.ts` — added `CalendarDay` type + `getLifeCalendar(year)`
- `frontend/src/pages/LifeCalendarPage.tsx` — full-year grid (53 weeks × 7 days)
  - Color: gray (no data) → red → amber → green → bright green
  - Month labels above grid aligned by week column
  - Click a day → inline detail panel (mood/energy/focus, sleep, habits done/total)
  - Year navigation (prev/next)
- Route `/calendar` added to `App.tsx`
- "Life Calendar" added to sidebar under DAILY LIFE section

Analytics rewrite:
- `frontend/src/pages/AnalyticsPage.tsx` — full rewrite, now 3-tab layout: Tasks | Wellness | Finance
  - Tasks tab: all existing stats (total/done/overdue/due today/due 7d/priority mix)
  - Wellness tab: avg mood/energy/sleep stats, sparkline bar charts (last 30 days) for mood/energy/sleep, habit streaks per habit
  - Finance tab: avg savings rate, monthly cashflow bar chart (last 6 months, income vs expense)
  - All fetches parallelised: tasks + daily_logs(60) + sleep_logs(60) + habits + cashflow(6)
  - Cards are content-fit (px-3 py-2), no fixed heights

Finance fixes:
- `ExpenseBillsPage.tsx` — full rewrite:
  - `BillForm` extracted as shared component used by both Add and Edit modals
  - Added "Bill type" dropdown: Regular Expense / EMI Liability Payment
  - When EMI selected: liability picker appears, shows liability name + remaining balance
  - `liability_id` correctly passed to backend when `txn_type === 'liability_payment'`
  - Existing rules open with their real `txn_type` (no longer hardcoded to 'expense')
  - Also loads `listFinanceLiabilities()` alongside assets on page mount
- `ExpenseGoalsPage.tsx` — enhanced:
  - Target date field in Add and Edit modals
  - Goal card shows: days remaining (color-coded: red if overdue, amber if <30d)
  - Estimated completion date (calculated from monthly savings rate since creation)
  - Replaced quick-add buttons (+₹1k/+₹5k) with "Add funds" and "Withdraw" buttons → modal with amount input
  - Progress bar turns bright green at 100%

**What is remaining:**
- Life Calendar: tasks done per day (requires task DB query by date — tasks use due_date not completed_at)
- Analytics: habit completion heatmap calendar
- Finance: goal allocation frontend (link asset → goal)
- Weekly Reflection, Reminders, Global Search, Backup & Restore

**Status / Notes:**
- Life Calendar backend uses date range filtering (>= year_start, <= year_end) — works with MySQL
- Composite score normalises 1-5 scale to 0-100: `(value - 1) / 4 * 100`
- Bills page: old rules that were created as 'expense' still load correctly; new EMI rules pass the right txn_type
- Goals: projected completion only shown when pct < 100 and at least 1 month of history exists

---

## [SESSION TEMPLATE — copy this for each new session]

<!--
## [YYYY-MM-DD] — <Feature Name>

**Feature:** <module name>

**What was implemented:**
- <bullet points>

**What is remaining:**
- <bullet points>

**Status / Notes:**
<any blockers, decisions made, things to watch out for>
-->

---

## Upcoming (Next Sessions In Order)

1. ~~**Notes Backend**~~ ✓ Done
2. ~~**Habits Engine**~~ ✓ Done
3. ~~**Daily Log Module**~~ ✓ Done
4. ~~**Sleep Tracker Module**~~ ✓ Done
5. ~~**Dashboard (Unified)**~~ ✓ Done
6. ~~**Finance UX Fixes**~~ ✓ Done (EMI liability picker, goal target date, add/withdraw funds)
7. ~~**Attendance Module**~~ ✓ Done (inside Daily Canvas)
8. ~~**Life Calendar**~~ ✓ Done (full-year grid, composite score, day detail)
9. ~~**Analytics (Unified)**~~ ✓ Done (Tasks/Wellness/Finance tabs, sparklines, cashflow chart)
10. ~~**Weekly Reflection**~~ ✓ Done (5-prompt form, history, backend upsert)
11. **Reminders** — Browser notification engine
12. **Global Search** — Ctrl+K palette
13. ~~**Backup & Restore**~~ ✓ Done (export full JSON; restore UI preview only)


---

## Session — Finance Module Complete Rebuild (2026-04-07)

### What was done
- **Removed** old Net Worth module (assets/liabilities/recurring bills model), replaced with student-focused Personal Finance Tracker
- **Backend**: 6 new SQLAlchemy models (`fin_account`, `fin_category`, `fin_transaction`, `fin_budget`, `fin_goal`, `fin_subscription`)
- **Backend**: Complete new API at `/api/finance/*` — all CRUD + dashboard + analytics (category spend, daily trend, smart insights)
- **Backend**: Auto-seed 19 default categories on startup; balance auto-tracked on transaction mutations
- **Frontend**: 7 new finance pages under `/finance/*` (Dashboard, Transactions, Analytics, Budgets, Goals, Subscriptions, Manage)
- **Frontend**: api.ts fully rewritten — old finance types removed, new FinAccount/FinCategory/FinTransaction/etc types added
- **Frontend**: AppShell nav updated — "Net Worth" replaced with full Finance section (7 sub-pages)
- **Frontend**: App.tsx routes updated — old `/expense/*` routes replaced with `/finance/*`
- **Frontend**: AnalyticsPage Finance tab updated to use new dashboard + category spend endpoints
- **Frontend**: DashboardPage links updated from `/expense` to `/finance`
- **Cleanup**: Old expense pages deleted, models `__init__.py` cleaned up, main.py simplified

### Key architecture decisions
- Balance tracking: `_apply_balance()` helper with direction=+1 (apply) / -1 (reverse) called on create/update/delete
- Category spend: SQL GROUP BY category_id with JOIN for name/color/icon enrichment
- Insights engine: MoM comparison, burn rate projection, top category, high-spend day (MySQL `DAYOFWEEK()`), budget alerts, subscription reminders
- `daily_needed = (target - current) / days_left` — simple linear projection on goal deadline
