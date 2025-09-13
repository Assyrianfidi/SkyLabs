// Simple test script to verify database connection
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'skylabs_dev'
};

// Log the config (without password)
console.log('Testing database connection with config:', {
  ...config,
  password: config.password ? '***' : '(no password)'
});

const client = new Client(config);

async function testConnection() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('✅ Successfully connected to database');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database time:', result.rows[0].now);
    
    // Test database version
    const version = await client.query('SELECT version()');
    console.log('✅ Database version:', version.rows[0].version.split(' ').slice(0, 3).join(' '));
    
    // List all tables in the public schema
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tables in database:');
    if (tables.rows.length > 0) {
      tables.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.table_name}`);
      });
    } else {
      console.log('  No tables found in public schema');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to database:');
    console.error(error);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔍 Troubleshooting:');
      console.error('1. Is PostgreSQL running? Try: `sudo service postgresql status`');
      console.error('2. Check if the host and port are correct');
      console.error('3. Verify the database name and user credentials');
      console.error('4. Check if the user has permission to connect');
    } else if (error.code === '28P01') {
      console.error('\n🔍 Authentication failed. Check your username and password.');
    } else if (error.code === '3D000') {
      console.error(`\n🔍 Database '${config.database}' does not exist.`);
      console.error('Run: `createdb ' + config.database + '`');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Connection closed');
  }
}

testConnection();
