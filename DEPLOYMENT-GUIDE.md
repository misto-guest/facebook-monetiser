# Facebook Monetiser - Complete Deployment Guide

This guide will help you set up all automation features for the Facebook Monetiser tool.

---

## 📋 Overview

The Facebook Monetiser now includes full automation capabilities:

1. **AI Content Generation** - Uses z.ai (Runware GLM-4) for intelligent captions
2. **Competitor Scraping** - Automatically monitors competitor Facebook pages
3. **Follower Monitoring** - Tracks follower count growth over time
4. **Post Monitoring** - Tracks post counts and engagement metrics
5. **Auto-Publishing** - Publishes scheduled posts automatically

---

## 🔧 Prerequisites

### Required API Keys

1. **z.ai (Runware) API Key** - ✅ Already configured
   - Key: `35669f5402e94868aabffee742ae2272.twAEmwMX0Jhd2THG`
   - Used for AI content generation

2. **Facebook Graph API Access** - ⚠️ You need to set this up
   - Facebook App ID
   - Facebook App Secret
   - Page Access Token
   - Permissions required: `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`

3. **Firecrawl API Key** (Optional) - For advanced competitor scraping
   - Only needed if HTTP scraping doesn't work

---

## 🚀 Deployment Steps

### Step 1: Set Up Facebook Developer App

1. Go to https://developers.facebook.com/apps
2. Create a new app (select "Business" type)
3. Add "Facebook Login" product
4. Configure app settings:
   - App Domains: `fly.dev` (or your domain)
   - Privacy Policy URL: (optional but recommended)
5. Navigate to Tools → Graph API Explorer
6. Generate Page Access Token:
   - Select your app
   - Select your page
   - Grant permissions: `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`
   - Copy the access token

### Step 2: Configure Environment Variables

Edit your `.env` file:

```bash
# z.ai (Runware) API - Already configured
RUNWARE_API_KEY=35669f5402e94868aabffee742ae2272.twAEmwMX0Jhd2THG

# Facebook Graph API - Add your credentials
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token_here
FACEBOOK_PAGE_ID=your_page_id_here

# Database
DATABASE_PATH=./database/facebook-monetiser.db

# Server
PORT=3000
NODE_ENV=production
```

### Step 3: Deploy to Fly.io

If you're using Fly.io:

```bash
# Set secrets
flyctl secrets set RUNWARE_API_KEY=35669f5402e94868aabffee742ae2272.twAEmwMX0Jhd2THG -a facebook-monetiser
flyctl secrets set FACEBOOK_APP_ID=your_app_id -a facebook-monetiser
flyctl secrets set FACEBOOK_APP_SECRET=your_app_secret -a facebook-monetiser
flyctl secrets set FACEBOOK_PAGE_ACCESS_TOKEN=your_token -a facebook-monetiser
flyctl secrets set FACEBOOK_PAGE_ID=your_page_id -a facebook-monetiser

# Deploy
flyctl deploy -a facebook-monetiser
```

### Step 4: Setup Cron Jobs

SSH into your server:

```bash
# For Fly.io
flyctl ssh console -a facebook-monetiser -C "/bin/bash"

# For other servers
ssh user@your-server
```

Then run the setup script:

```bash
cd /app
bash backend/scripts/setup-automation.sh
```

This will show you the exact crontab entries to add.

### Step 5: Add Crontab Entries

Edit crontab:

```bash
crontab -e
```

Add these entries:

```bash
# Facebook Monetiser - Competitor Scraping (every 3 hours)
0 */3 * * * cd /app && node backend/scripts/scrape-competitors.js >> logs/automation.log 2>&1

# Facebook Monetiser - Follower Count Scraping (daily at 9 AM)
0 9 * * * cd /app && node backend/scripts/scrape-followers.js >> logs/automation.log 2>&1

# Facebook Monetiser - Post Monitoring (every 6 hours)
0 */6 * * * cd /app && node backend/scripts/monitor-posts.js >> logs/automation.log 2>&1

# Facebook Monetiser - Scheduled Posts Publishing (every 5 minutes)
*/5 * * * * cd /app && node backend/scripts/publish-scheduled.js >> logs/automation.log 2>&1
```

Save and exit (in nano: CTRL+X, then Y, then Enter).

---

## 🧪 Testing

### Test AI Content Generation

1. Go to the Dashboard → Content Generation tab
2. Select a source from the dropdown
3. Click "Generate Caption"
4. You should see AI-generated captions (not just templates)

### Test Competitor Scraping

```bash
cd /app
node backend/scripts/scrape-competitors.js
```

Check logs:

```bash
tail -f /app/logs/automation.log
```

### Test Follower Scraping

```bash
cd /app
node backend/scripts/scrape-followers.js
```

### Test Post Publishing

1. Go to the Dashboard
2. Create a new draft
3. Click "Publish Now"
4. Check if it appears on your Facebook page

---

## 📊 Monitoring

### View Logs

```bash
# Live logs
tail -f /app/logs/automation.log

# Last 50 lines
tail -n 50 /app/logs/automation.log

# Search for errors
grep ERROR /app/logs/automation.log
```

### Check Cron Job Status

```bash
# View crontab
crontab -l

# Check cron logs
grep CRON /var/log/syslog  # Linux
log show --predicate 'process == "cron"'  # macOS
```

### Database Queries

```bash
# Check recent scraped content
sqlite3 /app/database/facebook-monetiser.db "SELECT * FROM scraped_content ORDER BY scraped_at DESC LIMIT 10;"

# Check follower history
sqlite3 /app/database/facebook-monetiser.db "SELECT * FROM follower_history ORDER BY recorded_at DESC LIMIT 10;"

# Check scheduled posts
sqlite3 /app/database/facebook-monetiser.db "SELECT * FROM scheduled_posts WHERE status = 'scheduled';"
```

---

## ⚠️ Troubleshooting

### AI Content Generation Not Working

**Symptom:** Only template captions, no AI generation

**Solution:**
1. Check `RUNWARE_API_KEY` is set correctly
2. Check logs for API errors
3. Verify API key is valid

### Cron Jobs Not Running

**Symptom:** No new data appearing

**Solution:**
1. Check crontab: `crontab -l`
2. Check cron is running: `ps aux | grep cron`
3. Check script permissions: `ls -la backend/scripts/`
4. Test scripts manually

### Facebook Posting Not Working

**Symptom:** Posts fail to publish

**Solution:**
1. Verify `FACEBOOK_PAGE_ACCESS_TOKEN` is valid
2. Check token permissions
3. Test connection in Settings → Facebook API
4. Check if token has expired (tokens expire after 60 days)

### Competitor Scraping Returns Empty

**Symptom:** No content scraped from competitors

**Solution:**
1. Facebook pages often require authentication
2. Use mock mode for testing
3. Consider using Firecrawl API for better scraping

---

## 📝 Important Notes

### Time Zones

Cron jobs use UTC time. Adjust accordingly:

- If you want 9 AM EST (UTC-5), set cron for 14:00 (2 PM UTC)
- If you want 9 AM CET (UTC+1), set cron for 8:00 (8 AM UTC)

### Rate Limits

Facebook has API rate limits:

- Don't scrape more than once every 3 hours
- Don't publish more than 10 posts per hour
- Spread out posting times

### Security

- Never commit `.env` file to git
- Rotate access tokens every 60 days
- Use read-only tokens when possible
- Monitor logs for suspicious activity

---

## 🎯 Next Steps

1. **Add competitor sources** in the dashboard
2. **Create your first post** using AI generation
3. **Schedule posts** for automatic publishing
4. **Monitor follower growth** over time
5. **Analyze trending content** from competitors

---

## 📚 Resources

- **Dashboard:** https://facebook-monetiser.fly.dev/dashboard
- **Facebook Graph API Docs:** https://developers.facebook.com/docs/graph-api
- **z.ai (Runware) Docs:** https://runware.ai/docs
- **Fly.io Docs:** https://fly.io/docs

---

## ✅ Checklist

Before going live, ensure:

- [ ] Facebook Developer app created
- [ ] Page Access Token generated with correct permissions
- [ ] Environment variables configured
- [ ] Deployed to production
- [ ] Scripts tested manually
- [ ] Cron jobs added to crontab
- [ ] Logs directory created
- [ ] First post published successfully
- [ ] Competitor sources added
- [ ] Follower tracking working

---

**Last Updated:** March 3, 2026

**Version:** 2.0 (Full Automation)
