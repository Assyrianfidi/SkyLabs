const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  // Parse the connection string manually
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  const client = new Client({
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    database: dbUrl.pathname.replace(/^\//, ''), // Remove leading slash
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log('Connecting to database:', {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    database: dbUrl.pathname.replace(/^\//, '')
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
