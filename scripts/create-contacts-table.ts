import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const dbConfig = {
  user: process.env.TEST_DB_USER || 'skylabs_test',
  host: process.env.TEST_DB_HOST || 'localhost',
  database: process.env.TEST_DB_NAME || 'skylabs_test',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
};

async function createContactsTable() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Created contacts table');
  } catch (error) {
    console.error('❌ Error creating contacts table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
createContactsTable()
  .then(() => {
    console.log('✅ Contacts table setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Contacts table setup failed:', error);
    process.exit(1);
  });
