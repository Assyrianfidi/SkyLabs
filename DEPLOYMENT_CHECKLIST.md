# SkyLabs Deployment Checklist

## ContactFormWithRecaptcha – Production Readiness

### 1. Environment Variables

#### Server
- [ ] `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA v3 secret key
- [ ] `RATE_LIMIT_WINDOW_MS=900000` (15 minutes)
- [ ] `RATE_LIMIT_MAX_REQUESTS=5`
- [ ] `CONTACT_FORM_ENDPOINT=/api/contact`
- [ ] `NODE_ENV=production`

#### Client
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Google reCAPTCHA v3 site key
- [ ] `NEXT_PUBLIC_API_BASE_URL` - Base URL for API requests
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` - Email for form submissions
- [ ] `NEXT_PUBLIC_APP_ENV=production`

### 2. reCAPTCHA Configuration

- [ ] Register domain in Google reCAPTCHA admin console
- [ ] Set up proper domains in reCAPTCHA settings
- [ ] Configure security preferences (score threshold, alerts)
- [ ] Verify reCAPTCHA badge is visible on production
- [ ] Test reCAPTCHA verification in different scenarios

### 3. Security & Anti-Spam

- [ ] Client-side rate limiting implemented
- [ ] Honeypot field (`website`) properly hidden from users
- [ ] CSRF protection enabled
- [ ] Input sanitization on server
- [ ] Request validation on server
- [ ] Rate limiting on API endpoint
- [ ] Audit logging for form submissions
- [ ] IP-based rate limiting (optional)

### 4. Testing

#### Unit Tests
- [ ] Form validation
- [ ] Error handling
- [ ] reCAPTCHA integration
- [ ] Rate limiting
- [ ] Accessibility checks

#### Integration Tests
- [ ] Form submission flow
- [ ] Error scenarios
- [ ] Rate limiting behavior
- [ ] reCAPTCHA verification

#### Manual Testing
- [ ] Form submission with valid data
- [ ] Form validation errors
- [ ] Network failure scenarios
- [ ] reCAPTCHA failure
- [ ] Rate limiting behavior
- [ ] Screen reader compatibility

### 5. Performance

- [ ] Lazy loading of reCAPTCHA script
- [ ] Form component code splitting
- [ ] Optimized re-renders
- [ ] Bundle size analysis
- [ ] Load testing with simulated users

### 6. Monitoring & Analytics

- [ ] Error tracking (Sentry, LogRocket)
- [ ] reCAPTCHA score monitoring
- [ ] Form submission analytics
- [ ] Performance metrics
- [ ] Error rate monitoring

### 7. Documentation

- [ ] Component API documentation
- [ ] Setup instructions
- [ ] Troubleshooting guide
- [ ] Changelog
- [ ] Deployment procedures

### 8. Rollback Plan

- [ ] Versioned API endpoints
- [ ] Feature flags (if applicable)
- [ ] Rollback procedure documented
- [ ] Emergency contact information


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
