// scripts/cleanup-test-users.js
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function cleanupTestUsers() {
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Delete test users
    const result = await client.query(
      "DELETE FROM users WHERE email LIKE 'test_%' OR username LIKE 'test_%' RETURNING id, email, username"
    );
    
    await client.query('COMMIT');
    
    if (result.rowCount > 0) {
      console.log(`✅ Deleted ${result.rowCount} test users:`);
      console.table(result.rows);
    } else {
      console.log('ℹ️ No test users found to delete');
    }
    
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning up test users:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Export the cleanup function for use in other modules
export { cleanupTestUsers };

// Run the cleanup if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanupTestUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
