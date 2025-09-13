// scripts/seed-database.js
import pg from 'pg';

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if users table exists
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!usersTableExists.rows[0].exists) {
      console.log('⚠️ Users table does not exist. Please run migrations first.');
      return;
    }

    // Check if roles table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        permissions TEXT[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default roles if they don't exist
    const roles = [
      {
        name: 'admin',
        permissions: ['users:read', 'users:write', 'users:delete', 'settings:read', 'settings:write']
      },
      {
        name: 'user',
        permissions: ['profile:read', 'profile:write']
      }
    ];

    for (const role of roles) {
      const roleExists = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [role.name]
      );

      if (roleExists.rows.length === 0) {
        await client.query(
          'INSERT INTO roles (name, permissions) VALUES ($1, $2)',
          [role.name, role.permissions]
        );
        console.log(`✅ Added role: ${role.name}`);
      }
    }

    // Check if admin user exists
    const adminExists = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@skylabs.dev']
    );

    if (adminExists.rows.length === 0) {
      // In a real app, passwords should be hashed with bcrypt
      const hashedPassword = 'hashed_password_here'; // Replace with actual hashed password
      
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role_id)
         VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'admin'))`,
        ['admin@skylabs.dev', hashedPassword, 'System Administrator']
      );
      console.log('✅ Created admin user');
    }

    await client.query('COMMIT');
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(console.error);
