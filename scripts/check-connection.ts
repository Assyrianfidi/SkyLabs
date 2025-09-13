#!/usr/bin/env node
import { Client } from 'pg';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

// Constants
const ERROR_LOG = join(process.cwd(), 'ERROR_LOG.md');

// Log function with timestamp
function log(message: string, type: 'info' | 'error' | 'success' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    error: '❌',
    success: '✅'
  }[type];
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Function to log errors to ERROR_LOG.md
function logError(error: Error, context: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `### ${timestamp} - ${context}

- **Error:** \`${error.message}\`
- **Stack Trace:** \`\`\`\n${error.stack || 'No stack trace'}\`\`\`
- **Status:** 🔴 Critical
- **Linked Task:** health_check

---\n`;

  try {
    writeFileSync(ERROR_LOG, logEntry, { flag: 'a' });
  } catch (logError) {
    console.error('❌ Failed to write to error log:', logError);
  }
}

// Function to check database connection
async function checkConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    log('Connecting to database...');
    await client.connect();
    
    // Test query
    const result = await client.query('SELECT version(), current_timestamp, current_database()');
    log('Successfully connected to database!', 'success');
    
    // Log database info
    log('\n📊 Database Information:');
    log(`- PostgreSQL Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    log(`- Current Database: ${result.rows[0].current_database}`);
    log(`- Server Timestamp: ${result.rows[0].current_timestamp}\n`);
    
    // Check if migrations table exists
    try {
      const migrations = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'"
      );
      
      if (migrations.rows.length > 0) {
        const migrationCount = await client.query('SELECT count(*) as count FROM __drizzle_migrations');
        log(`Found ${migrationCount.rows[0].count} applied migrations`, 'success');
      } else {
        log('No migrations table found. Run migrations with: npm run db:migrate:run', 'error');
      }
    } catch (migrationError) {
      log('Error checking migrations table', 'error');
      logError(migrationError as Error, 'Migration Check Failed');
    }
    
    return true;
  } catch (error) {
    log('Failed to connect to database', 'error');
    logError(error as Error, 'Database Connection Failed');
    return false;
  } finally {
    await client.end();
  }
}

// Run the check
(async () => {
  log('Starting database health check...');
  const success = await checkConnection();
  
  if (success) {
    log('✅ Database health check completed successfully!', 'success');
  } else {
    log('❌ Database health check failed!', 'error');
  }
})();
