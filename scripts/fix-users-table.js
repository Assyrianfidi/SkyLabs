// scripts/fix-users-table.js
import pg from 'pg';

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function fixUsersTable() {
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Check if email column exists
    const emailColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'email';
    `);

    if (emailColumnExists.rows.length === 0) {
      console.log('ℹ️ Adding email column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN email VARCHAR(255);
      `);
      console.log('✅ Added email column to users table');

      // Add unique constraint if needed
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_email_unique UNIQUE (email);
      `);
      console.log('✅ Added unique constraint on email column');
    } else {
      console.log('✅ Email column already exists in users table');
    }

    // Mark migration as applied if not already
    const migrationExists = await client.query(
      "SELECT 1 FROM pg_migrations WHERE name = '0002_add_email_to_users.sql'"
    );

    if (migrationExists.rows.length === 0) {
      await client.query(
        "INSERT INTO pg_migrations (name) VALUES ('0002_add_email_to_users.sql')"
      );
      console.log('✅ Marked migration as applied');
    }

    await client.query('COMMIT');
    console.log('✅ Users table update completed successfully');
    
    // Show final table structure
    const tableInfo = await client.query('\d users');
    console.log('\n📋 Users table structure:');
    console.log(tableInfo.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating users table:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixUsersTable().catch(console.error);
