// Load environment variables
import 'dotenv/config';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to create a connection URL from individual components
function createConnectionUrl() {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  
  if (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT || !DB_NAME) {
    throw new Error('Missing required database environment variables');
  }

  // URL-encode the password to handle special characters
  const encodedPassword = encodeURIComponent(DB_PASSWORD);
  return `postgresql://${DB_USER}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable`;
}

async function testConnection() {
  try {
    // Try to use DATABASE_URL first, fall back to building from components
    const connectionUrl = process.env.DATABASE_URL || createConnectionUrl();
    
    console.log('🔌 Testing database connection...');
    console.log(`Connecting to: ${connectionUrl.replace(/:([^:]*?)@/, ':*****@')}`);

    // Create a connection
    const sql = postgres(connectionUrl, {
      ssl: false,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
      debug: (connection, query, params, types) => {
        console.log('\nExecuting query:', query);
      }
    });

    // Test the connection with a simple query
    const result = await sql`SELECT version(), current_database(), current_user`;
    
    console.log('\n✅ Database connection successful!');
    console.log('PostgreSQL Version:', result[0].version);
    console.log('Current Database:', result[0].current_database);
    console.log('Current User:', result[0].current_user);
    
    // Close the connection
    await sql.end();
    
  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    console.error('\nEnvironment variables:', {
      DB_HOST: process.env.DB_HOST || 'Not set',
      DB_PORT: process.env.DB_PORT || 'Not set',
      DB_NAME: process.env.DB_NAME || 'Not set',
      DB_USER: process.env.DB_USER || 'Not set',
      hasPassword: !!process.env.DB_PASSWORD,
      usingDATABASE_URL: !!process.env.DATABASE_URL
    });
    
    console.error('\nTroubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Verify the database credentials in your .env file');
    console.log('3. Check if the database exists: psql -U skylabs -d skylabs_dev -c "SELECT 1"');
    console.log('4. Ensure the user has proper permissions on the database');
    
    process.exit(1);
  }
}

// Run the test
testConnection();
