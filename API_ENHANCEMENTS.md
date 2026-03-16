# API Enhancements Documentation

SMV specification compliant API enhancements for Facebook Monetiser.

## Overview

The enhanced API adds 15+ new endpoints focused on:
- Page monetization tracking
- Source verification
- Insight effectiveness scoring
- Competitor scraping analysis
- Advanced predictions
- Velocity scoring

## New Endpoints

### Pages Enhanced (`/api/pages`)

#### `GET /api/pages/:id/assets`
Get all assets for a specific page.

**Response:**
```json
{
  "page_id": 1,
  "assets_count": 5,
  "assets": [
    {
      "id": 1,
      "asset_type": "website",
      "asset_url": "https://example.com",
      "name": "Example Website",
      "is_verified": true
    }
  ]
}
```

#### `POST /api/pages/:id/monetization`
Update monetization status for a page.

**Request:**
```json
{
  "monetization_status": "approved",
  "notes": "Review completed"
}
```

**Valid statuses:** `approved`, `pending`, `restricted`

#### `GET /api/pages/by-niche/:niche`
Filter pages by primary niche.

**Query params:**
- `limit`: Number of results (default: 50)
- `include_restricted`: Include restricted pages (default: false)

**Response:**
```json
{
  "niche": "fitness",
  "pages_count": 10,
  "pages": [...]
}
```

#### `GET /api/pages/monetization/status`
Get pages with monetization status filter.

**Query params:**
- `status`: Filter by status (`approved`, `pending`, `restricted`)

#### `PUT /api/pages/:id/details`
Update page details (SMV fields).

**Request:**
```json
{
  "owner_name": "John Doe",
  "owner_entity": "Acme Corp",
  "creation_date": "2023-01-15",
  "primary_niche": "fitness",
  "language": "en",
  "notes": "Primary fitness page"
}
```

#### `GET /api/pages/:id/analytics`
Get page analytics summary.

**Response:**
```json
{
  "analytics": {
    "total_posts": 50,
    "posted_posts": 35,
    "pending_posts": 10,
    "scheduled_posts": 5,
    "avg_engagement_rate": 0.035,
    "total_reach": 50000
  }
}
```

### Sources Enhanced (`/api/sources`)

#### `POST /api/sources/verify`
Mark a source as verified.

**Request:**
```json
{
  "id": 5
}
```

#### `GET /api/sources/insights/:id`
Get all insights for a specific source.

**Query params:**
- `min_effectiveness`: Minimum effectiveness score (default: 0)
- `automation_safe_only`: Only show automation-safe insights (default: false)

#### `POST /api/sources/insights/:id/effectiveness`
Update insight effectiveness score.

**Request:**
```json
{
  "effectiveness_score": 0.85,
  "automation_safe": true
}
```

#### `GET /api/sources/verification/status`
Get sources with verification status.

**Query params:**
- `status`: Filter by status (`verified`, `stale`, `unverified`)

#### `PUT /api/sources/:id/details`
Update source details (SMV fields).

**Request:**
```json
{
  "summary": "Key insights about engagement patterns",
  "confidence_level": "high",
  "last_verified": "2024-01-15"
}
```

#### `GET /api/sources/insights/niche/:niche`
Get insights for a specific niche.

**Response:**
```json
{
  "niche": "fitness",
  "insights_count": 15,
  "insights": [...]
}
```

#### `GET /api/sources/insights/top`
Get top-performing insights across all sources.

**Query params:**
- `limit`: Number of results (default: 20)
- `min_score`: Minimum effectiveness score (default: 0.6)
- `category`: Filter by category

### Scraped Content (`/api/scraped`)

#### `GET /api/scraped/competitor/:id`
Get scraped content by competitor.

**Query params:**
- `limit`: Number of results (default: 50)
- `min_velocity`: Minimum velocity score (default: 0)

#### `POST /api/scraped/velocity`
Calculate velocity scores for scraped content.

**Request:**
```json
{
  "content_ids": [1, 2, 3],
  "recalculate_all": false
}
```

#### `GET /api/scraped/velocity/high`
Get high-velocity content.

**Query params:**
- `threshold`: Minimum velocity score (default: 0.7)
- `limit`: Number of results (default: 20)
- `source_type`: Filter by source type

#### `GET /api/scraped/velocity/trends/:competitorId`
Get velocity trends for a competitor.

**Query params:**
- `days`: Number of days to analyze (default: 30)

#### `GET /api/scraped/velocity/compare`
Compare velocity between competitors.

**Query params:**
- `competitor_ids`: Comma-separated competitor IDs

### Predictions Enhanced (`/api/predictions`)

#### `GET /api/predictions/ctr/:postId`
Get CTR prediction for a specific post.

**Response:**
```json
{
  "post_id": 1,
  "predicted_ctr": 0.028,
  "confidence_score": 0.75,
  "baseline_ctr": 0.025,
  "historical_data": {
    "avg_ctr": 0.026,
    "sample_size": 20
  },
  "factors": {
    "content_type": "image",
    "niche": "fitness",
    "originality_score": 0.8,
    "risk_score": 0.2
  }
}
```

#### `GET /api/predictions/performance/:postId`
Get full performance prediction.

**Query params:**
- `include_historical`: Include historical data in response (default: false)

**Response:**
```json
{
  "post_id": 1,
  "page": {
    "id": 1,
    "name": "Fitness Page",
    "primary_niche": "fitness",
    "followers_count": 50000
  },
  "prediction": {
    "predicted_ctr": 0.028,
    "predicted_cvr": 0.014,
    "predicted_cpa": 7.50,
    "confidence_score": 0.75,
    "predicted_metrics": {
      "estimated_reach": 7500,
      "estimated_impressions": 11250,
      "estimated_engagement": 262,
      "estimated_clicks": 210,
      "estimated_conversions": 3
    }
  }
}
```

#### `POST /api/predictions/batch`
Get predictions for multiple posts.

**Request:**
```json
{
  "post_ids": [1, 2, 3, 4, 5]
}
```

#### `GET /api/predictions/accuracy/metrics`
Get prediction accuracy metrics.

**Response:**
```json
{
  "metrics": {
    "total_predictions": 100,
    "avg_confidence": 0.72,
    "predictions_with_actuals": 45,
    "avg_ctr_error": 0.008,
    "estimated_accuracy_pct": 84.0
  }
}
```

#### `GET /api/predictions/comparisons`
Get prediction vs actual comparisons.

**Query params:**
- `limit`: Number of results (default: 20)

## Database Schema Changes

### Pages Table
- `owner_name TEXT` - Page owner name
- `owner_entity TEXT` - Owning entity
- `creation_date DATE` - Page creation date
- `primary_niche TEXT` - Primary niche focus
- `language TEXT` - Page language (default: 'en')
- `monetization_status TEXT` - Monetization status
- `notes TEXT` - Additional notes

### Sources Table
- `summary TEXT` - Source summary
- `confidence_level TEXT` - Confidence level (low/medium/high)
- `last_verified DATE` - Last verification date

### Insights Table
- `applicable_niches TEXT` - JSON array of applicable niches
- `automation_safe BOOLEAN` - Safe for automation (default: true)

### Scraped Content Table
- `competitor_id INTEGER` - Linked competitor
- `age_hours FLOAT` - Content age in hours
- `velocity_score FLOAT` - Calculated velocity score

### Schedules Table
- `generated_post_id INTEGER` - Linked post
- `scheduled_time TIMESTAMP` - Scheduled time
- `timezone TEXT` - Timezone (default: 'EST')
- `auto_post BOOLEAN` - Auto-post enabled (default: true)

## New Database Views

### `v_pages_monetization`
Pages with monetization status and metrics.

### `v_sources_verification`
Sources with verification status.

### `v_high_velocity_content`
High-velocity scraped content with categorization.

## Usage Examples

### Track Page Monetization
```javascript
// Update monetization status
await fetch('/api/pages/1/monetization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    monetization_status: 'approved',
    notes: 'All requirements met'
  })
});

// Get pages by niche
const res = await fetch('/api/pages/by-niche/fitness?limit=10');
const data = await res.json();
```

### Source Management
```javascript
// Verify source
await fetch('/api/sources/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 5 })
});

// Get high-effectiveness insights
const res = await fetch('/api/sources/insights/5?min_effectiveness=0.7');
```

### Velocity Analysis
```javascript
// Calculate velocity scores
await fetch('/api/scraped/velocity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content_ids: [1, 2, 3] })
});

// Get trending content
const res = await fetch('/api/scraped/velocity/high?threshold=0.8');
```

### Predictions
```javascript
// Get CTR prediction
const res = await fetch('/api/predictions/ctr/1');
const data = await res.json();
console.log('Predicted CTR:', data.predicted_ctr);

// Get full performance prediction
const res2 = await fetch('/api/predictions/performance/1?include_historical=true');
```

## Migration

Run the migration to apply schema changes:

```bash
sqlite3 facebook-monetiser.db < backend/database/migrations/002_smv_enhancements.sql
```

## Notes

- All timestamps in ISO 8601 format
- All scores (risk, originality, effectiveness, velocity) are 0-1 range
- Velocity scores: >0.7 = trending, 0.4-0.7 = moderate, <0.4 = low
- Confidence levels: low/medium/high for sources
- Monetization statuses: approved/pending/restricted for pages
