# 📝 Manual Setup Guide

This document contains all the manual setup steps required to deploy the SkyLabs application.

## 🔑 Environment Variables

Create the following files with the appropriate values:

### `.env.staging`
```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:password@staging-db:5432/skylabs
SESSION_SECRET=your-staging-session-secret
RECAPTCHA_SITE_KEY=your-staging-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-staging-recaptcha-secret-key
```

### `.env.production`
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@production-db:5432/skylabs
SESSION_SECRET=your-production-session-secret
RECAPTCHA_SITE_KEY=your-production-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-production-recaptcha-secret-key
```

## 🌐 DNS Configuration

1. **For Staging**
   - Create an A record: `staging.yourdomain.com` → Your staging server IP
   - Create a CNAME: `www.staging.yourdomain.com` → `staging.yourdomain.com`

2. **For Production**
   - Create an A record: `yourdomain.com` → Your production server IP
   - Create a CNAME: `www.yourdomain.com` → `yourdomain.com`

## 🔒 SSL Certificates

1. Install Certbot:
   ```bash
   sudo apt-get update
   sudo apt-get install -y certbot
   ```

2. Generate certificates for staging:
   ```bash
   ./scripts/setup-ssl.sh staging.yourdomain.com admin@yourdomain.com
   ```

3. Generate certificates for production:
   ```bash
   ./scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
   ```

## 🔑 GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets → Actions → New repository secret):

| Secret Name | Description |
|-------------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Your Docker Hub access token |
| `STAGING_HOST` | Staging server IP or hostname |
| `STAGING_USERNAME` | SSH username for staging |
| `STAGING_SSH_KEY` | Private SSH key for staging |
| `STAGING_DATABASE_URL` | Database URL for staging |
| `PRODUCTION_HOST` | Production server IP or hostname |
| `PRODUCTION_USERNAME` | SSH username for production |
| `PRODUCTION_SSH_KEY` | Private SSH key for production |
| `PRODUCTION_DATABASE_URL` | Database URL for production |

## 🚀 First Deployment

1. **On the server**, clone the repository:
   ```bash
   git clone https://github.com/your-username/skylabs.git
   cd skylabs
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   # Edit with your values
   nano .env
   ```

3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Set up the database:
   ```bash
   docker-compose exec app npm run db:migrate
   docker-compose exec app npm run db:seed
   ```

## 🔄 Updating the Application

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## 🔍 Monitoring Setup

1. Access Grafana at `http://yourdomain.com:3001`
   - Default credentials: admin/admin
   - Change the default password when prompted

2. Add Prometheus as a data source:
   - URL: http://prometheus:9090
   - Access: Server (default)

3. Import the following dashboards:
   - Node Exporter Full (ID: 1860)
   - PostgreSQL (ID: 9628)

## 🛡️ Security Hardening

1. **Firewall Rules**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

2. **Automatic Security Updates**
   ```bash
   sudo apt-get install -y unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

3. **Fail2Ban**
   ```bash
   sudo apt-get install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
