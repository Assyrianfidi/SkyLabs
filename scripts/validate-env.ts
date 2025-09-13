import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (!existsSync(envPath)) {
  console.error('❌ .env file not found');
  process.exit(1);
}

config({ path: envPath });

// Required environment variables
const requiredVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'CONTACT_EMAIL',
  'NODE_ENV',
  'CORS_ORIGIN',
  'ENABLE_MAILING'
];

// Validate required variables
let isValid = true;
const missingVars: string[] = [];
const insecureVars: string[] = [];

console.log('🔍 Validating environment variables...\n');

// Check for missing variables
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
    isValid = false;
  }
}

// Check for insecure values
if (process.env.SESSION_SECRET === 'your-secret-key' || 
    process.env.SESSION_SECRET?.length < 32) {
  insecureVars.push('SESSION_SECRET is not secure');
  isValid = false;
}

if (process.env.DATABASE_URL?.includes('postgres://postgres:postgres@')) {
  insecureVars.push('Using default database credentials');
  isValid = false;
}

// Print results
if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(v => console.log(`  - ${v}`));
  console.log('');
}

if (insecureVars.length > 0) {
  console.log('⚠️  Insecure environment variables:');
  insecureVars.forEach(v => console.log(`  - ${v}`));
  console.log('');
}

// Print current values (masking sensitive data)
console.log('📋 Current environment configuration:');
requiredVars.forEach(varName => {
  let value = process.env[varName] || 'Not Set';
  
  // Mask sensitive values
  if (varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')) {
    value = '********';
  } else if (varName === 'DATABASE_URL') {
    value = value.replace(/:[^:]*@/, ':***@');
  }
  
  console.log(`  ${varName.padEnd(20)}: ${value}`);
});

// Exit with appropriate status
if (!isValid) {
  console.log('\n❌ Environment validation failed');
  process.exit(1);
}

console.log('\n✅ Environment validation passed');
