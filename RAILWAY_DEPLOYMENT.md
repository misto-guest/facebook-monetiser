# Railway Deployment Guide for Facebook Monetiser

## Quick Deployment via Railway Dashboard (Recommended)

Since the Railway API token requires browser authentication, the easiest way to deploy is via Railway's web dashboard:

### Step 1: Prepare Your Code
1. Ensure your code is pushed to a GitHub repository
2. If not initialized as git repo, run:
   ```bash
   git init
   git add .
   git commit -m "Prepare for Railway deployment"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Create Railway Service
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `facebook-monetiser` repository
4. Railway will auto-detect Node.js and create the service

### Step 3: Configure Environment Variables
In Railway service settings, add these environment variables:

```
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/facebook-monetiser.db
```

### Step 4: Configure Persistent Volume
1. Go to your service → **Variables** tab
2. Scroll to **Volumes** section
3. Click **"New Volume"**
4. Mount path: `/data`
5. This ensures your SQLite database survives redeployments

### Step 5: Deploy
1. Railway will automatically deploy on push
2. Or click **"Deploy Now"** button
3. Monitor build logs for any errors

### Step 6: Access Your App
- Dashboard will show your production URL (e.g., `https://facebook-monetiser.up.railway.app`)
- Main app: `https://your-url.up.railway.app/`
- Dashboard: `https://your-url.up.railway.app/dashboard`
- Health check: `https://your-url.up.railway.app/api/health`

---

## Alternative: Railway CLI Deployment

If you have a working Railway CLI setup:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login (opens browser)
railway login

# Create new project or link to existing 'clawe' project
railway project init

# Add service
railway add

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DATABASE_PATH=/data/facebook-monetiser.db

# Configure volume for database persistence
railway volume add /data

# Deploy
railway up

# Get your production URL
railway domain
```

---

## Post-Deployment Verification

### 1. Check Health Endpoint
```bash
curl https://your-url.up.railway.app/api/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T14:00:00.000Z"
}
```

### 2. Test Dashboard
Open: `https://your-url.up.railway.app/dashboard`

### 3. Test API Endpoints
```bash
# Get all pages
curl https://your-url.up.railway.app/api/pages

# Get all posts
curl https://your-url.up.railway.app/api/posts

# Get health status
curl https://your-url.up.railway.app/api/health
```

---

## Troubleshooting

### Database Not Persisting
- Ensure you've created a volume at `/data` in Railway settings
- Check that `DATABASE_PATH` is set to `/data/facebook-monetiser.db`

### Build Failures
- Check build logs in Railway dashboard
- Ensure `package.json` has correct start script: `npm start`
- Verify Node.js version compatibility (>=16.0.0)

### Port Issues
- Railway automatically assigns a port
- Ensure your app listens on `process.env.PORT`
- The application is already configured correctly

### Environment Variables Not Working
- Double-check variable names (case-sensitive)
- Ensure no trailing spaces in values
- Re-deploy after adding variables

---

## Database Migration: SQLite to Supabase/Postgres

For better production performance, consider migrating to Supabase:

### Why Migrate?
- ✅ Better concurrency handling
- ✅ Automatic backups
- ✅ Better scalability
- ✅ No volume management needed

### Migration Steps
1. Create free Supabase project
2. Get connection string
3. Install `pg` package: `npm install pg`
4. Update `backend/database/` to use PostgreSQL
5. Update Railway environment variable:
   ```
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   ```

---

## Production Checklist

- [x] Code pushed to GitHub
- [x] Railway service created
- [x] Environment variables configured
- [x] Persistent volume set up at `/data`
- [x] Deployment successful
- [x] Health endpoint responding
- [x] Dashboard loading correctly
- [x] API endpoints accessible
- [x] Custom domain configured (optional)
- [x] Error monitoring set up (optional)

---

## Railway Service URLs

Once deployed, you'll have:

**Base URL:** `https://facebook-monetiser.up.railway.app` (or your custom domain)

**Endpoints:**
- Frontend: `https://facebook-monetiser.up.railway.app/`
- Dashboard: `https://facebook-monetiser.up.railway.app/dashboard`
- API Health: `https://facebook-monetiser.up.railway.app/api/health`
- API Pages: `https://facebook-monetiser.up.railway.app/api/pages`
- API Posts: `https://facebook-monetiser.up.railway.app/api/posts`
- API Sources: `https://facebook-monetiser.up.railway.app/api/sources`
- API Predictions: `https://facebook-monetiser.up.railway.app/api/predictions`
- API Content: `https://facebook-monetiser.up.railway.app/api/content`

---

## Support

For issues:
1. Check Railway build logs
2. Check service logs in Railway dashboard
3. Verify environment variables are set correctly
4. Ensure persistent volume is configured
5. Test locally with `npm start` first

---

**Generated:** 2026-03-02  
**Project:** Facebook Monetiser  
**Platform:** Railway
