# Domain Setup Guide for Guildford Programmer Developer

## Step 1: Purchase a Domain
1. Go to a domain registrar (Namecheap, GoDaddy, Google Domains, etc.)
2. Search for and purchase: `guildfordprogrammer.com` or similar
3. Consider these alternatives if taken:
   - `guildfordprogrammerdeveloper.com`
   - `guildforddev.com`
   - `guildfordcoding.com`

## Step 2: Configure DNS Settings
After deploying on Replit, you'll get a deployment URL like `your-app.replit.app`

### DNS Configuration:
1. In your domain registrar's DNS settings:
   - Add a CNAME record: `www` → `your-deployment-url.replit.app`
   - Add an A record: `@` (root domain) → Point to Replit's IP
   
2. Or use simple forwarding:
   - Forward `guildfordprogrammer.com` → `your-deployment-url.replit.app`

## Step 3: Update Website URLs
Once domain is configured, update these files:
- `client/index.html` - Update canonical URL and Open Graph URLs
- Replace `https://guildfordprogrammer.com` with your actual domain
- Update sitemap.xml with correct domain

## Step 4: SSL Certificate
- Replit Deployments automatically provide SSL certificates
- Your site will be accessible via `https://yourdomain.com`

## Step 5: Email Setup (Optional)
Set up professional email: `contact@guildfordprogrammer.com`
- Use your domain registrar's email service
- Or integrate with Google Workspace/Microsoft 365
- Update contact information on website

## Business Setup Checklist:
- [ ] Domain purchased and configured
- [ ] Professional email setup
- [ ] Google Analytics account created (replace GA_MEASUREMENT_ID)
- [ ] Google My Business listing created
- [ ] Social media profiles created
- [ ] Business cards/marketing materials updated with domain

## SEO Next Steps:
- Submit sitemap to Google Search Console
- Verify domain ownership
- Monitor search rankings
- Set up local business listings