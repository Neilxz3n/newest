-- Campus Lost & Found Management System
-- Database Schema - SQLite
-- Demonstrates ACID-compliant transaction management

DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS item_matches;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS found_items;
DROP TABLE IF EXISTS lost_items;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS campuses;

CREATE TABLE campuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campus_name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    campus_id INTEGER NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(name, campus_id)
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
    student_id TEXT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    campus_id INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
    avatar TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    reset_token TEXT,
    reset_token_expires TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE lost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    item_name TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    location TEXT NOT NULL,
    date_lost TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'claimed', 'archived')),
    campus_id INTEGER REFERENCES campuses(id),
    department_id INTEGER REFERENCES departments(id),
    contact_info TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE found_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    item_name TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    location TEXT NOT NULL,
    pickup_location TEXT,
    date_found TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'claimed', 'archived')),
    campus_id INTEGER REFERENCES campuses(id),
    department_id INTEGER REFERENCES departments(id),
    verification_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lost_item_id INTEGER REFERENCES lost_items(id) ON DELETE SET NULL,
    found_item_id INTEGER REFERENCES found_items(id) ON DELETE SET NULL,
    claimant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proof TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE item_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lost_item_id INTEGER NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
    found_item_id INTEGER NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_reason TEXT,
    is_confirmed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(lost_item_id, found_item_id)
);

CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('match_found', 'claim_approved', 'claim_rejected', 'status_update', 'announcement', 'system')),
    is_read INTEGER DEFAULT 0,
    reference_id INTEGER,
    reference_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_active INTEGER DEFAULT 1,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campus_id INTEGER REFERENCES campuses(id),
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
