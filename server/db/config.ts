import type { PoolConfig } from 'pg';
import 'dotenv/config';

// Parse database URL from environment
function parseDatabaseUrl(dbUrl: string | undefined) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Handle both postgres:// and postgresql:// URLs
    const url = new URL(dbUrl.replace(/^postgres:/, 'postgresql:'));
    
    return {
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      host: url.hostname || 'localhost',
      port: parseInt(url.port, 10) || 5432,
      database: url.pathname.replace(/^\//, ''), // Remove leading slash
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // Maximum number of clients in the pool
      connectionTimeoutMillis: 10000, // 10 seconds
      idleTimeoutMillis: 30000, // 30 seconds
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    throw new Error('Invalid DATABASE_URL format. Expected format: postgresql://username:password@host:port/database');
  }
}

// Get database configuration from environment
function getDatabaseConfig(): PoolConfig {
  // Try to get config from individual environment variables first
  if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME) {
    console.log('Using individual database configuration from environment variables');
    return {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'skylabs_dev',
      ssl: false, // Disable SSL for local development
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };
  }

  // Fall back to DATABASE_URL if individual env vars are not set
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for database configuration');
    return parseDatabaseUrl(process.env.DATABASE_URL);
  }

  // Default configuration
  console.log('Using default database configuration');
  return {
    user: 'postgres',
    password: '',
    host: 'localhost',
    port: 5432,
    database: 'skylabs_dev',
    ssl: false,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  };
}

// Log database configuration (without password)
const dbConfig = getDatabaseConfig();
console.log('📋 Database Configuration:', {
  ...dbConfig,
  password: dbConfig.password ? '***' : '(no password)',
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
});

export default dbConfig;
