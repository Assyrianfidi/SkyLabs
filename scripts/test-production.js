import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test.local') });

async function runCommand(command, cwd = process.cwd()) {
  console.log(`🚀 Running: ${command}`);
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error executing: ${command}`);
    console.error(error.stderr || error.message);
    return { success: false, error };
  }
}

async function testProductionBuild() {
  console.log('🧪 Starting production build test...');
  
  // 1. Set up test database
  console.log('\n1️⃣ Setting up test database...');
  const dbSetup = await runCommand('npm run test:db:create');
  if (!dbSetup.success) {
    console.error('❌ Failed to set up test database');
    process.exit(1);
  }

  // 2. Run database migrations
  console.log('\n2️⃣ Running database migrations...');
  
  // Set the DATABASE_URL from the test config
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/skylabs_test';
  
  // Push the schema to the database
  const migration = await runCommand('npx drizzle-kit push:pg');
  if (!migration.success) {
    console.error('❌ Failed to run database migrations');
    process.exit(1);
  }

  // 3. Build the application
  console.log('\n3️⃣ Building the application...');
  
  // First build the client
  console.log('Building client...');
  const clientBuild = await runCommand('npm run build:client');
  if (!clientBuild.success) {
    console.error('❌ Client build failed');
    process.exit(1);
  }
  
  // Then build the server
  console.log('Building server...');
  const serverBuild = await runCommand('npm run build:server');
  if (!serverBuild.success) {
    console.error('❌ Server build failed');
    process.exit(1);
  }

  // 4. Start the test server on port 3002 to avoid conflicts
  const testPort = 3002;
  console.log(`\n4️⃣ Starting test server on port ${testPort}...`);
  const serverProcess = exec(
    'cross-env ' +
    'NODE_ENV=test ' +
    `PORT=${testPort} ` +
    'DB_USER=postgres ' +
    'DB_PASSWORD=postgres ' +
    'DB_HOST=localhost ' +
    'DB_PORT=5432 ' +
    'DB_NAME=skylabs_test ' +
    'node dist/index.js'
  );
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data}`);
    if (data.includes('Server running on port')) {
      console.log('✅ Server started successfully');
      console.log('\n🎉 Production build test completed successfully!');
      console.log('\n🚀 Test the application at http://localhost:3001');
      console.log('\n🛑 Press Ctrl+C to stop the server');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill();
    process.exit(0);
  });
}

testProductionBuild().catch(console.error);
