# PersonalOS

Monorepo:
- `backend/` = FastAPI (Python) + MySQL
- `frontend/` = React (Vite + TypeScript) + Tailwind

## Run backend (FastAPI)

1) Set DB credentials in `backend/.env` (this file is gitignored)
2) Start API:

```powershell
Set-Location d:\Learn\Project\PersonalOS\backend
& "D:/Learn/Project/PersonalOS/.venv/Scripts/python.exe" -m uvicorn app.main:app --reload --port 8000
```

API health:
- http://localhost:8000/api/health

## Run frontend (React)

```powershell
Set-Location d:\Learn\Project\PersonalOS\frontend
npm run dev
```

Frontend:
- http://localhost:5173

Note:
- The frontend dev server proxies `/api/*` to `http://127.0.0.1:8000` (see `frontend/vite.config.ts`).
- If you want to bypass the proxy, set `VITE_API_BASE_URL` in `frontend/.env` (example: `VITE_API_BASE_URL=http://127.0.0.1:8000`).

## Environment files

- `backend/.env.example` -> copy to `backend/.env`
- `frontend/.env.example` -> copy to `frontend/.env` (optional; defaults to using the Vite `/api` proxy)

## Mode (initial)

This project starts in **single-user mode** (no auth) to ship the first module quickly.
