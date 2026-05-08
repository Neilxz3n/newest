# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Backend (Express API) | `cd backend && node src/server.js` | 3000 | Auto-creates SQLite DB on startup |
| Frontend (Angular) | `cd frontend && npx ng serve` | 4200 | Proxies API calls to :3000 |

### Database

- SQLite via `better-sqlite3` (file-based, no server needed)
- Database file: `backend/data/campus_lost_found.db` (auto-created)
- Schema: `backend/src/database/schema.sql`
- Seed data: `node backend/src/database/seed.js`
- To reset: delete `backend/data/` folder and re-run seed

### Development startup sequence

1. `cd backend && node src/database/init.js && node src/database/seed.js` (first time only)
2. `cd backend && node src/server.js` (or `npm run dev` for nodemon)
3. `cd frontend && npx ng serve`

### Lint

- Backend: `cd backend && npx eslint src/`
- Frontend: `cd frontend && npx ng lint`

### Build

- Frontend: `cd frontend && npx ng build`

### Key caveats

- No PostgreSQL or external database needed - SQLite is file-based.
- The server auto-initializes the schema on startup if tables don't exist.
- Frontend services call `http://localhost:3000/api/*` directly. Both servers must run simultaneously.
- File uploads go to `backend/uploads/` directory which is served statically.
- Email sending will fail silently if SMTP credentials are not configured (logs to email_logs table with status='failed').
