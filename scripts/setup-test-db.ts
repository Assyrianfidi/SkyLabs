import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Use environment variables if set, otherwise use default PostgreSQL superuser credentials
const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: 'postgres',  // Connect to default postgres DB to create test DB
  password: process.env.PGPASSWORD || 'postgres',
  port: parseInt(process.env.PGPORT || '5432'),
};

const testDbName = process.env.TEST_DB_NAME || 'skylabs_test';
const testDbUser = process.env.TEST_DB_USER || 'skylabs_test';
const testDbPassword = process.env.TEST_DB_PASSWORD || 'test_password';

async function setupTestDatabase() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    // Terminate all connections to the test database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid();
    `, [testDbName]);

    // Drop the test database if it exists
    await client.query(`DROP DATABASE IF EXISTS ${testDbName}`);

    // Create a new test database
    await client.query(`CREATE DATABASE ${testDbName}`);
    
    // Create test user if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '${testDbUser}') THEN
          CREATE USER ${testDbUser} WITH PASSWORD '${testDbPassword}';
        END IF;
      END
      $$;
    `);
    
    // Grant all necessary privileges
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${testDbName} TO ${testDbUser}`);
    
    // Connect to the new database and set up permissions
    const testPool = new Pool({
      ...dbConfig,
      database: testDbName
    });
    const testClient = await testPool.connect();
    
    try {
      await testClient.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${testDbUser}`);
      await testClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${testDbUser}`);
      await testClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${testDbUser}`);
      await testClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${testDbUser}`);
      await testClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${testDbUser}`);
      console.log(`✅ Granted all privileges on database ${testDbName} to ${testDbUser}`);
    } finally {
      testClient.release();
      await testPool.end();
    }
    
    console.log(`✅ Created test database: ${testDbName}`);
    console.log(`✅ Created/granted access to test user: ${testDbUser}`);
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupTestDatabase()
  .then(() => {
    console.log('✅ Test database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test database setup failed:', error);
    process.exit(1);
  });
