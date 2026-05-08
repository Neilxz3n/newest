# Campus Lost & Found Management System

A modern, production-ready web-based Lost & Found platform designed for campuses, universities, and schools. Built with Angular, Node.js/Express, and PostgreSQL.

## Tech Stack

- **Frontend**: Angular 19 (Standalone Components, Reactive Forms, SCSS)
- **Backend**: Node.js + Express.js (REST API)
- **Database**: SQLite via better-sqlite3 (ACID-compliant, no server needed)
- **Auth**: JWT Authentication with bcrypt password hashing
- **Real-time**: Socket.io for live notifications
- **Email**: Nodemailer with Gmail SMTP support

## Features

- Role-based authentication (Student, Faculty, Admin)
- Report lost/found items with image uploads
- Smart matching system with confidence scoring
- Claim request workflow with admin approval
- ACID-compliant database transactions
- Real-time notifications via Socket.io
- Email notifications (claim approved/rejected, match found)
- Admin dashboard with analytics
- Responsive, modern UI with glassmorphism design

## Quick Start

### Prerequisites

- Node.js 18+

### Backend Setup

```bash
cd backend
npm install

# Initialize and seed database (SQLite - no server needed)
node src/database/init.js
node src/database/seed.js

# Start server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npx ng serve
```

### Demo Accounts

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@campus.edu       | Admin@123   |
| Student | john.doe@campus.edu    | Student@123 |
| Faculty | jane.smith@campus.edu  | Faculty@123 |

## API Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/items/lost` - List lost items
- `POST /api/items/lost` - Report lost item
- `GET /api/items/found` - List found items
- `POST /api/items/found` - Report found item
- `POST /api/claims` - Submit claim
- `PUT /api/claims/:id/approve` - Approve claim (admin)
- `PUT /api/claims/:id/reject` - Reject claim (admin)
- `GET /api/admin/dashboard` - Dashboard stats (admin)
- `GET /api/notifications` - User notifications

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```
JWT_SECRET=your_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Architecture

```
/backend
  /src
    /config       - Database, JWT, email configuration
    /controllers  - Route handlers with business logic
    /middleware   - Auth, validation, file upload
    /routes       - Express route definitions
    /services     - Email, notifications, matching, activity
    /database     - Schema, migrations, seed data
/frontend
  /src/app
    /models       - TypeScript interfaces
    /services     - HTTP services (auth, items, claims, admin)
    /guards       - Route guards (auth, admin)
    /interceptors - HTTP interceptors (JWT token)
    /pages        - Page components (landing, dashboard, etc.)
```
