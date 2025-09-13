# SkyLabs Deployment Guide

This guide provides instructions for deploying the SkyLabs application to a production environment.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- PM2 installed globally (`npm install -g pm2`)
- Git (for deployment)

## Environment Setup

1. Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/skylabs_prod

# Server Configuration
PORT=3000
NODE_ENV=production

# Session Configuration
SESSION_SECRET=your-secure-session-secret
SESSION_COOKIE_NAME=skylabs.sid
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true

# CORS Configuration
CORS_ORIGIN=https://your-production-domain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Contact Email
CONTACT_EMAIL=fidi.amazon@gmail.com
VITE_NEXT_PUBLIC_CONTACT_EMAIL=fidi.amazon@gmail.com
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://your-repository-url.git
   cd SkyLabs
   ```

2. Install dependencies:
   ```bash
   npm ci --production
   ```

## Building the Application

Build both client and server:
```bash
npm run build
```

## Database Setup

1. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE skylabs_prod;
   ```

2. Run database migrations:
   ```bash
   npm run db:migrate:run
   ```

## Starting the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Start with PM2
npm run start:prod

# Check status
npm run status:prod

# View logs
npm run logs:prod
```

## Deployment Script

For easy deployment, use the provided script:

1. Make the script executable:
   ```bash
   chmod +x deploy.sh
   ```

2. Run the deployment:
   ```bash
   ./deploy.sh
   ```

## PM2 Commands

- Start: `pm2 start ecosystem.config.js`
- Stop: `pm2 delete skylabs`
- Restart: `pm2 restart skylabs`
- Logs: `pm2 logs skylabs`
- Monitor: `pm2 monit`

## Environment Variables

Make sure to set all required environment variables in your production environment. You can use:

1. `.env` file in the project root
2. System environment variables
3. PM2 environment variables

## Monitoring

Monitor your application using PM2:

```bash
# Show application logs
pm2 logs skylabs --lines 100

# Show application status
pm2 status

# Monitor application resources
pm2 monit
```

## Updating the Application

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart:
   ```bash
   npm run restart:prod
   ```

## Troubleshooting

- If you encounter database connection issues, verify your `DATABASE_URL` in the `.env` file
- Check PM2 logs for application errors: `pm2 logs skylabs`
- Ensure all required environment variables are set
- Verify that the database is running and accessible

## Security Considerations

- Always use HTTPS in production
- Keep your dependencies up to date
- Use strong, unique passwords for all services
- Regularly back up your database
- Monitor your application logs for suspicious activity
