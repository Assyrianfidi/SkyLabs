import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { logError } from '../server/utils/errorLogger';

// Configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MIGRATIONS_FOLDER = './migrations';

interface DatabaseConfig {
  url: string;
  dbName: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

/**
 * Validates the database configuration from environment variables
 */
function validateEnv(): DatabaseConfig {
  const requiredVars = ['DATABASE_URL'] as const;
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  const dbUrl = process.env.DATABASE_URL!;
  const urlMatch = dbUrl.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format. Expected: postgres://user:password@host:port/database');
  }

  return {
    url: dbUrl,
    user: urlMatch[1],
    password: urlMatch[2],
    host: urlMatch[3],
    port: parseInt(urlMatch[4], 10),
    dbName: urlMatch[5]
  };
}

/**
 * Executes a command with retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  maxRetries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${operation}:`, error);
      
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to execute ${operation} after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * Creates the database if it doesn't exist
 */
async function ensureDatabaseExists(config: DatabaseConfig): Promise<void> {
  console.log('🔍 Checking if database exists...');
  
  // Connect to the default 'postgres' database
  const rootUrl = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/postgres`;
  const client = postgres(rootUrl);
  
  try {
    // Check if database exists
    const result = await client`
      SELECT 1 FROM pg_database WHERE datname = ${config.dbName}
    `;
    
    if (result.length === 0) {
      console.log(`🔄 Creating database: ${config.dbName}`);
      await client.unsafe(`CREATE DATABASE ${config.dbName}`);
      console.log(`✅ Database created: ${config.dbName}`);
    } else {
      console.log(`ℹ️ Database already exists: ${config.dbName}`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Applies database migrations using Drizzle
 */
async function applyMigrations(): Promise<void> {
  console.log('🔄 Applying database migrations...');
  
  // Ensure migrations folder exists
  try {
    await fs.mkdir(MIGRATIONS_FOLDER, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
  
  // Generate migrations
  try {
    console.log('🔧 Generating migrations...');
    execSync('npx drizzle-kit generate:pg --schema=./shared/schema.ts', { stdio: 'inherit' });
    
    console.log('🚀 Applying migrations...');
    execSync('npx drizzle-kit migrate:pg --schema=./shared/schema.ts', { stdio: 'inherit' });
    
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error);
    throw error;
  }
}

/**
 * Verifies the database connection and checks if required tables exist
 */
async function verifyDatabaseConnection(config: DatabaseConfig): Promise<void> {
  console.log('🔌 Verifying database connection...');
  
  const client = postgres(config.url);
  
  try {
    // Test connection
    const result = await client`SELECT 1 as test`;
    if (result[0]?.test !== 1) {
      throw new Error('Database connection test failed');
    }
    console.log('✅ Database connection verified');
    
    // Check if required tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('📊 Database tables:', tables.map(t => t.table_name).join(', ') || 'No tables found');
  } finally {
    await client.end();
  }
}

/**
 * Main initialization function
 */
async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Validate environment variables
    const config = await executeWithRetry<DatabaseConfig>(
      async () => validateEnv(),
      'Environment validation'
    );
    
    // Ensure database exists
    await executeWithRetry<void>(
      async () => ensureDatabaseExists(config),
      'Database creation'
    );
    
    // Apply migrations
    await executeWithRetry<void>(
      async () => applyMigrations(),
      'Database migrations'
    );
    
    // Verify connection
    await executeWithRetry<void>(
      async () => verifyDatabaseConnection(config),
      'Database verification'
    );
    
    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database initialization failed:', error);
    
    // Log error to error log
    await logError(
      error instanceof Error ? error : new Error(String(error)),
      'Database Initialization',
      'Database',
      '🔴 Critical'
    );
    
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase().catch(console.error);
