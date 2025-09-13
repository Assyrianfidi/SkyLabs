#!/usr/bin/env node
import { execSync } from 'child_process';
import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

// Constants
const MIGRATIONS_DIR = join(process.cwd(), 'migrations');
const ERROR_LOG = join(process.cwd(), 'ERROR_LOG.md');

// Log function with timestamp
function log(message: string, type: 'info' | 'error' | 'success' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    error: '❌',
    success: '✅'
  }[type];
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Function to log errors to ERROR_LOG.md
function logError(error: Error, context: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `### ${timestamp} - ${context}

- **Error:** \`${error.message}\`
- **Stack Trace:** \`\`\`\n${error.stack || 'No stack trace'}\`\`\`
- **Status:** 🔴 Critical
- **Linked Task:** migrations

---\n`;

  try {
    writeFileSync(ERROR_LOG, logEntry, { flag: 'a' });
  } catch (logError) {
    console.error('❌ Failed to write to error log:', logError);
  }
}

// Function to get applied migrations from the database
function getAppliedMigrations(): string[] {
  try {
    const result = execSync(
      `npx drizzle-kit introspect:pg --json`,
      { 
        stdio: ['pipe', 'pipe', 'inherit'],
        encoding: 'utf-8'  // Explicitly set encoding to string
      }
    ) as string;
    
    const data = JSON.parse(result);
    return data.meta.migrations || [];
  } catch (error) {
    log('No migrations table found or error reading migrations', 'error');
    return [];
  }
}

// Function to get local migration files
function getLocalMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    log('No migrations directory found', 'error');
    return [];
  }
  
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort migrations to ensure correct order
  } catch (error) {
    log('Error reading migrations directory', 'error');
    return [];
  }
}

// Function to apply migrations
function applyMigrations() {
  log('Applying pending migrations...');
  try {
    execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
    log('Migrations applied successfully', 'success');
  } catch (error) {
    log('Failed to apply migrations', 'error');
    throw error;
  }
}

// Main function
async function main() {
  log('Starting migration verification...');
  
  try {
    // Check if migrations directory exists
    if (!existsSync(MIGRATIONS_DIR)) {
      log('No migrations directory found. Creating one...');
      execSync('npx drizzle-kit generate:pg', { stdio: 'inherit' });
    }
    
    // Get applied and local migrations
    const appliedMigrations = getAppliedMigrations();
    const localMigrations = getLocalMigrations();
    
    log(`Found ${appliedMigrations.length} applied migrations`);
    log(`Found ${localMigrations.length} local migration files`);
    
    // Check for unapplied migrations
    const unappliedMigrations = localMigrations.filter(
      migration => !appliedMigrations.includes(migration)
    );
    
    if (unappliedMigrations.length > 0) {
      log(`Found ${unappliedMigrations.length} unapplied migrations:`, 'info');
      unappliedMigrations.forEach(migration => log(`- ${migration}`));
      
      // Apply migrations
      applyMigrations();
    } else {
      log('All migrations are up to date', 'success');
    }
    
    // Update TODO list
    log('Migration verification completed successfully', 'success');
    
  } catch (error) {
    log('Migration verification failed', 'error');
    logError(error as Error, 'Migration Verification Failed');
    process.exit(1);
  }
}

// Run the script
main();
