import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test.local') });

const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: 'postgres' // Connect to default postgres database first
};

const testDbName = 'skylabs_test';

async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');
  
  const client = new Client({
    ...dbConfig,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    
    // Terminate existing connections to the test database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid();
    `, [testDbName]);
    
    // Drop the test database if it exists
    await client.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    
    // Create a new test database
    await client.query(`CREATE DATABASE ${testDbName}`);
    
    console.log(`✅ Test database '${testDbName}' created successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error setting up test database:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Run the setup
setupTestDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
