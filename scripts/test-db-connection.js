import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    user: 'skylabs',
    host: 'localhost',
    database: 'skylabs_dev',
    password: 'Fkhouch8',
    port: 5432,
    ssl: false
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test query to verify connection
    const result = await client.query('SELECT NOW()');
    console.log('🕒 Current database time:', result.rows[0].now);
    
  } catch (error) {
    console.error('❌ Error connecting to the database:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Execute the test
testConnection().catch(console.error);
