const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Dependencies to install
const dependencies = [
  'nodemailer',
  'nodemailer-smtp-transport',
  'express-rate-limit',
  'zod',
  'zod-express-middleware'
];

console.log('Installing dependencies...');

try {
  // Install dependencies
  execSync(`npm install ${dependencies.join(' ')} --save`, { stdio: 'inherit' });
  
  // Create .env.example if it doesn't exist
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    const envExampleContent = `# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=\"SkyLabs Contact\" <noreply@skylabs.com>
SMTP_TO=your-personal-email@example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=5  # Max requests per window

# Honeypot
HONEYPOT_FIELD=website

# Environment
NODE_ENV=development`;
    
    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log('Created .env.example file');
  }
  
  console.log('Dependencies installed successfully!');
  console.log('Please update your .env file with your email configuration.');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}
