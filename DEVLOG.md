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
6. **Finance UX Fixes** — Recurring liability EMI flow, goal allocation UI
7. ~~**Attendance Module**~~ ✓ Done (inside Daily Canvas)
8. **Life Calendar** — Aggregation API + full-year grid page
9. **Analytics (Unified)** — Cross-module graphs (habits heatmap, sleep trend, mood timeline)
10. **Weekly Reflection** — Prompted workflow
11. **Reminders** — Browser notification engine
12. **Global Search** — Ctrl+K palette
13. **Backup & Restore** — Export/import JSON
