import pg from 'pg';
import { hash } from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new pg.Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'Fkhouch8',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const TEST_EMAIL = 'test@example.com';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'Test@1234Secure';

async function setupTestUser() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing test user if it exists
    await client.query(
      'DELETE FROM users WHERE email = $1 OR username = $2',
      [TEST_EMAIL, TEST_USERNAME]
    );
    
    // Hash the test password
    const hashedPassword = await hash(TEST_PASSWORD, 10);
    
    // Create test user
    const result = await client.query(
      `INSERT INTO users (username, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, username, email`,
      [TEST_USERNAME, TEST_EMAIL, hashedPassword]
    );
    
    await client.query('COMMIT');
    
    console.log('✅ Test user created successfully:');
    console.log({
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      password: TEST_PASSWORD // Only for testing!
    });
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up test user:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupTestUser()
  .catch(error => {
    console.error('Failed to set up test user:', error);
    process.exit(1);
  });
