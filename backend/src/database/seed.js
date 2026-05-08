const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seedDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'campus_admin',
    password: process.env.DB_PASSWORD || 'campus_secret_2024',
    database: process.env.DB_NAME || 'campus_lost_found',
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO campuses (campus_name, address, phone, email) VALUES
      ('Main Campus', '123 University Avenue, Metro City', '+1-555-0100', 'main@university.edu'),
      ('North Campus', '456 College Road, North District', '+1-555-0200', 'north@university.edu'),
      ('South Campus', '789 Academic Blvd, South District', '+1-555-0300', 'south@university.edu')
      ON CONFLICT (campus_name) DO NOTHING
    `);
    console.log('Campuses seeded');

    await client.query(`
      INSERT INTO departments (name, campus_id) VALUES
      ('Computer Science', 1),
      ('Engineering', 1),
      ('Business Administration', 1),
      ('Arts and Humanities', 2),
      ('Natural Sciences', 2),
      ('Mathematics', 3),
      ('Library Services', 1),
      ('Student Affairs', 1)
      ON CONFLICT (name, campus_id) DO NOTHING
    `);
    console.log('Departments seeded');

    await client.query(`
      INSERT INTO categories (category_name, icon) VALUES
      ('Electronics', 'devices'),
      ('Books and Documents', 'menu_book'),
      ('Clothing', 'checkroom'),
      ('Bags and Wallets', 'backpack'),
      ('Keys', 'key'),
      ('ID Cards', 'badge'),
      ('Jewelry', 'diamond'),
      ('Sports Equipment', 'sports_soccer'),
      ('Stationery', 'edit'),
      ('Other', 'category')
      ON CONFLICT (category_name) DO NOTHING
    `);
    console.log('Categories seeded');

    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await client.query(`
      INSERT INTO users (full_name, email, password, role, department_id, campus_id, phone)
      VALUES ('System Administrator', 'admin@campus.edu', $1, 'admin', 1, 1, '+1-555-0001')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    const studentPassword = await bcrypt.hash('Student@123', 12);
    await client.query(`
      INSERT INTO users (full_name, email, password, role, student_id, department_id, campus_id, phone)
      VALUES ('John Doe', 'john.doe@campus.edu', $1, 'student', 'STU-2024-001', 1, 1, '+1-555-1001')
      ON CONFLICT (email) DO NOTHING
    `, [studentPassword]);

    const facultyPassword = await bcrypt.hash('Faculty@123', 12);
    await client.query(`
      INSERT INTO users (full_name, email, password, role, department_id, campus_id, phone)
      VALUES ('Dr. Jane Smith', 'jane.smith@campus.edu', $1, 'faculty', 2, 1, '+1-555-2001')
      ON CONFLICT (email) DO NOTHING
    `, [facultyPassword]);
    console.log('Users seeded');

    await client.query(`
      INSERT INTO lost_items (user_id, category_id, item_name, description, location, date_lost, status, campus_id, department_id, contact_info) VALUES
      (2, 1, 'MacBook Pro 14 inch', 'Silver MacBook Pro with CS department sticker on the lid.', 'Library - 2nd Floor Study Area', '2024-03-15', 'pending', 1, 1, 'john.doe@campus.edu'),
      (2, 5, 'Toyota Car Keys', 'Black Toyota key fob with a red lanyard attached.', 'Parking Lot B - Near Engineering Building', '2024-03-18', 'pending', 1, 2, 'john.doe@campus.edu'),
      (3, 2, 'Calculus Textbook', 'Stewart Calculus 8th Edition with highlights.', 'Room 301 - Science Building', '2024-03-20', 'matched', 1, 5, 'jane.smith@campus.edu')
      ON CONFLICT DO NOTHING
    `);
    console.log('Lost items seeded');

    await client.query(`
      INSERT INTO found_items (user_id, category_id, item_name, description, location, pickup_location, date_found, status, campus_id, verification_notes) VALUES
      (3, 1, 'Silver Laptop', 'MacBook Pro found unattended with a sticker on the lid.', 'Library - Near exit on 2nd floor', 'Campus Security Office', '2024-03-16', 'pending', 1, 'Turned in to library staff.'),
      (2, 6, 'Student ID Card', 'University ID card found near the cafeteria.', 'Main Cafeteria', 'Student Affairs Office', '2024-03-19', 'pending', 1, NULL),
      (3, 3, 'Blue Denim Jacket', 'Blue denim jacket size M found in lecture hall.', 'Lecture Hall A - Row 5', 'Lost and Found Counter', '2024-03-20', 'pending', 1, 'No identifying marks.')
      ON CONFLICT DO NOTHING
    `);
    console.log('Found items seeded');

    await client.query(`
      INSERT INTO item_matches (lost_item_id, found_item_id, confidence_score, match_reason) VALUES
      (1, 1, 85.50, 'Same category, similar description, location and date proximity')
      ON CONFLICT DO NOTHING
    `);
    console.log('Matches seeded');

    await client.query(`
      INSERT INTO announcements (title, content, priority, created_by, campus_id) VALUES
      ('Lost and Found Office Hours Extended', 'The Lost and Found office is now open 8 AM to 8 PM weekdays.', 'high', 1, 1),
      ('End of Semester Item Disposal', 'All unclaimed items will be donated after June 30.', 'urgent', 1, 1)
      ON CONFLICT DO NOTHING
    `);
    console.log('Announcements seeded');

    await client.query('COMMIT');
    console.log('\nDatabase seeding complete!');
    console.log('\nDemo Accounts:');
    console.log('  Admin:   admin@campus.edu / Admin@123');
    console.log('  Student: john.doe@campus.edu / Student@123');
    console.log('  Faculty: jane.smith@campus.edu / Faculty@123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
