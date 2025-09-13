// scripts/fix-users-schema.js
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
    
    console.log('🔍 Checking users table schema...');
    
    // Add missing columns if they don't exist
    await client.query(`
      DO $$
      BEGIN
        -- Add created_at if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'created_at') THEN
          ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          RAISE NOTICE 'Added created_at column';
        END IF;
        
        -- Add updated_at if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'updated_at') THEN
          ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          RAISE NOTICE 'Added updated_at column';
        END IF;
        
        -- Add username if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'username') THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(255);
          RAISE NOTICE 'Added username column';
        END IF;
        
        -- Add password_hash if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'password_hash') THEN
          ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
          RAISE NOTICE 'Added password_hash column';
        END IF;
      END
      $$;
    `);
    
    // Create or replace the update_modified_column function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Drop the trigger if it exists to avoid duplicates
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_modtime ON users;
    `);
    
    // Create the trigger
    await client.query(`
      CREATE TRIGGER update_users_modtime
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `);
    
    // Mark the migration as applied
    await client.query(`
      INSERT INTO pg_migrations (name) 
      SELECT '0003_update_users_table.sql'
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_migrations WHERE name = '0003_update_users_table.sql'
      );
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
