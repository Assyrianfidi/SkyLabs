// scripts/test-operations.js
import pg from 'pg';

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

const pool = new pg.Pool(config);

async function testOperations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database operations test...');
    
    // Test connection
    const connectionTest = await client.query('SELECT NOW()');
    console.log('✅ Connection test passed');
    
    // Test read operation
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Database tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Test error logging
    try {
      // This should trigger an error
      await client.query('SELECT * FROM non_existent_table');
    } catch (error) {
      console.log('✅ Error handling test passed:', error.message.includes('does not exist'));
    }
    
    // Test transaction
    await client.query('BEGIN');
    try {
      // Test write operation (if users table exists)
      const usersExist = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
      );
      
      if (usersExist.rows[0].exists) {
        const testEmail = `test_${Date.now()}@test.com`;
        const testUsername = `testuser_${Date.now()}`;
        const testPassword = 'test_password123'; // dummy password for test insert
        
        const insertResult = await client.query(
          'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
          [testUsername, testEmail, testPassword]
        );
        
        console.log('✅ Write test passed - Created test user with ID:', insertResult.rows[0].id);
        
        // Clean up
        await client.query('DELETE FROM users WHERE email LIKE $1', ['test_%@test.com']);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
    console.log('✅ All database operations test passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testOperations().catch(console.error);
