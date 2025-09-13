import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// Helper function to create a database connection without specifying a database
function getRootConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Extract database name from the connection string
  const dbUrl = process.env.DATABASE_URL;
  const dbNameMatch = dbUrl.match(/\/([^/]+)$/);
  if (!dbNameMatch) {
    throw new Error('Could not extract database name from DATABASE_URL');
  }
  const dbName = dbNameMatch[1];
  
  // Create a connection to the default 'postgres' database
  const rootUrl = dbUrl.replace(/\/[^/]+$/, '/postgres');
  
  return {
    connection: postgres(rootUrl, { max: 1 }),
    dbName
  };
}

async function createDatabaseIfNotExists() {
  const { connection, dbName } = getRootConnection();
  
  try {
    // Check if database exists
    const result = await connection`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `;
    
    if (result.length === 0) {
      console.log(`🔄 Creating database: ${dbName}`);
      // Use string interpolation for database name since it's not a parameter
      await connection.unsafe(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database created: ${dbName}`);
    } else {
      console.log(`ℹ️ Database already exists: ${dbName}`);
    }
  } catch (error) {
    console.error('❌ Error creating database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // First, ensure the database exists
    await createDatabaseIfNotExists();
    
    // Now connect to the target database
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const sql = postgres(databaseUrl, { max: 1 });
    
    // Enable UUID extension if not exists
    console.log('🔧 Enabling UUID extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    
    // Drop existing tables if they exist
    console.log('🗑️  Dropping existing tables if they exist...');
    await sql`
      DROP TABLE IF EXISTS contacts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `;

    console.log('🛠️  Creating tables...');
    
    // Create users table
    await sql`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    // Create contacts table
    await sql`
      CREATE TABLE contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    // Create indexes
    console.log('📊 Creating indexes...');
    await sql`CREATE INDEX idx_users_username ON users(username)`;
    await sql`CREATE INDEX idx_contacts_email ON contacts(email)`;
    
    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the initialization
initializeDatabase().catch((error) => {
  console.error('❌ Unhandled error in database initialization:', error);
  process.exit(1);
});
