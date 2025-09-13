import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    console.log('Database connection successful!', res.rows[0]);
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();
