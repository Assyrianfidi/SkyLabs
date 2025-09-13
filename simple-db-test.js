import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Client } = pkg;

// Connection configuration
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://skylabs:skylabs_password@localhost:5432/skylabs_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL');
    
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    
    const dbRes = await client.query('SELECT current_database()');
    console.log('Current database:', dbRes.rows[0].current_database);
    
    const userRes = await client.query('SELECT current_user');
    console.log('Current user:', userRes.rows[0].current_user);
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Error details:', {
      code: err.code,
      address: err.address,
      port: err.port
    });
    
    if (err.code === 'ECONNREFUSED') {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure PostgreSQL is running');
      console.log('2. Verify the credentials in the script match your PostgreSQL setup');
      console.log('3. Check if the database exists: `psql -U skylabs -c "CREATE DATABASE skylabs_dev;"`');
      console.log('4. Ensure the user has proper permissions');
    }
    
  } finally {
    await client.end();
    process.exit(0);
  }
}

testConnection();
