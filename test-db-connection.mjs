import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pg;

async function testConnection() {
  // Parse the connection string
  const connectionString = process.env.DATABASE_URL;
  console.log('Using connection string:', connectionString);
  
  const client = new Client({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to the database');
    
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    const dbResult = await client.query('SELECT current_database()');
    console.log('Current database:', dbResult.rows[0].current_database);
    
    const userResult = await client.query('SELECT current_user');
    console.log('Current user:', userResult.rows[0].current_user);
    
  } catch (err) {
    console.error('❌ Error connecting to the database:', err.message);
    console.error('Connection string used:', process.env.DATABASE_URL);
  } finally {
    await client.end();
  }
}

testConnection();
