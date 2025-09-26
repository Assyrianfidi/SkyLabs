import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Installing email service dependencies...');

try {
  // Install required packages
  execSync('npm install nodemailer @types/nodemailer nodemailer-smtp-transport @types/nodemailer-smtp-transport winston @types/winston', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Dependencies installed successfully!');
  console.log('\nPlease update your .env file with your email configuration. See .env.example for reference.');
} catch (error) {
  console.error('\n❌ Failed to install dependencies:', error.message);
  process.exit(1);
}
