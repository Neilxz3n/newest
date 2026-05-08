const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

function seedDatabase() {
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'campus_lost_found.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const seed = db.transaction(() => {
    db.exec(`
      INSERT OR IGNORE INTO campuses (campus_name, address, phone, email) VALUES
      ('Main Campus', '123 University Avenue, Metro City', '+1-555-0100', 'main@university.edu'),
      ('North Campus', '456 College Road, North District', '+1-555-0200', 'north@university.edu'),
      ('South Campus', '789 Academic Blvd, South District', '+1-555-0300', 'south@university.edu')
    `);
    console.log('Campuses seeded');

    db.exec(`
      INSERT OR IGNORE INTO departments (name, campus_id) VALUES
      ('Computer Science', 1),
      ('Engineering', 1),
      ('Business Administration', 1),
      ('Arts and Humanities', 2),
      ('Natural Sciences', 2),
      ('Mathematics', 3),
      ('Library Services', 1),
      ('Student Affairs', 1)
    `);
    console.log('Departments seeded');

    db.exec(`
      INSERT OR IGNORE INTO categories (category_name, icon) VALUES
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
    `);
    console.log('Categories seeded');

    const adminPass = bcrypt.hashSync('Admin@123', 12);
    const studentPass = bcrypt.hashSync('Student@123', 12);
    const facultyPass = bcrypt.hashSync('Faculty@123', 12);

    const insertUser = db.prepare(
      'INSERT OR IGNORE INTO users (full_name, email, password, role, student_id, department_id, campus_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertUser.run('System Administrator', 'admin@campus.edu', adminPass, 'admin', null, 1, 1, '+1-555-0001');
    insertUser.run('John Doe', 'john.doe@campus.edu', studentPass, 'student', 'STU-2024-001', 1, 1, '+1-555-1001');
    insertUser.run('Dr. Jane Smith', 'jane.smith@campus.edu', facultyPass, 'faculty', null, 2, 1, '+1-555-2001');
    console.log('Users seeded');

    db.exec(`
      INSERT OR IGNORE INTO lost_items (user_id, category_id, item_name, description, location, date_lost, status, campus_id, department_id, contact_info) VALUES
      (2, 1, 'MacBook Pro 14 inch', 'Silver MacBook Pro with CS department sticker on the lid.', 'Library - 2nd Floor Study Area', '2024-03-15', 'pending', 1, 1, 'john.doe@campus.edu'),
      (2, 5, 'Toyota Car Keys', 'Black Toyota key fob with a red lanyard attached.', 'Parking Lot B - Near Engineering Building', '2024-03-18', 'pending', 1, 2, 'john.doe@campus.edu'),
      (3, 2, 'Calculus Textbook', 'Stewart Calculus 8th Edition with highlights.', 'Room 301 - Science Building', '2024-03-20', 'matched', 1, 5, 'jane.smith@campus.edu')
    `);
    console.log('Lost items seeded');

    db.exec(`
      INSERT OR IGNORE INTO found_items (user_id, category_id, item_name, description, location, pickup_location, date_found, status, campus_id, verification_notes) VALUES
      (3, 1, 'Silver Laptop', 'MacBook Pro found unattended with a sticker on the lid.', 'Library - Near exit on 2nd floor', 'Campus Security Office', '2024-03-16', 'pending', 1, 'Turned in to library staff.'),
      (2, 6, 'Student ID Card', 'University ID card found near the cafeteria.', 'Main Cafeteria', 'Student Affairs Office', '2024-03-19', 'pending', 1, NULL),
      (3, 3, 'Blue Denim Jacket', 'Blue denim jacket size M found in lecture hall.', 'Lecture Hall A - Row 5', 'Lost and Found Counter', '2024-03-20', 'pending', 1, 'No identifying marks.')
    `);
    console.log('Found items seeded');

    db.exec(`
      INSERT OR IGNORE INTO item_matches (lost_item_id, found_item_id, confidence_score, match_reason) VALUES
      (1, 1, 85.50, 'Same category, similar description, location and date proximity')
    `);
    console.log('Matches seeded');

    db.exec(`
      INSERT OR IGNORE INTO announcements (title, content, priority, created_by, campus_id) VALUES
      ('Lost and Found Office Hours Extended', 'The Lost and Found office is now open 8 AM to 8 PM weekdays.', 'high', 1, 1),
      ('End of Semester Item Disposal', 'All unclaimed items will be donated after June 30.', 'urgent', 1, 1)
    `);
    console.log('Announcements seeded');
  });

  seed();

  db.close();
  console.log('\nDatabase seeding complete!');
  console.log('\nDemo Accounts:');
  console.log('  Admin:   admin@campus.edu / Admin@123');
  console.log('  Student: john.doe@campus.edu / Student@123');
  console.log('  Faculty: jane.smith@campus.edu / Faculty@123');
}

seedDatabase();
