const { exec } = require('child_process');
const { promisify } = require('util');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// PostgreSQL connection details - using the working configuration
const DB_USER = 'skylabs';
const DB_PASSWORD = 'skylabs_password';
const DB_HOST = 'localhost';
const DB_PORT = '5432';
const DB_NAME = 'skylabs_dev';

// Path to psql executable
const PSQL_PATH = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';

// Connection string
const CONNECTION_STRING = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    console.log(`Using connection string: postgresql://${DB_USER}:*****@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    
    // Test connection using psql
    const { stdout, stderr } = await execAsync(
      `"${PSQL_PATH}" -U ${DB_USER} -d ${DB_NAME} -c "SELECT version(), current_database(), current_user;"`,
      { env: { ...process.env, PGPASSWORD: DB_PASSWORD } }
    );
    
    if (stderr) {
      console.error('❌ Error executing psql command:');
      console.error(stderr);
      return;
    }
    
    console.log('✅ Successfully connected to PostgreSQL');
    console.log('\nDatabase Information:');
    console.log(stdout);
    
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:');
    console.error(error.message);
    
    if (error.code === 'ENOENT') {
      console.error('\n🔧 psql command not found. Make sure PostgreSQL is installed and the path is correct:');
      console.error(`Current psql path: ${PSQL_PATH}`);
    } else if (error.stderr) {
      console.error('\nPostgreSQL error details:');
      console.error(error.stderr);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify PostgreSQL service is running');
    console.log('2. Check if the database exists: `psql -U skylabs -c "CREATE DATABASE skylabs_dev;"`');
    console.log('3. Verify the username and password are correct');
    console.log('4. Check if PostgreSQL is listening on port 5432');
  }
}

testConnection();
