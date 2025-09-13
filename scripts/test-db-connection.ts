import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    // Test query
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Test query result:', result.rows[0]);
    
    // Get database version
    const version = await client.query('SELECT version()');
    console.log('📊 Database version:', version.rows[0].version);
    
    // List databases
    const dbs = await client.query('SELECT datname FROM pg_database');
    console.log('📚 Available databases:', dbs.rows.map(r => r.datname).join(', '));
    
    // List tables in current database
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tables in current database:', tables.rows.map(r => r.table_name).join(', '));
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error connecting to the database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection().catch(console.error);
