import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { logError } from '../server/utils/errorLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..', '..');

async function applyMigrations() {
  console.log('🚀 Starting database migrations...');
  
  // Get database configuration from environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'skylabs_dev',
    username: process.env.DB_USER || 'skylabs',
    password: process.env.DB_PASSWORD || 'skylabs',
  };

  const sql = postgres({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbConfig.password,
    ssl: false,
  });
  
  try {
    // Create migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS pg_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Get all migration files in order
    const migrationFiles = [
      '0001_initial_monitoring_tables.sql',
      '0002_add_email_to_users.sql',
      '0003_update_users_table.sql',
      '0004_add_security_fields.sql',
      '0005_add_login_security_columns.sql',
      '0006_create_contacts_table.sql'
    ];
    
    // Check which migrations have already been applied
    const appliedMigrations = await sql<{name: string}[]>`
      SELECT name FROM pg_migrations
    `;
    
    const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));
    
    // Apply pending migrations
    for (const migrationFile of migrationFiles) {
      if (!appliedMigrationNames.has(migrationFile)) {
        console.log(`🔄 Applying migration: ${migrationFile}`);
        
        try {
          const migrationPath = join(__dirname, 'migrations', migrationFile);
          const migrationSQL = await readFile(migrationPath, 'utf-8');
          
          // Execute the migration in a transaction
          await sql.begin(async sql => {
            await sql.unsafe(migrationSQL);
            await sql`
              INSERT INTO pg_migrations (name) 
              VALUES (${migrationFile})
            `;
          });
          
          console.log(`✅ Applied migration: ${migrationFile}`);
        } catch (error) {
          console.error(`❌ Failed to apply migration ${migrationFile}:`, error);
          await logError(
            error as Error,
            'Migration Failed',
            'Database',
            '🔴 Critical',
            { migration: migrationFile },
            'auto_migrations'
          );
          throw error;
        }
      } else {
        console.log(`⏩ Migration already applied: ${migrationFile}`);
      }
    }
    
    console.log('✅ All migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await logError(
      error as Error,
      'Migration Process',
      'Database',
      '🔴 Critical',
      { action: 'Database migration process failed' },
      'auto_migrations'
    );
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migrations
applyMigrations().catch(console.error);
