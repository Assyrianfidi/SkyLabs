import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from 'dotenv';

// Load environment variables
config();

const execAsync = promisify(exec);

async function runMigration() {
  try {
    console.log('🚀 Running database migration...');
    
    // Run the SQL migration file
    const { stdout, stderr } = await execAsync(
      `psql -U ${process.env.DB_USER || 'postgres'} ` +
      `-h ${process.env.DB_HOST || 'localhost'} ` +
      `-d ${process.env.DB_NAME || 'skylabs_dev'} ` +
      `-f migrations/0004_add_security_fields.sql`,
      { 
        env: { 
          ...process.env, 
          PGPASSWORD: process.env.DB_PASSWORD || 'Fkhouch8' 
        } 
      }
    );
    
    if (stderr) {
      console.error('Migration stderr:', stderr);
    }
    
    console.log('✅ Migration completed successfully');
    console.log('\nVerifying migration...');
    
    // Verify the migration
    await execAsync('node scripts/verify-migration.js');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.stderr) {
      console.error('Error details:', error.stderr);
    }
    process.exit(1);
  }
}

runMigration();
