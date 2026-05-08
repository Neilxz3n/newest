# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Backend (Express API) | `cd backend && node src/server.js` | 3000 | Uses SQLite (no external DB needed) |
| Frontend (Angular) | `cd frontend && npx ng serve` | 4200 | Proxies API calls to :3000 |

### Database

- SQLite via `better-sqlite3`, stored at `backend/data/campus_lost_found.db`
- Schema auto-applied on first server start if tables don't exist
- Manual init: `cd backend && node src/database/init.js` (drops and recreates all tables)
- Seed data: `cd backend && node src/database/seed.js`

### Development startup sequence

1. `cd backend && node src/server.js` (or `npm run dev` for nodemon)
2. `cd frontend && npx ng serve`

No external database service needed — SQLite is embedded.

### Lint

- Backend: `cd backend && npx eslint src/`
- Frontend: `cd frontend && npx ng lint`

### Build

- Frontend: `cd frontend && npx ng build`

### Tests

- Backend: `cd backend && npx jest --passWithNoTests`
- Frontend: `cd frontend && npx ng test` (if karma/jasmine configured)

### Key caveats

- All DB calls in controllers/services are synchronous (better-sqlite3). Route handlers remain `async (req, res)` for Express compatibility but DB operations do not use await.
- Transactions use `db.transaction(() => { ... })()` pattern. Errors thrown inside automatically trigger rollback.
- Boolean columns (`is_active`, `is_read`) use INTEGER 0/1 in SQLite.
- `datetime('now')` is used for timestamps in SQLite (stored as TEXT in ISO format).
- Frontend services call `http://localhost:3000/api/*` directly. Both servers must run simultaneously.
- File uploads go to `backend/uploads/` directory which is served statically.
- Email sending will fail silently if SMTP credentials are not configured (logs to email_logs table with status='failed').
