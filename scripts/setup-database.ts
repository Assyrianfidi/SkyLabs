#!/usr/bin/env node
import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const DB_CONFIG = {
  user: process.env.DB_USER || 'skylabs_app',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.NODE_ENV === 'production' 
    ? 'skylabs_prod' 
    : 'skylabs_dev',
};

// PostgreSQL connection string for admin operations
const PG_URI = `postgresql://postgres:${process.env.DB_ROOT_PASSWORD || 'postgres'}@${DB_CONFIG.host}:${DB_CONFIG.port}/postgres`;

// Helper function to run shell commands
function runCommand(command: string, env: NodeJS.ProcessEnv = {}) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`, error);
    return false;
  }
}

// Create database user
async function createDatabaseUser() {
  console.log('🔄 Creating database user...');
  
  const createUserSQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_CONFIG.user}') THEN
        CREATE USER ${DB_CONFIG.user} WITH PASSWORD '${DB_CONFIG.password}';
        ALTER USER ${DB_CONFIG.user} CREATEDB;
        ALTER USER ${DB_CONFIG.user} CREATEROLE;
        ALTER USER ${DB_CONFIG.user} LOGIN;
        GRANT ALL PRIVILEGES ON DATABASE postgres TO ${DB_CONFIG.user};
        RAISE NOTICE 'User ${DB_CONFIG.user} created';
      ELSE
        RAISE NOTICE 'User ${DB_CONFIG.user} already exists';
      END IF;
    END
    $$;
  `;

  return runCommand(`psql "${PG_URI}" -c "${createUserSQL.replace(/\n/g, ' ')}"`);
}

// Create database
async function createDatabase() {
  console.log('🔄 Creating database...');
  
  const createDbSQL = `
    SELECT 'CREATE DATABASE ${DB_CONFIG.database}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_CONFIG.database}')\gexec
  `;

  if (!runCommand(`psql "${PG_URI}" -c "${createDbSQL}"`)) {
    return false;
  }

  // Grant privileges to the user
  const grantSQL = `
    GRANT ALL PRIVILEGES ON DATABASE ${DB_CONFIG.database} TO ${DB_CONFIG.user};
    ALTER DATABASE ${DB_CONFIG.database} OWNER TO ${DB_CONFIG.user};
  `;

  return runCommand(`psql "${PG_URI}" -c "${grantSQL}"`);
}

// Run migrations
async function runMigrations() {
  console.log('🔄 Running migrations...');
  return runCommand('npm run db:migrate:run', {
    DATABASE_URL: `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
  });
}

// Main function
async function main() {
  console.log('🚀 Starting database setup...');
  
  // Check if psql is installed
  try {
    execSync('psql --version', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ PostgreSQL client (psql) is not installed or not in PATH');
    process.exit(1);
  }

  // Execute setup steps
  const steps = [
    { name: 'Create database user', fn: createDatabaseUser },
    { name: 'Create database', fn: createDatabase },
    { name: 'Run migrations', fn: runMigrations },
  ];

  for (const step of steps) {
    console.log(`\n🔹 ${step.name}...`);
    const success = await step.fn();
    if (!success) {
      console.error(`❌ Failed to ${step.name.toLowerCase()}`);
      process.exit(1);
    }
    console.log(`✅ ${step.name} completed successfully`);
  }

  console.log('\n🎉 Database setup completed successfully!');
  console.log(`📊 Database: ${DB_CONFIG.database}`);
  console.log(`👤 User: ${DB_CONFIG.user}`);
  console.log(`🔗 Connection string: postgresql://${DB_CONFIG.user}:*****@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
}

// Run the setup
main().catch(error => {
  console.error('❌ Database setup failed:', error);
  process.exit(1);
});
