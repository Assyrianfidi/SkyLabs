import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schema.js';
import dbConfig from './config.js';
import { promises as fs } from 'fs';
import path from 'path';

// Simple error logging function
async function logError(
  error: Error, 
  context: string = '', 
  category: string = 'Database',
  severity: '🔴 Critical' | '🟠 Major' | '🟢 Minor' = '🔴 Critical',
  metadata: Record<string, any> = {},
  taskId?: string
) {
  const timestamp = new Date().toISOString();
  const fixSuggestion = getFixSuggestion(error);
  
  const errorEntry = `### ${timestamp} - ${context}

- **Category:** ${category}
- **Severity:** ${severity}
- **Error Message:** \`${error.message}\`
- **Fix Suggestion:** ${fixSuggestion}
- **Status:** 🔄 Pending
- **Stack Trace:** \`\`\`\n${error.stack || 'No stack trace available'}\`\`\`
- **Metadata:** \`\`\`json\n${JSON.stringify(metadata, null, 2)}\`\`\`
${taskId ? `- **Linked Task:** [${taskId}](${path.join(process.cwd(), 'TODO.md')}#${taskId.toLowerCase().replace(/\s+/g, '-')})\n` : ''}---\n`;

  try {
    const logPath = path.join(process.cwd(), 'ERROR_LOG.md');
    const currentContent = await fs.readFile(logPath, 'utf-8').catch(() => '');
    await fs.writeFile(logPath, errorEntry + currentContent);
  } catch (logError) {
    console.error('❌ Failed to write to error log:', logError);
  }
  
  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${severity}] ${category}: ${error.message}`);
    if (Object.keys(metadata).length > 0) {
      console.error('Metadata:', metadata);
    }
  }
}

// Database connection configuration
const DB_CONFIG = {
  ...dbConfig,
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
};

// Get fix suggestion for common database errors
function getFixSuggestion(error: Error): string {
  if (error.message.includes('DATABASE_URL')) {
    return 'Check if .env file exists and contains a valid DATABASE_URL. See .env.example for format.';
  }
  if (error.message.includes('connection refused')) {
    return 'Verify PostgreSQL is running and accessible. Check host, port, and credentials.';
  }
  return 'Check database configuration and network connectivity.';
}

// Database connection with exponential backoff retry
async function createDatabaseConnection() {
  // Validate required configuration
  if (!DB_CONFIG.user || !DB_CONFIG.password || !DB_CONFIG.database) {
    throw new Error('Database configuration is incomplete. Check your .env file');
  }

  let lastError: Error | null = null;
  let attempt = 0;
  const maxRetries = DB_CONFIG.maxRetries;
  const baseDelay = DB_CONFIG.retryDelay;

  while (attempt < maxRetries) {
    attempt++;
    
    try {
      console.log(`🔌 Connecting to database (attempt ${attempt}/${maxRetries})...`);
      console.log(`Connecting to: postgresql://${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
      
      // Create a new connection pool
      const pool = new Pool({
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        database: DB_CONFIG.database,
        ssl: DB_CONFIG.ssl || false,
        max: DB_CONFIG.maxConnections,
        idleTimeoutMillis: 20000, // 20 seconds
        connectionTimeoutMillis: DB_CONFIG.connectionTimeout,
        application_name: 'skylabs-api',
      });

      // Test the connection
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log('✅ Database connection successful');
      } finally {
        client.release();
      }
      
      // Create Drizzle instance with the pool
      const db = drizzle(pool, { schema });
      
      return { db, pool };
      
    } catch (error) {
      const err = error as Error;
      lastError = err;
      
      console.error(`❌ Database connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
      
      // Log the error
      await logError(
        err,
        'Database Connection Failed',
        'Database',
        '🔴 Critical',
        { 
          attempt, 
          maxAttempts: maxRetries,
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          database: DB_CONFIG.database,
          user: DB_CONFIG.user,
          hasPassword: !!DB_CONFIG.password,
          errorCode: (error as any).code,
        },
        'db_connection'
      );
      
      // If this is the last attempt, rethrow the error with more context
      if (attempt >= maxRetries) {
        const errorDetails = {
          message: `Failed to connect to database after ${maxRetries} attempts`,
          originalError: err.message,
          errorCode: (error as any).code,
          connectionDetails: {
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            database: DB_CONFIG.database,
            user: DB_CONFIG.user,
          },
          suggestion: 'Check if PostgreSQL is running and the credentials are correct.'
        };
        console.error('Connection details:', JSON.stringify(errorDetails, null, 2));
        throw new Error(JSON.stringify(errorDetails, null, 2));
      }
      
      // Wait before retrying (exponential backoff with jitter)
      const jitter = Math.random() * 0.5 + 0.75; // Random value between 0.75 and 1.25
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, 30000); // Max 30 seconds
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  const errorMessage = `Failed to connect to database after ${DB_CONFIG.maxRetries} attempts: ${lastError?.message}`;
  console.error(`❌ ${errorMessage}`);
  
  // Log to error log with high severity
  await logError(
    new Error(errorMessage), 
    'Database Connection Failed',
    'Database',
    '🔴 Critical',
    { 
      maxRetries: DB_CONFIG.maxRetries,
      lastError: lastError?.message,
      errorCode: (lastError as any)?.code,
      stack: lastError?.stack
    },
    'db_connection_failed'
  );
  
  throw new Error(errorMessage);
}

// Database connection state
export let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
export let pool: Pool | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

// Initialize the database connection
export async function initializeDatabase() {
  if (isInitialized && db && pool) {
    return { db, pool };
  }

  if (initializationError) {
    console.warn('⚠️ Database initialization previously failed, retrying...');
  }

  try {
    // Clear any existing connection
    if (pool) {
      await pool.end();
      pool = null;
      db = null;
    }

    console.log('🔌 Initializing database connection...');
    const result = await createDatabaseConnection();
    db = result.db;
    pool = result.pool;
    isInitialized = true;
    initializationError = null;
    
    // Handle connection errors
    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client', err);
      logError(
        err,
        'Database Connection Error',
        'Database',
        '🔴 Critical',
        { timestamp: new Date().toISOString() },
        'db_connection_error'
      );
    });
    
    console.log('🔗 Database connection pool ready');
    console.log('✅ Database connection initialized successfully');
    
    return { db, pool };
    
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Error during database initialization:', err);
    await logError(
      err as Error, 
      'Database initialization',
      'Database',
      '🔴 Critical',
      { timestamp: new Date().toISOString() },
      'db_initialization_error'
    );
    throw err;
  }
}

// Get the database pool
export async function getPool() {
  try {
    if (!pool) {
      console.log('🔄 Database pool not initialized, initializing...');
      const result = await initializeDatabase();
      return result.pool;
    }
    return pool;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Failed to get database connection:', err.message);
    throw new Error(`Failed to get database connection: ${err.message}`);
  }
}

// Graceful shutdown handler
const handleShutdown = async () => {
  console.log('🛑 Received shutdown signal. Closing database connections...');
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    isInitialized = false;
  }
};

process.on('SIGTERM', () => {
  handleShutdown().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  handleShutdown().then(() => process.exit(0));
});

// Export the schema
export { schema };
