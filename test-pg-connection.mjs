import pg from 'pg';
const { Client } = pg;

const client = new Client({
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'skylabs_password',
  port: 5432,
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL successfully!");
    
    const version = await client.query('SELECT version()');
    console.log('PostgreSQL version:', version.rows[0].version);
    
    const db = await client.query('SELECT current_database()');
    console.log('Current database:', db.rows[0].current_database);
    
    const user = await client.query('SELECT current_user');
    console.log('Current user:', user.rows[0].current_user);
    
    const test = await client.query("SELECT 1 AS test_connection");
    console.log("Test query result:", test.rows[0]);
    
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  } finally {
    await client.end();
  }
}

testConnection();
