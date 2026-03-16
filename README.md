# Facebook Monetiser - SMV Specification

AI-powered Facebook content generation system focused on 3 high-performing niches.

**Status:** MVP Complete ✅ | Fly.io Ready 🚀 | Railway Supported | Enhanced with SMV Features

## 🎯 Primary Niches (Based on x-scraper Data)

### 1. 90s Nostalgia 💿
- **Engagement:** Highest emotional response
- **Keywords:** 90s, nostalgia, throwback, vintage, retro
- **Emojis:** 📼💿📟🎮📺
- **Sentiment:** Sentimental, warm, relatable

### 2. Political Content 🗳️
- **Engagement:** High controversy/virality
- **Keywords:** election, government, policy, vote, democracy
- **Emojis:** 🗳️🇺🇸⚖️📜🏛️
- **Sentiment:** Serious, civic, discussion-oriented

### 3. Emotional/Sentimental 💪
- **Engagement:** Strong motivation/inspiration
- **Keywords:** motivation, inspiration, emotional, support, mental health
- **Emojis:** 💪❤️✨🌟💫
- **Sentiment:** Uplifting, encouraging, supportive

## 🚀 Features

### Content Generation
- ✅ **AI-Powered Captions** - runware.ai integration with model testing
- ✅ **Smart Templates** - Niche-specific content frameworks
- ✅ **Auto-Approval** - All posts auto-approved for MVP (Phase 2: risk scoring)
- ✅ **Image Prompts** - DALL-E 3, Midjourney, SDXL support
- ✅ **Comment Generation** - CTAs and engagement hooks

### Analytics & Insights
- ✅ **Performance Predictions** - CTR, CVR, CPA forecasting
- ✅ **Velocity Scoring** - Trend detection and engagement velocity
- ✅ **Niche Performance** - Per-niche analytics
- ✅ **Model Performance** - AI model comparison and testing

### Scraping & Research
- ✅ **Firecrawl Integration** - Competitor content analysis
- ✅ **Insight Extraction** - Automatic topic and engagement detection
- ✅ **Velocity Tracking** - Content velocity trend analysis

### Page Management
- ✅ **Multi-Page Support** - Manage multiple Facebook pages
- ✅ **Asset Tracking** - Websites, groups, ad accounts, Instagram
- ✅ **Monetization Status** - Track approval states
- ✅ **Niche Categorization** - Primary niche per page

### Draft System (MVP)
- ✅ **Draft Generation** - Create content with AI
- ✅ **Manual Review** - User approves before posting
- ✅ **Copy/Paste Export** - Manual Facebook posting
- ⏳ **Auto-Posting** - Planned for Phase 2

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Dashboard                      │
│  (Content creation, analytics, page management)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  (RESTful endpoints, validation, business logic)             │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌─────────────┐ ┌────────────┐ ┌─────────────────┐
│   Runware   │ │ Firecrawl  │ │  SQLite DB      │
│   Service   │ │  Service   │ │  (10 tables)    │
│  (AI gen)   │ │ (scraping) │ │                 │
└─────────────┘ └────────────┘ └─────────────────┘
```

## 📊 Database Schema

### Core Tables (10)

1. **pages** - Facebook pages with SMV enhancements
2. **page_assets** - Websites, groups, ad accounts
3. **sources** - Tweets, articles, case studies
4. **insights** - Learnings from sources
5. **competitors** - Tracked competitor pages
6. **scraped_content** - Firecrawl/Firecrawl data
7. **generated_posts** - AI drafts with approval workflow
8. **schedules** - Posting times (EST)
9. **post_performance** - Feedback loop
10. **automation_limits** - Human-override rules

### SMV Enhancements

**Pages Table:**
- `owner_name`, `owner_entity`, `creation_date`
- `primary_niche` - 90s nostalgia, political, emotional
- `language`, `monetization_status`, `notes`

**Sources Table:**
- `summary`, `confidence_level`, `last_verified`

**Insights Table:**
- `applicable_niches` (JSON array)
- `automation_safe` BOOLEAN

**Scraped Content:**
- `competitor_id`, `age_hours`, `velocity_score`

**Schedules:**
- `generated_post_id`, `scheduled_time`, `timezone`, `auto_post`

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (upgradable to PostgreSQL)
- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript
- **AI Services:** runware.ai (multi-model support)
- **Scraping:** Firecrawl API
- **Deployment:** Fly.io (recommended) or Railway

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Clone and install:**
```bash
cd facebook-monetiser
npm install
```

2. **Environment variables:**
```bash
# Create .env file
RUNWARE_API_KEY=your_runware_key
FIRECRAWL_API_KEY=your_firecrawl_key
DATABASE_PATH=./data/facebook-monetiser.db
PORT=3000
```

3. **Initialize database:**
```bash
sqlite3 facebook-monetiser.db < backend/database/schema.sql
sqlite3 facebook-monetiser.db < backend/database/migrations/002_smv_enhancements.sql
```

4. **Run server:**
```bash
npm start
# Or with hot reload
npm run dev
```

5. **Access dashboard:**
```
http://localhost:3000/dashboard
http://localhost:3000/analytics
```

## 🚀 Deployment

### ⭐ Option 1: Fly.io (Recommended)

**Benefits:**
- ✅ Free forever ($0/month)
- ✅ Faster deployments (1-2 min)
- ✅ GitHub Actions integration
- ✅ Better control over CI/CD

**Quick Start (5 min):**
```bash
1. Read: FLY-QUICKSTART.md
2. Install: curl -L https://fly.io/install.sh | sh
3. Auth: flyctl auth login
4. Init: flyctl launch
5. Push: git push origin main (auto-deploys!)
```

**Full Documentation:**
- 📖 [FLY-QUICKSTART.md](./FLY-QUICKSTART.md) - Get started in 5 minutes
- 📖 [FLY-DEPLOYMENT-GUIDE.md](./FLY-DEPLOYMENT-GUIDE.md) - Complete guide
- 📖 [FLY-QUICK-REFERENCE.md](./FLY-QUICK-REFERENCE.md) - Daily commands
- 📖 [RAILWAY-VS-FLY.md](./RAILWAY-VS-FLY.md) - Platform comparison

**Features:**
- Auto-deploys on every push to `main` branch
- Persistent database storage (1GB volume)
- SSL/HTTPS included
- Health checks and monitoring
- Zero-downtime deployments
- Scale to 0 when unused (saves money)

### Option 2: Railway (Alternative)

**Still supported, but requires paid plan (~$6-20/month)**

1. **Fork and connect:**
```bash
# Connect your GitHub repo to Railway
# Railway will auto-detect Node.js app
```

2. **Set environment variables in Railway:**
```
RUNWARE_API_KEY=your_runware_key
FIRECRAWL_API_KEY=your_firecrawl_key
PORT=3000
NODE_ENV=production
```

3. **Add persistent disk:**
```
Settings → Volumes → Add Volume
Mount path: /data
```

4. **Update DATABASE_PATH:**
```bash
# In Railway environment variables
DATABASE_PATH=/data/facebook-monetiser.db
```

5. **Deploy:**
```bash
git push origin main
# Railway auto-deploys on push
```

## 📝 Usage

### Generate Content

1. **Navigate to "Create Post" tab**
2. **Select page and niche**
3. **Click "Generate Caption"** - AI creates niche-specific content
4. **Generate Comment** - Adds CTA and engagement hook
5. **Generate Image Prompt** - Creates visual concept
6. **Create Post** - Saves as draft (auto-approved)

### View Analytics

1. **Analytics page** - Overall performance metrics
2. **CTR predictions** - Click-through rate forecasting
3. **Niche performance** - Per-niche engagement data
4. **Velocity trends** - Trending content detection

### Competitor Research

1. **Add competitor** - Track competitor pages
2. **Scrape content** - Firecrawl extracts data
3. **Calculate velocity** - Analyze engagement velocity
4. **View trends** - Spot high-performing patterns

## 🔧 API Endpoints

### Content Generation
- `POST /api/content/caption` - Generate caption for niche
- `POST /api/content/comment` - Generate engagement comment
- `POST /api/content/image-prompt` - Generate image prompt
- `POST /api/content/analyze` - Analyze content (MVP: auto-approve)

### Pages (Enhanced)
- `GET /api/pages/:id/assets` - Get page assets
- `POST /api/pages/:id/monetization` - Update monetization
- `GET /api/pages/by-niche/:niche` - Filter by niche
- `GET /api/pages/:id/analytics` - Page analytics

### Sources (Enhanced)
- `POST /api/sources/verify` - Mark source verified
- `GET /api/sources/insights/:id` - Get source insights
- `POST /api/sources/insights/:id/effectiveness` - Update score

### Scraped Content
- `GET /api/scraped/competitor/:id` - Get competitor content
- `POST /api/scraped/velocity` - Calculate velocity scores
- `GET /api/scraped/velocity/high` - Get trending content

### Predictions (Enhanced)
- `GET /api/predictions/ctr/:postId` - CTR prediction
- `GET /api/predictions/performance/:postId` - Full prediction
- `GET /api/predictions/accuracy/metrics` - Model accuracy

## 📈 Content Performance

### Niche Benchmarks

| Niche | Avg CTR | Avg CVR | Avg CPA |
|-------|---------|---------|---------|
| 90s Nostalgia | 3.1% | 1.4% | $8.20 |
| Political | 2.4% | 1.0% | $9.50 |
| Emotional | 2.9% | 1.3% | $8.80 |

### Content Type Performance

| Type | CTR | CVR | CPA |
|------|-----|-----|-----|
| Reel | 3.5% | 1.6% | $6.80 |
| Carousel | 3.0% | 1.3% | $7.70 |
| Image | 2.5% | 1.2% | $8.50 |
| Story | 2.7% | 1.4% | $8.50 |
| Text | 2.0% | 0.9% | $10.20 |

## 🔄 MVP Workflow

```
1. User selects page + niche
2. AI generates caption (3 templates)
3. AI generates comment with CTA
4. AI generates image prompt
5. Content auto-approved (MVP)
6. Saved as draft
7. User copies/pastes to Facebook
8. (Phase 2) Auto-post to Facebook
```

## 📚 Documentation

- **[API Enhancements](./API_ENHANCEMENTS.md)** - New SMV endpoints
- **[Prediction Guide](./PREDICTION_GUIDE.md)** - How predictions work
- **[Setup Guide](./SETUP.md)** - Detailed setup instructions

## ⚠️ MVP Notes

### Current (Phase 1)
- ✅ Draft generation only
- ✅ Auto-approve all content
- ✅ Manual copy/paste to Facebook
- ✅ 3 primary niches
- ✅ runware.ai integration
- ✅ Firecrawl scraping

### Phase 2 (Future)
- ⏳ Facebook auto-posting
- ⏳ Risk scoring system
- ⏳ Advanced approval workflow
- ⏳ Scheduled posting automation
- ⏳ ML model integration

## 🐛 Troubleshooting

### Runware API Not Working
```bash
# Check API key
echo $RUNWARE_API_KEY

# Test health endpoint
curl https://api.runware.ai/v1/health
```

### Firecrawl Rate Limits
- Default: 1 request/second
- Respects API limits automatically
- Check usage: `/api/scraped/health`

### Database Locked
```bash
# Close all connections
# Or use WAL mode
sqlite3 facebook-monetiser.db "PRAGMA journal_mode=WAL;"
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📞 Support

For issues or questions:
- Check documentation
- Review API endpoints
- Test with mock mode (no API keys)

---

**Built with Patrick Savalle's L-GEVITY methodology** 🏗️
**Enhanced to SMV specification** ✅
**Focused on 3 high-performing niches** 🎯
