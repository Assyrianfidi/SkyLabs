#!/usr/bin/env node
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import { logError } from '../server/utils/errorLogger.js';

// Load environment variables
config();

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

async function validateDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    log('DATABASE_URL is not defined in .env file', 'error');
    console.log('\nPlease add the following to your .env file:');
    console.log('DATABASE_URL=postgresql://username:password@localhost:5432/database_name');
    process.exit(1);
  }

  log(`Testing database connection to: ${connectionString.replace(/:([^:]*?)@/, ':***@')}`);
  
  try {
    // Test basic connection
    const sql = postgres(connectionString, { max: 1, idle_timeout: 5 });
    
    // Test query
    const result = await sql`SELECT version(), current_timestamp, current_database()`;
    log(`✅ Successfully connected to database: ${result[0].current_database}`, 'success');
    log(`📊 PostgreSQL Version: ${result[0].version.split(' ').slice(0, 2).join(' ')}`);
    log(`⏰ Server Time: ${result[0].current_timestamp}`);
    
    // Test Drizzle ORM
    const db = drizzle(sql, { schema });
    const tables = await db.select().from(schema.users).limit(1).catch(() => []);
    log(`🔍 Successfully queried database schema`, 'success');
    
    await sql.end();
    return true;
  } catch (error) {
    const err = error as Error;
    log(`Failed to connect to database: ${err.message}`, 'error');
    
    await logError(err, 'Database Connection Test', 'Database', '🔴 Critical');
    
    if (err.message.includes('connection refused')) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Make sure PostgreSQL is running');
      console.log('2. Verify the host and port in DATABASE_URL are correct');
      console.log('3. Check if the database and user exist');
      console.log('4. Verify the password in DATABASE_URL is correct');
    } else if (err.message.includes('does not exist')) {
      console.log('\n🔧 The specified database does not exist. Create it with:');
      console.log('   createdb your_database_name');
    }
    
    return false;
  }
}

// Run the validation
(async () => {
  log('Starting database connection validation...');
  const success = await validateDatabaseConnection();
  
  if (success) {
    log('✅ Database connection test completed successfully!', 'success');
  } else {
    log('❌ Database connection test failed', 'error');
    process.exit(1);
  }
})();
