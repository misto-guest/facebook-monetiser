const express = require('express');
const router = express.Router();
const velocityScoringService = require('../services/velocity-scoring');

/**
 * Scraped Content API Endpoints (SMV Compliant)
 * - GET /api/scraped/competitor/:id — Get scraped content by competitor
 * - POST /api/scraped/velocity — Calculate velocity scores
 */

// Get scraped content by competitor
router.get('/competitor/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { limit = 50, min_velocity = 0 } = req.query;

  const sql = `
    SELECT
      sc.*,
      c.name as competitor_name,
      c.category as competitor_category
    FROM scraped_content sc
    LEFT JOIN competitors c ON sc.competitor_id = c.id
    WHERE sc.competitor_id = ?
      AND (sc.velocity_score >= ? OR sc.velocity_score IS NULL)
    ORDER BY sc.scraped_at DESC
    LIMIT ?
  `;

  db.all(sql, [id, parseFloat(min_velocity), parseInt(limit)], (err, content) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse media_urls JSON
    content.forEach(item => {
      if (item.media_urls) {
        try {
          item.media_urls = JSON.parse(item.media_urls);
        } catch (e) {
          item.media_urls = [];
        }
      }
      if (item.raw_data) {
        try {
          item.raw_data = JSON.parse(item.raw_data);
        } catch (e) {
          item.raw_data = {};
        }
      }
    });

    res.json({
      competitor_id: parseInt(id),
      content_count: content.length,
      content
    });
  });
});

// Calculate velocity scores for scraped content
router.post('/velocity', async (req, res) => {
  const db = req.app.locals.rawDb;
  const { content_ids, recalculate_all = false } = req.body;

  try {
    let sql;
    let params;

    if (recalculate_all === true) {
      // Recalculate velocity for all scraped content
      sql = `
        SELECT
          sc.id,
          sc.engagement_likes,
          sc.engagement_shares,
          sc.engagement_comments,
          sc.scraped_at,
          c.followers_count
        FROM scraped_content sc
        LEFT JOIN competitors c ON sc.competitor_id = c.id
      `;
      params = [];
    } else if (content_ids && Array.isArray(content_ids)) {
      // Calculate velocity for specific content items
      const placeholders = content_ids.map(() => '?').join(',');
      sql = `
        SELECT
          sc.id,
          sc.engagement_likes,
          sc.engagement_shares,
          sc.engagement_comments,
          sc.scraped_at,
          c.followers_count
        FROM scraped_content sc
        LEFT JOIN competitors c ON sc.competitor_id = c.id
        WHERE sc.id IN (${placeholders})
      `;
      params = content_ids;
    } else {
      return res.status(400).json({
        error: 'Must provide either content_ids array or set recalculate_all to true'
      });
    }

    db.all(sql, params, async (err, content) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (content.length === 0) {
        return res.json({
          message: 'No content found to process',
          processed: 0,
          updated: 0
        });
      }

      // Calculate velocity scores
      let updatedCount = 0;

      for (const item of content) {
        const scrapedDate = new Date(item.scraped_at);
        const now = new Date();
        const ageHours = (now - scrapedDate) / (1000 * 60 * 60);

        const contentData = {
          likes: item.engagement_likes || 0,
          comments: item.engagement_comments || 0,
          shares: item.engagement_shares || 0,
          saves: 0, // Not tracked in scraped_content
          age_hours: ageHours,
          followers: item.followers_count || 10000
        };

        const velocityScore = velocityScoringService.calculateVelocityScore(contentData);

        // Update database
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE scraped_content SET velocity_score = ?, age_hours = ? WHERE id = ?',
            [velocityScore, ageHours, item.id],
            (err) => {
              if (err) reject(err);
              else {
                updatedCount++;
                resolve();
              }
            }
          );
        });
      }

      res.json({
        message: 'Velocity scores calculated successfully',
        processed: content.length,
        updated: updatedCount
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get high-velocity content
router.get('/velocity/high', (req, res) => {
  const db = req.app.locals.rawDb;
  const { threshold = 0.7, limit = 20, source_type } = req.query;

  let sql = `
    SELECT
      sc.*,
      c.name as competitor_name,
      CASE
        WHEN sc.velocity_score > 0.7 THEN 'trending'
        WHEN sc.velocity_score > 0.4 THEN 'moderate'
        ELSE 'low'
      END as velocity_category
    FROM scraped_content sc
    LEFT JOIN competitors c ON sc.competitor_id = c.id
    WHERE sc.velocity_score >= ?
  `;

  const params = [parseFloat(threshold)];

  if (source_type) {
    sql += ' AND sc.source_type = ?';
    params.push(source_type);
  }

  sql += ' ORDER BY sc.velocity_score DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(sql, params, (err, content) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      threshold,
      content_count: content.length,
      content
    });
  });
});

// Get velocity trends by competitor
router.get('/velocity/trends/:competitorId', (req, res) => {
  const db = req.app.locals.rawDb;
  const { competitorId } = req.params;
  const { days = 30 } = req.query;

  const sql = `
    SELECT
      DATE(sc.scraped_at) as date,
      AVG(sc.velocity_score) as avg_velocity,
      COUNT(*) as content_count,
      SUM(CASE WHEN sc.velocity_score > 0.7 THEN 1 ELSE 0 END) as trending_count
    FROM scraped_content sc
    WHERE sc.competitor_id = ?
      AND sc.scraped_at >= date('now', '-' || ? || ' days')
      AND sc.velocity_score IS NOT NULL
    GROUP BY DATE(sc.scraped_at)
    ORDER BY date DESC
  `;

  db.all(sql, [competitorId, parseInt(days)], (err, trends) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate overall trend
    const avgVelocity = trends.reduce((sum, t) => sum + (t.avg_velocity || 0), 0) / trends.length;

    let trendDirection = 'stable';
    if (trends.length >= 2) {
      const recent = trends.slice(0, Math.ceil(trends.length / 2));
      const older = trends.slice(Math.ceil(trends.length / 2));

      const recentAvg = recent.reduce((sum, t) => sum + (t.avg_velocity || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, t) => sum + (t.avg_velocity || 0), 0) / older.length;

      if (recentAvg > olderAvg * 1.1) {
        trendDirection = 'improving';
      } else if (recentAvg < olderAvg * 0.9) {
        trendDirection = 'declining';
      }
    }

    res.json({
      competitor_id: parseInt(competitorId),
      days: parseInt(days),
      overall_avg_velocity: avgVelocity,
      trend_direction: trendDirection,
      trends
    });
  });
});

// Compare velocity between competitors
router.get('/velocity/compare', (req, res) => {
  const db = req.app.locals.rawDb;
  const { competitor_ids } = req.query;

  if (!competitor_ids) {
    return res.status(400).json({ error: 'competitor_ids parameter is required' });
  }

  const ids = competitor_ids.split(',').map(id => parseInt(id));

  const placeholders = ids.map(() => '?').join(',');
  const sql = `
    SELECT
      sc.competitor_id,
      c.name as competitor_name,
      AVG(sc.velocity_score) as avg_velocity,
      COUNT(*) as content_count,
      SUM(CASE WHEN sc.velocity_score > 0.7 THEN 1 ELSE 0 END) as trending_count,
      MAX(sc.velocity_score) as max_velocity,
      MIN(sc.velocity_score) as min_velocity
    FROM scraped_content sc
    LEFT JOIN competitors c ON sc.competitor_id = c.id
    WHERE sc.competitor_id IN (${placeholders})
      AND sc.velocity_score IS NOT NULL
    GROUP BY sc.competitor_id
    ORDER BY avg_velocity DESC
  `;

  db.all(sql, ids, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      comparison: results,
      best_performer: results.length > 0 ? results[0] : null
    });
  });
});

module.exports = router;
