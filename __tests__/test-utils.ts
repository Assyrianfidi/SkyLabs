import { Pool, PoolConfig } from 'pg';
import { execSync } from 'child_process';

export async function setupTestDatabase(): Promise<Pool> {
  // Use development database for testing
  const testDbConfig: PoolConfig = {
    user: process.env.DB_USER || 'skylabs',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skylabs_dev',
    password: process.env.DB_PASSWORD || 'skylabs',
    port: parseInt(process.env.DB_PORT || '5432'),
  };

  // Create a connection to the test database
  const pool = new Pool(testDbConfig);

  try {
    // Test the connection
    await pool.query('SELECT NOW()');
    console.log(`✅ Connected to database: ${testDbConfig.database}`);
    
    // Optionally run migrations on the test database if script exists
    try {
      execSync('npm run db:migrate:apply', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Skipping migrations in tests (script not found or failed). Proceeding without.');
    }
    
    return pool;
  } catch (error) {
    console.error(`❌ Failed to connect to database ${testDbConfig.database}:`, error);
    await pool.end();
    throw error;
  }
}

export async function teardownTestDatabase(pool: Pool) {
  try {
    // Drop all tables in the test database
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Failed to clean up test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function clearTestData(pool: Pool) {
  try {
    // Truncate all tables in the test database
    const result = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    
    const tables = result.rows.map((row) => row.tablename);
    
    if (tables.length > 0) {
      await pool.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);
    }
    
    console.log('✅ Test data cleared');
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    throw error;
  }
}
