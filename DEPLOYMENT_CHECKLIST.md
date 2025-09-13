# SkyLabs Deployment Checklist
## Contact Form – Production Readiness

1. Environment Variables
   - Server: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (or `DATABASE_URL`), `RECAPTCHA_SECRET_KEY`.
   - Client: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_CONTACT_EMAIL`.

2. Database Migrations
   - Run: `npm run db:migrate:apply` on the server.
   - Verify the `contacts` table exists and indexes are present.

3. Security & Anti-Spam
   - reCAPTCHA enabled on client and verified on server (`server/routes/contact.ts`).
   - Per-route rate limiting enabled on `/api/contact` (looser in `NODE_ENV=test`).
   - Honeypot field `website` added on client and validated on server.
   - Optional: server-side logging/auditing of submissions.

4. Integration & Edge Cases
   - Client toasts show “Message Sent!” on success and a destructive error toast on failure.
   - Validate: empty fields, invalid email, long message (optionally cap with Zod `.max()`).
   - Simulate DB failure to confirm HTTP 500 without a crash.

5. HTTPS & Headers
   - Confirm HTTPS redirect and security headers (Helmet) in staging/production.
   - Inspect headers with: `curl -I https://your-domain/api/contact`.

6. Testing
   - Jest picks up `__tests__/*.integration.test.ts`.
   - Use a test DB (recommended `skylabs_test`) or temporarily reuse dev DB.
   - Optionally silence console output in tests.


## 1. 📂 Environment Configuration

### Create `.env.production`
```env
NODE_ENV=production
PORT=443
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=super-strong-random-secret
DATABASE_URL=postgres://user:password@host:5432/skylabs_prod
```

### Verify
- [ ] `.env.production` is in `.gitignore`
- [ ] All sensitive values are properly generated and secured
- [ ] Environment variables are loaded correctly in production

## 2. 🔑 Security Middleware Setup

### Security Checks
- [ ] Helmet is enabled with proper CSP, XSS, and other security headers
- [ ] Rate limiter uses IPv6-safe key generator
- [ ] Account lockout works after multiple failed login attempts
- [ ] HTTPS redirection is active only in production
- [ ] CORS is properly configured for production domain

### Testing Commands
```bash
# Test rate limiting
for i in {1..11}; do curl -I http://localhost:3000/api/auth/login; done

# Test account lockout
for i in {1..6}; do curl -X POST http://localhost:3000/api/auth/login -d '{"email":"test@example.com","password":"wrong"}' -H "Content-Type: application/json"; done
```

## 3. 🗄️ Database Migration

### Migration Steps
```bash
# Run migrations
psql -U skylabs -d skylabs_prod -f migrations/0004_add_security_fields.sql

# Verify schema
psql -U skylabs -d skylabs_prod -c "\d+ users" | grep -E 'login_attempts|lock_until|last_login'
```

### Verify
- [ ] All migrations have been applied successfully
- [ ] Required indexes are created
- [ ] Database user has correct permissions

## 4. 🧪 Pre-Deployment Testing

### Local Testing
```bash
# Run tests
npm test

# Production build test
npm run build
NODE_ENV=production node dist/server.js

# Check security headers
curl -I http://localhost:3000
```

### Verify
- [ ] All tests pass
- [ ] Production build completes without errors
- [ ] Security headers are present in responses
- [ ] HTTPS redirection works in production mode

## 5. ☁️ Deployment

### Choose Your Hosting Option:

#### Option A: Docker
```bash
docker build -t skylabs-api .
docker run -d -p 443:443 --env-file .env.production skylabs-api
```

#### Option B: PM2
```bash
npm install -g pm2
pm2 start dist/server.js --name "skylabs-api" --env production
pm2 save
pm2 startup
```

### Verify
- [ ] Application starts without errors
- [ ] All environment variables are properly set
- [ ] Application is accessible on the correct port

## 6. 🔒 Post-Deployment Security

### Essential Security Measures
- [ ] Configure firewall (only allow ports 80, 443)
- [ ] Set up SSL/TLS (Let's Encrypt)
- [ ] Enable HSTS with preload
- [ ] Set up monitoring and alerting

### Monitoring Setup
```bash
# Install monitoring tools
npm install --save winston express-winston

# Set up log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 7. 📊 Validation

### Security Scans
```bash
# Check SSL configuration
npx check-ssl-certificate yourdomain.com

# Check security headers
npx check-headers https://yourdomain.com
```

### Verify
- [ ] SSL Labs A+ rating
- [ ] Security headers present
- [ ] No mixed content warnings
- [ ] Rate limiting works as expected

## 8. 🚀 Final Checks
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Monitoring and alerting working
- [ ] Team notified of deployment

## Emergency Rollback
```bash
# For Docker
# 1. Stop current container
docker stop skylabs-api

# 2. Start previous version
docker run -d -p 443:443 --env-file .env.production skylabs-api:previous-version

# For PM2
pm2 restart skylabs-api --update-env
```

## Support
- [ ] Documented API endpoints
- [ ] Error logging and monitoring
- [ ] Contact information for support

## Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment runbook
- [ ] Troubleshooting guide
