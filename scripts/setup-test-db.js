import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test.local') });

function parseDatabaseUrl(dbUrl) {
  // Handle standard PostgreSQL URL format
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    try {
      const url = new URL(dbUrl);
      return {
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1).split('?')[0],
      };
    } catch (e) {
      console.warn('Failed to parse URL with URL constructor, trying regex...');
    }
  }
  
  // Handle connection strings in format: postgresql://user:password@host:port/database
  const urlPattern = /^(?:postgres(?:ql)?:\/\/)?(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?\/([^?]+)/;
  const match = dbUrl.match(urlPattern);
  
  if (match) {
    return {
      user: match[1] || 'postgres',
      password: match[2] || 'postgres',
      host: match[3] || 'localhost',
      port: match[4] || '5432',
      database: match[5],
    };
  }
  
  // Fallback to environment variables or default values
  return {
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || '5432',
    database: 'skylabs_test',
  };
}

async function setupTestDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const dbName = dbConfig.database;
  
  console.log(`🔧 Setting up test database: ${dbName}`);
  
  // Create a connection to the default postgres database
  const rootConnection = new Client({
    user: dbConfig.user,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    database: 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await rootConnection.connect();
    
    // Terminate all connections to the test database
    await rootConnection.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
    `);
    
    // Drop the test database if it exists
    await rootConnection.query(`DROP DATABASE IF EXISTS ${dbName};`);
    
    // Create a new test database
    await rootConnection.query(`CREATE DATABASE ${dbName};`);
    
    console.log(`✅ Test database '${dbName}' created successfully`);
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    process.exit(1);
  } finally {
    await rootConnection.end();
  }
}

setupTestDatabase();
