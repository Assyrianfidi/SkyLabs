// scripts/fix-users-schema-v2.js
import pg from 'pg';

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function fixUsersSchema() {
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    console.log('🔍 Updating users table schema...');
    
    // Make password column nullable since we're using password_hash
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN password DROP NOT NULL,
      ALTER COLUMN password SET DEFAULT NULL;
    `);
    
    // Ensure password_hash is not null
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN password_hash SET NOT NULL;
    `);
    
    // Update any existing users to have a default password_hash
    await client.query(`
      UPDATE users 
      SET password_hash = '' 
      WHERE password_hash IS NULL;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Users table schema updated successfully');
    
    // Show the final schema
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    
    console.log('\n📋 Users table columns:');
    console.table(result.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating users table schema:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixUsersSchema().catch(console.error);
