# Fly.io Deployment Guide - Facebook Monetiser

**Complete setup for automated deployments via GitHub Actions**

---

## 📋 Prerequisites

1. **Fly.io Account** - Create free account at https://fly.io
2. **GitHub Repository** - Push your code to GitHub
3. **Fly CLI** - Install on your local machine

---

## 🚀 Step 1: Install Fly CLI

### macOS/Linux:
```bash
curl -L https://fly.io/install.sh | sh
```

### Windows:
```powershell
powershell -c "iwr https://fly.io/install.ps1 -useb | iex"
```

---

## 🔐 Step 2: Authenticate with Fly.io

```bash
flyctl auth signup
# OR if you already have an account:
flyctl auth login
```

This will open a browser window for authentication.

---

## 🏗️ Step 3: Create Fly.io App

```bash
cd facebook-monetiser
flyctl launch
```

**When prompted:**
- **Choose an app name:** Press Enter for default `facebook-monetiser`
- **Select region:** `Amsterdam (ams)` or choose closest to your users
- **Would you like to setup a PostgreSQL database?** `N` (we use SQLite)
- **Would you like to deploy now?** `N` (we'll deploy via GitHub Actions)

**This will create:**
- `fly.toml` (we've already created this for you)
- `.fly/` directory with app configuration

---

## 🔑 Step 4: Get Fly API Token for GitHub Actions

```bash
flyctl auth token
```

**Copy the token** - you'll need it for GitHub Secrets.

---

## ⚙️ Step 5: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

   **Name:** `FLY_API_TOKEN`  
   **Value:** `<paste your token from Step 4>`

---

## 🚢 Step 6: Push to GitHub

```bash
cd facebook-monetiser
git add .
git commit -m "Add Fly.io deployment configuration"
git push origin main
```

**This will trigger the GitHub Actions workflow automatically!**

---

## ✅ Step 7: Verify Deployment

### Check GitHub Actions:
- Go to **Actions** tab in your GitHub repo
- Click on the "Deploy to Fly.io" workflow
- Watch the deployment logs

### Check Fly.io Status:
```bash
flyctl status --app facebook-monetiser
```

### Visit Your App:
```bash
flyctl info --app facebook-monetiser
```

Look for `Hostname` - that's your app URL!

---

## 🔍 Step 8: Test Your Deployment

### Health Check:
```bash
curl https://facebook-monetiser.fly.dev/api/health
```

### Dashboard:
Visit: `https://facebook-monetiser.fly.dev/dashboard`

---

## 🛠️ Maintenance Commands

### View Logs:
```bash
flyctl logs --app facebook-monetiser
```

### SSH into the machine:
```bash
flyctl ssh console --app facebook-monetiser
```

### Restart the app:
```bash
flyctl apps restart facebook-monetiser
```

### Check disk usage (database size):
```bash
flyctl ssh console --app facebook-monetiser --command "du -sh /data"
```

### Scale up/down:
```bash
# Scale to 2 machines
flyctl scale count 2 --app facebook-monetiser

# Scale to 0 (stop completely)
flyctl scale count 0 --app facebook-monetiser
```

---

## 💰 Pricing & Limits

**Free Tier (great for testing!):**
- 3 small VMs
- 3GB volume storage
- 160GB outbound data transfer per month

**Your Facebook Monetiser setup:**
- **VM Size:** Shared CPU-1x (256MB RAM)
- **Storage:** 1GB persistent volume (SQLite database)
- **Estimated cost:** **$0/month** (well within free tier)

---

## 🔐 Environment Variables (Optional)

If you need to add Facebook API keys or OpenAI:

```bash
flyctl secrets set FACEBOOK_APP_ID=your_app_id --app facebook-monetiser
flyctl secrets set FACEBOOK_APP_SECRET=your_app_secret --app facebook-monetiser
flyctl secrets set OPENAI_API_KEY=your_key --app facebook-monetiser
```

---

## 📊 Monitoring

### Real-time logs:
```bash
flyctl logs --app facebook-monetiser --tail
```

### Metrics:
Visit: https://fly.io/apps/facebook-monetiser/metrics

---

## 🆘 Troubleshooting

### App won't start:
```bash
flyctl logs --app facebook-monetiser --tail
```

### Database issues:
```bash
flyctl ssh console --app facebook-monetiser --command "ls -la /data"
```

### Rollback to previous deployment:
```bash
flyctl releases rollback --app facebook-monetiser
```

---

## 🔄 How It Works

**Every push to `main` branch:**
1. GitHub Actions triggers automatically
2. Runs health check test
3. Deploys to Fly.io via `flyctl deploy --remote-only`
4. Verifies deployment health
5. Reports status back to GitHub

**You get:**
- ✅ Zero-downtime deployments
- ✅ Automatic SSL (https)
- ✅ Persistent database storage
- ✅ Global edge deployment (optional)
- ✅ Complete deployment history

---

## 📝 Next Steps

1. **Set up custom domain** (optional):
   ```bash
   flyctl certs create yourdomain.com --app facebook-monetiser
   ```

2. **Configure monitoring**:
   - Add uptime monitoring (UptimeRobot, Pingdom)
   - Set up alerting

3. **Backup database**:
   ```bash
   flyctl ssh console --app facebook-monetiser --command "cat /data/facebook-monetiser.db" > backup.db
   ```

---

**Questions?**
- Fly.io Docs: https://fly.io/docs/
- GitHub Actions: https://docs.github.com/en/actions
- Dmitry (me): Always here to help! 🎯
