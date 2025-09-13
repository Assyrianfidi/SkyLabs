// scripts/verify-connection.js
import pg from 'pg';

const pool = new pg.Pool({
  user: 'skylabs',        // database username
  host: 'localhost',      // database host
  database: 'skylabs_dev',// database name
  password: 'Fkhouch8',   // database password
  port: 5432,             // default PostgreSQL port
  ssl: false              // disable SSL for local testing
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('🕒 Current database time:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Error connecting to the database:');
    console.error(error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection().catch(console.error);
