# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Backend (Express API) | `cd backend && node src/server.js` | 3000 | Requires PostgreSQL running |
| Frontend (Angular) | `cd frontend && npx ng serve` | 4200 | Proxies API calls to :3000 |
| PostgreSQL | `sudo service postgresql start` | 5432 | Must be started before backend |

### Database

- PostgreSQL 16 with database `campus_lost_found`, user `campus_admin`, password `campus_secret_2024`
- Schema: `backend/src/database/schema.sql`
- Seed data: `node backend/src/database/seed.js`
- To re-initialize: run schema.sql then seed.js

### Development startup sequence

1. `sudo service postgresql start`
2. `cd backend && node src/server.js` (or `npm run dev` for nodemon)
3. `cd frontend && npx ng serve`

### Lint

- Backend: `cd backend && npx eslint src/`
- Frontend: `cd frontend && npx ng lint` (0 errors expected; warnings for accessibility are acceptable)

### Build

- Frontend: `cd frontend && npx ng build`

### Tests

- Backend: `cd backend && npx jest --passWithNoTests`
- Frontend: `cd frontend && npx ng test` (if karma/jasmine configured)

### Key caveats

- The activity_logs table has a FK to users; activity logging must happen AFTER the user insert transaction commits (not inside the same transaction for new user creation).
- Frontend services call `http://localhost:3000/api/*` directly. No proxy config file is set up; both servers must run simultaneously.
- Backend uses `pg` pool with max 20 connections. PostgreSQL `max_connections` default (100) is sufficient.
- File uploads go to `backend/uploads/` directory which is served statically.
- Email sending will fail silently if SMTP credentials are not configured (logs to email_logs table with status='failed').
