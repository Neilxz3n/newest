const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'campus_secret_2024',
    database: 'postgres',
  });

  try {
    const dbName = process.env.DB_NAME || 'campus_lost_found';
    const dbUser = process.env.DB_USER || 'campus_admin';
    const dbPassword = process.env.DB_PASSWORD || 'campus_secret_2024';

    // Create user if not exists
    const userExists = await adminPool.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`, [dbUser]
    );
    if (userExists.rows.length === 0) {
      await adminPool.query(`CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
      console.log(`✓ User "${dbUser}" created`);
    } else {
      console.log(`✓ User "${dbUser}" already exists`);
    }

    // Create database if not exists
    const dbExists = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (dbExists.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName} OWNER ${dbUser}`);
      console.log(`✓ Database "${dbName}" created`);
    } else {
      console.log(`✓ Database "${dbName}" already exists`);
    }

    // Grant privileges
    await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`);
    await adminPool.end();

    // Connect to the new database and run schema
    const appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await appPool.query(schema);
    console.log('✓ Schema applied successfully');

    await appPool.end();
    console.log('\n✅ Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    process.exit(1);
  }
}

initDatabase();
