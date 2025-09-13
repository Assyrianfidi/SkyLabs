#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import { config } from 'dotenv';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

// Constants
const POSTGRES_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const PG_USER = 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || 'postgres'; // Default PostgreSQL password

// Database configuration
const DB_CONFIG = {
  user: 'skylabs',
  password: 'skylabs_password',
  host: 'localhost',
  port: '5432',
  database: process.env.NODE_ENV === 'production' ? 'skylabs_prod' : 'skylabs_dev',
};

// Helper function to run shell commands with proper error handling
function runCommand(command: string, args: string[] = [], options = {}) {
  try {
    console.log(`🚀 Executing: ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PGPASSWORD: PG_PASSWORD },
      ...options
    });
    
    if (result.status !== 0) {
      throw new Error(`Command failed with code ${result.status}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`, error);
    throw error;
  }
}

// Function to execute SQL commands
async function executeSQL(sql: string) {
  const tempFile = join(process.cwd(), 'temp.sql');
  try {
    writeFileSync(tempFile, sql);
    return runCommand(
      `"${POSTGRES_BIN}"`,
      [
        '-U', PG_USER,
        '-h', DB_CONFIG.host,
        '-p', DB_CONFIG.port,
        '-d', 'postgres',
        '-f', tempFile
      ]
    );
  } finally {
    try {
      if (existsSync(tempFile)) {
        require('fs').unlinkSync(tempFile);
      }
    } catch (e) {
      console.error('Failed to clean up temp file:', e);
    }
  }
}

// Function to log errors to ERROR_LOG.md
function logError(error: Error, context: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `### ${timestamp} - ${context}

- **Error:** \`${error.message}\`
- **Stack Trace:** \`\`\`\n${error.stack || 'No stack trace'}\`\`\`
- **Status:** 🔴 Critical
- **Linked Task:** db_setup

---\n`;

  try {
    const logPath = join(process.cwd(), 'ERROR_LOG.md');
    writeFileSync(logPath, logEntry, { flag: 'a' });
  } catch (logError) {
    console.error('❌ Failed to write to error log:', logError);
  }
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log('🔍 PostgreSQL Path:', POSTGRES_BIN);

  // Verify PostgreSQL version
  console.log('\n🔍 Checking PostgreSQL version...');
  try {
    runCommand(`"${POSTGRES_BIN}"`, ['--version']);
  } catch (error) {
    throw new Error(`PostgreSQL not found at ${POSTGRES_BIN}. Please ensure PostgreSQL 17 is installed.`);
  }

  // 1. Create database user if it doesn't exist
  console.log('\n🔧 Creating database user...');
  const createUserSQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_CONFIG.user}') THEN
        CREATE USER ${DB_CONFIG.user} WITH PASSWORD '${DB_CONFIG.password}';
        ALTER USER ${DB_CONFIG.user} CREATEDB CREATEROLE LOGIN;
        GRANT ALL PRIVILEGES ON DATABASE postgres TO ${DB_CONFIG.user};
        RAISE NOTICE 'User ${DB_CONFIG.user} created';
      ELSE
        RAISE NOTICE 'User ${DB_CONFIG.user} already exists';
      END IF;
    END
    $$;
  `;

  await executeSQL(createUserSQL);

  // 2. Create database if it doesn't exist
  console.log('\n🔧 Creating database...');
  const createDbSQL = `
    SELECT 'CREATE DATABASE ${DB_CONFIG.database}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_CONFIG.database}')\gexec
  `;
  
  await executeSQL(createDbSQL);

  // 3. Grant privileges
  console.log('\n🔧 Setting up permissions...');
  const grantSQL = `
    GRANT ALL PRIVILEGES ON DATABASE ${DB_CONFIG.database} TO ${DB_CONFIG.user};
    ALTER DATABASE ${DB_CONFIG.database} OWNER TO ${DB_CONFIG.user};
  `;
  
  await executeSQL(grantSQL);

  // 4. Update .env with database URL
  console.log('\n🔧 Updating .env file...');
  const envPath = join(process.cwd(), '.env');
  const envContent = `# Database
DATABASE_URL=postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}

# Session
SESSION_SECRET=${process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex')}

# App
NODE_ENV=${process.env.NODE_ENV || 'development'}
CORS_ORIGIN=${process.env.CORS_ORIGIN || 'http://localhost:3000'}
CONTACT_EMAIL=${process.env.CONTACT_EMAIL || 'fidi.amazon@gmail.com'}
ENABLE_MAILING=${process.env.ENABLE_MAILING || 'false'}
`;
  
  writeFileSync(envPath, envContent);
  console.log('✅ .env file updated with database configuration');

  // 5. Run migrations
  console.log('\n🔄 Running migrations...');
  try {
    runCommand('npx', ['drizzle-kit', 'push:pg'], {
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`
      }
    });
  } catch (error) {
    console.warn('⚠️  Failed to run migrations. Make sure Drizzle is properly configured.');
    console.warn('You may need to run migrations manually with: npm run db:migrate:run');
  }

  console.log('\n✅ Database setup completed successfully!');
  console.log(`📊 Database: ${DB_CONFIG.database}`);
  console.log(`👤 User: ${DB_CONFIG.user}`);
  console.log(`🔗 Connection string: postgresql://${DB_CONFIG.user}:*****@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log('\n🚀 Next steps:');
  console.log('1. Verify the database connection in your application');
  console.log('2. Run the application with: npm run dev');
}

// Run the setup
(async () => {
  try {
    await setupDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    logError(error as Error, 'Database Setup Failed');
    process.exit(1);
  }
})();
