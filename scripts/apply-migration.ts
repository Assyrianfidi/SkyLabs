import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'Fkhouch8',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Applying migration: Adding login security columns to users table');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0005_add_login_security_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    // Record the migration in the migrations table
    await client.query(
      `INSERT INTO migrations (name, executed_at) 
       VALUES ($1, NOW()) 
       ON CONFLICT (name) DO NOTHING`,
      ['0005_add_login_security_columns']
    );
    
    await client.query('COMMIT');
    console.log('✅ Migration applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('❌ Error applying migration:', error);
  process.exit(1);
});
