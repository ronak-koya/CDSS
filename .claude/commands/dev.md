# /dev — Start Dev Servers

Start both backend and frontend development servers.

> ℹ️ Run each command in a **separate terminal**.

## Terminal 1 — Backend (port 5000):
```bash
cd c:/Users/Bacancy/Downloads/CDSS/backend && export PATH="$PATH:/c/Users/Bacancy/AppData/Roaming/npm" && nvm use 20.20.1 && pnpm run dev
```

## Terminal 2 — Frontend (port 5173):
```bash
cd c:/Users/Bacancy/Downloads/CDSS/frontend && export PATH="$PATH:/c/Users/Bacancy/AppData/Roaming/npm" && pnpm run dev
```

## URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- WebSocket: ws://localhost:5000/ws

## Test Credentials
| Role   | Email                    | Password    |
|--------|--------------------------|-------------|
| Doctor | dr.smith@cdss.com        | Password123! |
| Nurse  | nurse.jones@cdss.com     | Password123! |
| Admin  | admin@cdss.com           | Password123! |

## Node version note
Node must be v20.20.1. If you see errors, run: `nvm use 20.20.1`
