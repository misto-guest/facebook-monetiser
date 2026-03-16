# Setup Guide - Facebook Monetiser

Complete setup instructions for local development and Railway deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Server](#running-the-server)
6. [Railway Deployment](#railway-deployment)
7. [API Key Setup](#api-key-setup)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Git:** For version control
- **SQLite3:** For local database (usually included)

### Check versions

```bash
node --version  # Should be 18+
npm --version   # Should be 9+
git --version   # Should be 2.x+
```

## Local Setup

### 1. Clone or navigate to project

```bash
cd /path/to/facebook-monetiser
```

### 2. Install dependencies

```bash
npm install
```

This installs:
- express - Web framework
- cors - Cross-origin handling
- sqlite3 - Database
- dotenv - Environment variables
- tailwindcss - Styling (CDN)

### 3. Create environment file

```bash
# Create .env file in project root
touch .env
```

Add the following content:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/facebook-monetiser.db

# AI Services (Optional - will use mock mode if not provided)
RUNWARE_API_KEY=your_runware_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

## Database Setup

### 1. Create data directory

```bash
mkdir -p data
```

### 2. Initialize database schema

```bash
# Run base schema
sqlite3 data/facebook-monetiser.db < backend/database/schema.sql

# Run SMV enhancements migration
sqlite3 data/facebook-monetiser.db < backend/database/migrations/002_smv_enhancements.sql
```

### 3. Verify database

```bash
# List all tables
sqlite3 data/facebook-monetiser.db ".tables"

# Should show:
# automation_limits      pages                   v_high_velocity_content
# competitors            post_performance         v_pages_monetization
# generated_posts        schedules                v_sources_verification
# insights               scraped_content
# page_assets            sources
```

### 4. Verify SMV columns

```bash
# Check pages table has new columns
sqlite3 data/facebook-monetiser.db ".schema pages"

# Should include: owner_name, owner_entity, creation_date, primary_niche, language, monetization_status, notes
```

## Environment Configuration

### Development Mode (.env)

```env
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/facebook-monetiser.db
RUNWARE_API_KEY=optional_for_testing
FIRECRAWL_API_KEY=optional_for_testing
```

### Production Mode (Railway)

Set these in Railway dashboard:

```env
PORT=3000
NODE_ENV=production
DATABASE_PATH=/data/facebook-monetiser.db
RUNWARE_API_KEY=your_production_key
FIRECRAWL_API_KEY=your_production_key
```

## Running the Server

### Start server

```bash
npm start
```

Output should be:
```
🚀 Facebook Monetiser Backend Server
📡 Server running: http://localhost:3000
📊 Dashboard: http://localhost:3000/dashboard
🗄️  Database: ./data/facebook-monetiser.db
```

### Development mode (with auto-restart)

```bash
npm run dev
```

Requires nodemon (not in package.json - add if needed):
```bash
npm install -g nodemon
```

### Access the application

- **Home:** http://localhost:3000
- **Dashboard:** http://localhost:3000/dashboard
- **Analytics:** http://localhost:3000/analytics
- **Health Check:** http://localhost:3000/api/health

## Railway Deployment

### 1. Prepare for Railway

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"
```

### 2. Create Railway app

Option A: Via CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Option B: Via Dashboard
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Click "Deploy from GitHub repo"
4. Select your repository

### 3. Configure environment variables

In Railway dashboard:

1. Go to your project
2. Click "Variables" tab
3. Add variables:

```env
PORT=3000
NODE_ENV=production
DATABASE_PATH=/data/facebook-monetiser.db
RUNWARE_API_KEY=your_key_here
FIRECRAWL_API_KEY=your_key_here
```

### 4. Add persistent volume

1. Go to "Volumes" tab
2. Click "Create Volume"
3. Set mount path: `/data`
4. Attach to your service

### 5. Deploy

```bash
git push origin main
```

Railway auto-deploys on push.

### 6. Get your URL

In Railway dashboard:
- Go to "Networking"
- Click "Generate Domain"
- Copy your Railway URL

## API Key Setup

### Runware.ai (Optional)

1. Go to [runware.ai](https://runware.ai)
2. Sign up for account
3. Navigate to API Keys
4. Generate new key
5. Add to `.env` or Railway variables

**Without API key:** System uses mock responses for development.

### Firecrawl (Optional)

1. Go to [firecrawl.dev](https://firecrawl.dev)
2. Sign up for account
3. Get API key from dashboard
4. Add to `.env` or Railway variables

**Without API key:** System uses mock scraping data.

## Testing

### Test health endpoint

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T15:30:00.000Z"
}
```

### Test content generation (Mock mode)

```bash
curl -X POST http://localhost:3000/api/content/caption \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test pages API

```bash
# Get all pages
curl http://localhost:3000/api/pages

# Create page
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Page",
    "page_id": "test123",
    "category": "Health & Fitness",
    "primary_niche": "fitness",
    "followers_count": 10000
  }'
```

### Test predictions API

```bash
# Get accuracy metrics
curl http://localhost:3000/api/predictions/accuracy/metrics
```

## Troubleshooting

### Port already in use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm start
```

### Database locked

**Error:** `database is locked`

**Solution:**
```bash
# Enable WAL mode
sqlite3 data/facebook-monetiser.db "PRAGMA journal_mode=WAL;"

# Or close all database connections
lsof data/facebook-monetiser.db
```

### CORS errors

**Error:** CORS policy blocking requests

**Solution:**
Already configured in `server.js`. If still failing:
```javascript
// In server.js, update cors middleware
app.use(cors({
  origin: '*', // Or specific origin
  credentials: true
}));
```

### Runware API errors

**Error:** `Runware API error: 401`

**Solution:**
- Check API key is valid
- Verify key has credits
- Check API status: `curl https://api.runware.ai/v1/health`

### Firecrawl rate limits

**Error:** `429 Too Many Requests`

**Solution:**
- Service automatically respects rate limits (1 req/sec)
- Wait before retrying
- Check API usage dashboard

### Migration errors

**Error:** `Parse error near line X`

**Solution:**
```bash
# Start fresh
rm data/facebook-monetiser.db
sqlite3 data/facebook-monetiser.db < backend/database/schema.sql
sqlite3 data/facebook-monetiser.db < backend/database/migrations/002_smv_enhancements.sql
```

## Development Workflow

### 1. Make changes

Edit files in `backend/` or `frontend/`

### 2. Restart server

```bash
# If using npm start
# Ctrl+C to stop, then npm start

# If using nodemon
# Auto-restarts on file changes
```

### 3. Test changes

```bash
# Check health
curl http://localhost:3000/api/health

# Access dashboard
open http://localhost:3000/dashboard
```

### 4. Commit changes

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

## File Structure

```
facebook-monetiser/
├── backend/
│   ├── api/                    # API endpoints
│   │   ├── pages.js
│   │   ├── pages-enhanced.js   # SMV enhancements
│   │   ├── sources.js
│   │   ├── sources-enhanced.js
│   │   ├── posts.js
│   │   ├── predictions.js
│   │   ├── predictions-enhanced.js
│   │   ├── scraped.js
│   │   └── content-generator.js
│   ├── services/               # Business logic
│   │   ├── prediction-service.js
│   │   ├── risk-scoring.js
│   │   ├── velocity-scoring.js
│   │   ├── content-generator-enhanced.js
│   │   ├── runware-service.js
│   │   └── firecrawl-service.js
│   ├── database/
│   │   ├── schema.sql
│   │   └── migrations/
│   │       └── 002_smv_enhancements.sql
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── analytics.html
│   └── static/js/
│       ├── dashboard.js
│       └── dashboard-enhanced.js
├── data/                       # Created on first run
│   └── facebook-monetiser.db
├── .env                        # Environment variables
├── package.json
└── README.md
```

## Next Steps

After setup:

1. ✅ Add your first Facebook page
2. ✅ Generate content for 3 niches
3. ✅ Review analytics dashboard
4. ✅ (Optional) Add API keys for real AI
5. ✅ (Optional) Deploy to Railway

## Support

For issues:
1. Check [Troubleshooting](#troubleshooting)
2. Review [README.md](./README.md)
3. Check [API Enhancements](./API_ENHANCEMENTS.md)

Last updated: 2026-03-02
