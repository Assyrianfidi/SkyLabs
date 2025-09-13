import pg from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new pg.Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'Fkhouch8',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function createMigrationsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Creating migrations table...');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migrations table created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create migrations table:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createMigrationsTable();
