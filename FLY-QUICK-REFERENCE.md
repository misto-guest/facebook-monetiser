# Fly.io Quick Reference

**Essential commands for daily use**

---

## 🚀 Deployment

```bash
# Deploy manually (if GitHub Actions fails)
flyctl deploy --remote-only

# Deploy specific commit
flyctl deploy --commit abc123

# Deploy without cache
flyctl deploy --remote-only --no-cache
```

---

## 📊 Status & Monitoring

```bash
# App status
flyctl status --app facebook-monetiser

# Real-time logs
flyctl logs --app facebook-monetiser --tail

# Last 100 lines
flyctl logs --app facebook-monetiser --tail 100

# Live metrics
flyctl status --app facebook-monetiser --all
```

---

## 🔧 Configuration

```bash
# View fly.toml config
cat fly.toml

# Update environment variable
flyctl secrets set PORT=3000 --app facebook-monetiser

# List all secrets
flyctl secrets list --app facebook-monetiser

# Remove a secret
flyctl secrets remove SECRET_NAME --app facebook-monetiser
```

---

## 🗄️ Database (SQLite)

```bash
# SSH into app
flyctl ssh console --app facebook-monetiser

# Once inside, check database
ls -la /data/
cat /data/facebook-monetiser.db

# Backup database to local
flyctl ssh console --app facebook-monetiser --command "cat /data/facebook-monetiser.db" > backup-$(date +%Y%m%d).db

# Restore database (careful!)
flyctl ssh console --app facebook-monetiser --command "cat > /data/facebook-monetiser.db" < backup.db
```

---

## 🔄 Scale

```bash
# Scale to 2 machines
flyctl scale count 2 --app facebook-monetiser

# Scale to 0 (stop)
flyctl scale count 0 --app facebook-monetiser

# Scale up memory/VM size
flyctl scale memory 512 --app facebook-monetiser

# Show current VM size
flyctl scale show --app facebook-monetiser
```

---

## 🛠️ Troubleshooting

```bash
# Restart app
flyctl apps restart facebook-monetiser

# View recent releases
flyctl releases list --app facebook-monetiser

# Rollback to previous release
flyctl releases rollback --app facebook-monetiser

# SSH for debugging
flyctl ssh console --app facebook-monetiser

# Check VM health
flyctl status --app facebook-monetiser --all
```

---

## 🔐 Authentication

```bash
# Login
flyctl auth login

# Check current user
flyctl auth whoami

# Get API token
flyctl auth token

# Logout
flyctl auth logout
```

---

## 📈 Costs & Limits

```bash
# Check current usage
flyctl orgs show

# View app resource usage
flyctl status --app facebook-monetiser --all

# Billing info
flyctl orgs show personal
```

---

## 🌐 Custom Domain

```bash
# Add domain
flyctl certs create yourdomain.com --app facebook-monetiser

# List certificates
flyctl certs list --app facebook-monetiser

# Check DNS status
flyctl ips list --app facebook-monetiser
```

---

## ⚡ Quick Workflow

**Typical deployment cycle:**
```bash
# 1. Make changes locally
# 2. Commit and push
git add .
git commit -m "Update feature"
git push origin main

# 3. GitHub Actions auto-deploys (check Actions tab)

# 4. If needed, check status manually
flyctl status --app facebook-monetiser

# 5. Check logs if something's wrong
flyctl logs --app facebook-monetiser --tail
```

---

**💡 Pro tip:** Create an alias for common commands in your shell:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias fb-status='flyctl status --app facebook-monetiser'
alias fb-logs='flyctl logs --app facebook-monetiser --tail'
alias fb-deploy='flyctl deploy --remote-only --app facebook-monetiser'
alias fb-ssh='flyctl ssh console --app facebook-monetiser'
```

Then use: `fb-status`, `fb-logs`, `fb-deploy`, `fb-ssh`
