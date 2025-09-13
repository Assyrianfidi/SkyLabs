import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

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
    
    // Read and execute the migration file
    const migrationPath = join(__dirname, 'server', 'db', 'migrations', '0001_create_contacts_table.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    console.log('Running migration...');
    await client.query(sql);
    
    await client.query('COMMIT');
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
