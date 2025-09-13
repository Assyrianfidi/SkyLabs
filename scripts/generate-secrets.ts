import crypto from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

type EnvConfig = {
  [key: string]: string;
};

function generateSecureSecret(length = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

function updateEnvFile(envPath: string, updates: EnvConfig): void {
  let envContent = '';
  
  // Read existing .env file if it exists
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
    
    // Update existing variables
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });
  } else {
    // Create new .env file with provided values
    envContent = Object.entries(updates)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }
  
  writeFileSync(envPath, envContent.trim());
  console.log(`✅ Updated ${envPath} with secure values`);
}

// Generate secure values
const secureConfig = {
  SESSION_SECRET: generateSecureSecret(),
  DATABASE_PASSWORD: generateSecureSecret(32),
  DATABASE_USER: 'skylabs_app',
  DATABASE_NAME: 'skylabs_prod',
  NODE_ENV: 'production',
  PORT: '3000',
  CORS_ORIGIN: 'https://skylabs.dev,http://localhost:3000',
  CONTACT_EMAIL: 'fidi.amazon@gmail.com',
  ENABLE_MAILING: 'false',
};

// Update .env files
const rootDir = path.resolve(__dirname, '..');
updateEnvFile(path.join(rootDir, '.env'), secureConfig);
updateEnvFile(path.join(rootDir, '.env.production'), secureConfig);

// Create development config
const devConfig = {
  ...secureConfig,
  NODE_ENV: 'development',
  DATABASE_NAME: 'skylabs_dev',
  CORS_ORIGIN: 'http://localhost:3000',
};

updateEnvFile(path.join(rootDir, '.env.development'), devConfig);

console.log('✅ Secure configuration generated successfully');
console.log('⚠️  Please update your database user and permissions with the following:');
console.log(`   Database User: ${secureConfig.DATABASE_USER}`);
console.log(`   Database Password: ${secureConfig.DATABASE_PASSWORD}`);
console.log('   Run: psql -U postgres -c "CREATE USER ' + secureConfig.DATABASE_USER + ' WITH PASSWORD \'' + secureConfig.DATABASE_PASSWORD + '\'"');
console.log('   Run: psql -U postgres -c "CREATE DATABASE ' + secureConfig.DATABASE_NAME + ' OWNER ' + secureConfig.DATABASE_USER + '"');
console.log('   Run: psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ' + secureConfig.DATABASE_NAME + ' TO ' + secureConfig.DATABASE_USER + '"');
