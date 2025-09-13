// scripts/run-migrations.js
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFile } from 'fs/promises';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS pg_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const result = await client.query('SELECT name FROM pg_migrations');
    const appliedMigrations = new Set(result.rows.map(row => row.name));

    // Get all migration files in order
    const migrationFiles = [
      '0001_initial_monitoring_tables.sql',
      '0002_add_email_to_users.sql',
      '0003_update_users_table.sql'
      // Add more migrations here as they are created
    ].sort(); // Ensure migrations are applied in order

    // Apply pending migrations
    for (const migrationFile of migrationFiles) {
      if (!appliedMigrations.has(migrationFile)) {
        console.log(`🔄 Applying migration: ${migrationFile}`);
        
        const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
        const migrationSQL = await readFile(migrationPath, 'utf-8');
        
        await client.query(migrationSQL);
        await client.query(
          'INSERT INTO pg_migrations (name) VALUES ($1)',
          [migrationFile]
        );
        
        console.log(`✅ Applied migration: ${migrationFile}`);
      }
    }

    await client.query('COMMIT');
    console.log('✅ All migrations applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
