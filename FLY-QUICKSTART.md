# 🚀 Fly.io Deployment - Quick Start

**Get Facebook Monetiser deployed on Fly.io in 5 minutes**

---

## ✅ Prerequisites Check

Before starting, ensure you have:
- [ ] GitHub repo for this project
- [ ] Fly.io account (free at https://fly.io)
- [ ] Terminal access

---

## 🎯 5-Minute Setup

### Step 1: Install Fly CLI (1 min)

```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Authenticate (1 min)

```bash
flyctl auth login
```

This opens a browser window to login.

### Step 3: Initialize App (2 min)

```bash
cd facebook-monetiser
flyctl launch
```

**When prompted:**
- App name: Press Enter for default `facebook-monetiser`
- Region: `Amsterdam (ams)` or choose closest to you
- PostgreSQL: `N` (we use SQLite)
- Deploy now: `N` (we'll deploy via GitHub Actions)

### Step 4: Get API Token (30 sec)

```bash
flyctl auth token
```

Copy the output.

### Step 5: Add GitHub Secret (30 sec)

1. Go to your GitHub repo → **Settings** → **Secrets** → **Actions**
2. Click **New repository secret**
3. Name: `FLY_API_TOKEN`
4. Value: [paste token from Step 4]
5. Click **Add secret**

### Step 6: Deploy! (30 sec)

```bash
git add .
git commit -m "Add Fly.io deployment"
git push origin main
```

**GitHub Actions will automatically deploy!**

---

## ✅ Verify Deployment

### Check GitHub Actions:
Go to **Actions** tab → click workflow run

### Check Status:
```bash
flyctl status --app facebook-monetiser
```

### Visit App:
```bash
flyctl info --app facebook-monetiser
```

Copy the `Hostname` URL and visit it in your browser!

---

## 🎉 You're Live!

**Your app is now:**
- ✅ Deployed on Fly.io
- ✅ Running on free tier
- ✅ Auto-deploys on every push to `main`
- ✅ HTTPS enabled
- ✅ Database persisted

---

## 📚 Next Steps

1. **Read full guide:** `FLY-DEPLOYMENT-GUIDE.md`
2. **Quick reference:** `FLY-QUICK-REFERENCE.md`
3. **Compare platforms:** `RAILWAY-VS-FLY.md`

---

## 🆘 Need Help?

**Deployment issues:**
```bash
flyctl logs --app facebook-monetiser --tail
```

**Restart app:**
```bash
flyctl apps restart facebook-monetiser
```

**Rollback:**
```bash
flyctl releases rollback --app facebook-monetiser
```

---

**🎯 Done! Your app is live and auto-deploys on every push.**
