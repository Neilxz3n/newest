# AGENTS.md

## Cursor Cloud specific instructions

This is a Campus Lost & Found Management System with an Angular frontend and a Node.js backend.

### Frontend (`/workspace/frontend`)
- Angular 21 standalone component project
- Dev server: `npx ng serve --port 4200` (from the frontend directory)
- Build: `npx ng build`
- TypeScript check: `npx tsc --noEmit`
- The Angular CLI will prompt interactively on first run; use `--no-interactive` or pre-disable analytics via `npx ng analytics disable`
- `socket.io-client` is used in `NotificationService` for real-time notifications
- `@angular/animations` is required for `provideAnimations()` in `app.config.ts`

### Backend (`/workspace/backend`)
- See backend directory for details (Node.js/Express API on port 3000)
