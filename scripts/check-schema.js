// scripts/check-schema.js
import pg from 'pg';

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function checkSchema() {
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    console.log('🔍 Checking database schema...');
    
    // Check users table structure
    const usersTable = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    
    console.log('\n📋 Users table columns:');
    console.table(usersTable.rows);
    
    // Check applied migrations
    const migrations = await client.query('SELECT * FROM pg_migrations ORDER BY name');
    console.log('\n📋 Applied migrations:');
    console.table(migrations.rows);
    
    // Check if email column exists and has unique constraint
    const emailConstraint = await client.query(`
      SELECT conname, conkey, contype 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass
      AND conname = 'users_email_unique';
    `);
    
    if (emailConstraint.rows.length > 0) {
      console.log('✅ Email unique constraint exists');
    } else {
      console.log('❌ Email unique constraint is missing');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);
