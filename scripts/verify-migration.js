import pg from 'pg';
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

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    // Check if security columns exist
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('login_attempts', 'lock_until', 'last_login')
    `);
    
    const existingColumns = result.rows.map(row => row.column_name);
    const requiredColumns = ['login_attempts', 'lock_until', 'last_login'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns.join(', '));
      console.log('\nRun the migration script with:');
      console.log('psql -U skylabs -d skylabs_dev -f migrations/0004_add_security_fields.sql');
      process.exit(1);
    }
    
    console.log('✅ All security columns exist in users table');
    
    // Verify index exists
    const indexResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'idx_users_email'
    `);
    
    if (indexResult.rows.length === 0) {
      console.error('❌ Missing index on email column');
      process.exit(1);
    }
    
    console.log('✅ Email index exists');
    console.log('\n🎉 Database schema is up to date with security requirements');
    
  } catch (error) {
    console.error('Error verifying migration:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration();
