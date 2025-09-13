const { Pool } = require('pg');
const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

async function runMigrations() {
  const pool = new Pool({
    user: process.env.DB_USER || 'skylabs',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skylabs_dev',
    password: process.env.DB_PASSWORD || 'skylabs',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and execute each migration file
    const migrationFiles = [
      '../db/migrations/0001_create_contacts_table.sql'
    ];

    for (const file of migrationFiles) {
      const filePath = join(__dirname, file);
      const sql = readFileSync(filePath, 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
    }
    
    await client.query('COMMIT');
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations().catch(console.error);
