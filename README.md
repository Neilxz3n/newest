# Campus Lost & Found Management System

A modern, production-ready web-based Lost & Found platform designed for campuses, universities, and schools. Built with Angular, Node.js/Express, and PostgreSQL.

## Tech Stack

- **Frontend**: Angular 19 (Standalone Components, Reactive Forms, SCSS)
- **Backend**: Node.js + Express.js (REST API)
- **Database**: PostgreSQL 16 (ACID-compliant transactions)
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
- PostgreSQL 14+

### Backend Setup

```bash
cd backend
npm install

# Set up database
sudo -u postgres psql -c "CREATE USER campus_admin WITH PASSWORD 'campus_secret_2024';"
sudo -u postgres psql -c "CREATE DATABASE campus_lost_found OWNER campus_admin;"
sudo -u postgres psql -d campus_lost_found -c "GRANT ALL ON SCHEMA public TO campus_admin;"
PGPASSWORD=campus_secret_2024 psql -h localhost -U campus_admin -d campus_lost_found -f src/database/schema.sql
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
DB_HOST=localhost
DB_PORT=5432
DB_USER=campus_admin
DB_PASSWORD=campus_secret_2024
DB_NAME=campus_lost_found
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
