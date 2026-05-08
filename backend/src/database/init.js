const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function initDatabase() {
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'campus_lost_found.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schema);
  console.log('Schema applied successfully');

  db.close();
  console.log('\nDatabase initialization complete!');
}

initDatabase();
