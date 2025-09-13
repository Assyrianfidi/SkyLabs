// Simple test script to verify PostgreSQL connection
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    console.log('🔌 Testing PostgreSQL connection...');
    const client = await pool.connect();
    
    // Test query
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ Connection successful!');
    console.log('PostgreSQL Version:', result.rows[0].version);
    console.log('Current Database:', result.rows[0].current_database);
    console.log('Current User:', result.rows[0].current_user);
    
    // Release the client back to the pool
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nConnection details:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'Not set',
      user: process.env.DB_USER || 'Not set',
      hasPassword: !!process.env.DB_PASSWORD,
    });
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check if the database exists: psql -U skylabs -d skylabs_dev -c "SELECT 1"');
    console.log('3. Verify the credentials in your .env file');
  } finally {
    // Close the pool
    await pool.end();
  }
}

testConnection();
