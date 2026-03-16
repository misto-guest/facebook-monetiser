const express = require('express');
const router = express.Router();

/**
 * Enhanced Sources API Endpoints (SMV Compliant)
 * - POST /api/sources/verify — Mark source as verified
 * - GET /api/sources/insights/:id — Get all insights for a source
 * - POST /api/insights/:id/effectiveness — Update effectiveness score
 */

// Mark source as verified
router.post('/verify', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Source ID is required' });
  }

  const sql = `
    UPDATE sources
    SET
      last_verified = date('now'),
      is_verified = 1
    WHERE id = ?
  `;

  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json({
      message: 'Source verified successfully',
      source_id: id,
      verified_date: new Date().toISOString().split('T')[0]
    });
  });
});

// Get all insights for a specific source
router.get('/insights/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { min_effectiveness = 0, automation_safe_only = false } = req.query;

  let sql = `
    SELECT
      i.*,
      s.title as source_title,
      s.source_type,
      s.author as source_author
    FROM insights i
    JOIN sources s ON i.source_id = s.id
    WHERE i.source_id = ?
      AND i.effectiveness_score >= ?
  `;

  const params = [id, parseFloat(min_effectiveness)];

  if (automation_safe_only === 'true') {
    sql += ' AND i.automation_safe = 1';
  }

  sql += ' ORDER BY i.effectiveness_score DESC, i.created_at DESC';

  db.all(sql, params, (err, insights) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse tags JSON for each insight
    insights.forEach(insight => {
      if (insight.tags) {
        try {
          insight.tags = JSON.parse(insight.tags);
        } catch (e) {
          insight.tags = [];
        }
      }
      if (insight.applicable_niches) {
        try {
          insight.applicable_niches = JSON.parse(insight.applicable_niches);
        } catch (e) {
          insight.applicable_niches = [];
        }
      }
    });

    res.json({
      source_id: parseInt(id),
      insights_count: insights.length,
      insights
    });
  });
});

// Update insight effectiveness score
router.post('/insights/:id/effectiveness', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { effectiveness_score, automation_safe } = req.body;

  if (effectiveness_score !== undefined) {
    if (effectiveness_score < 0 || effectiveness_score > 1) {
      return res.status(400).json({
        error: 'Effectiveness score must be between 0 and 1'
      });
    }
  }

  const sql = `
    UPDATE insights
    SET
      effectiveness_score = COALESCE(?, effectiveness_score),
      automation_safe = COALESCE(?, automation_safe)
    WHERE id = ?
  `;

  db.run(sql, [effectiveness_score, automation_safe, id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json({
      message: 'Insight updated successfully',
      insight_id: parseInt(id),
      effectiveness_score,
      automation_safe
    });
  });
});

// Get sources with verification status
router.get('/verification/status', (req, res) => {
  const db = req.app.locals.rawDb;
  const { status } = req.query;

  let sql = `
    SELECT
      s.*,
      COUNT(DISTINCT i.id) as insights_count,
      AVG(i.effectiveness_score) as avg_effectiveness_score,
      CASE
        WHEN s.last_verified >= date('now', '-7 days') THEN 'verified'
        WHEN s.last_verified >= date('now', '-30 days') THEN 'stale'
        ELSE 'unverified'
      END as verification_status
    FROM sources s
    LEFT JOIN insights i ON s.id = i.source_id
  `;

  const params = [];

  if (status) {
    if (status === 'verified') {
      sql += ' WHERE s.last_verified >= date(\'now\', \'-7 days\')';
    } else if (status === 'stale') {
      sql += ' WHERE s.last_verified >= date(\'now\', \'-30 days\') AND s.last_verified < date(\'now\', \'-7 days\')';
    } else if (status === 'unverified') {
      sql += ' WHERE s.last_verified IS NULL OR s.last_verified < date(\'now\', \'-30 days\')';
    }
  }

  sql += ' GROUP BY s.id ORDER BY s.created_at DESC';

  db.all(sql, params, (err, sources) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ sources });
  });
});

// Update source details (including new SMV fields)
router.put('/:id/details', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { summary, confidence_level, last_verified } = req.body;

  const validConfidenceLevels = ['low', 'medium', 'high'];
  if (confidence_level && !validConfidenceLevels.includes(confidence_level)) {
    return res.status(400).json({
      error: 'Invalid confidence level',
      valid_levels: validConfidenceLevels
    });
  }

  const sql = `
    UPDATE sources
    SET
      summary = COALESCE(?, summary),
      confidence_level = COALESCE(?, confidence_level),
      last_verified = COALESCE(?, last_verified)
    WHERE id = ?
  `;

  db.run(sql, [summary, confidence_level, last_verified, id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json({
      message: 'Source details updated successfully',
      source_id: parseInt(id)
    });
  });
});

// Get insights by niche
router.get('/insights/niche/:niche', (req, res) => {
  const db = req.app.locals.rawDb;
  const { niche } = req.params;
  const { min_effectiveness = 0.5, limit = 20 } = req.query;

  const sql = `
    SELECT
      i.*,
      s.title as source_title,
      s.source_type,
      s.author as source_author
    FROM insights i
    JOIN sources s ON i.source_id = s.id
    WHERE i.effectiveness_score >= ?
      AND (i.applicable_niches LIKE ? OR i.applicable_niches IS NULL)
    ORDER BY i.effectiveness_score DESC
    LIMIT ?
  `;

  const nichePattern = `%"${niche}"%`;

  db.all(sql, [parseFloat(min_effectiveness), nichePattern, parseInt(limit)], (err, insights) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse JSON fields
    insights.forEach(insight => {
      try {
        insight.tags = insight.tags ? JSON.parse(insight.tags) : [];
        insight.applicable_niches = insight.applicable_niches ? JSON.parse(insight.applicable_niches) : [];
      } catch (e) {
        insight.tags = [];
        insight.applicable_niches = [];
      }
    });

    res.json({
      niche,
      insights_count: insights.length,
      insights
    });
  });
});

// Get top-performing insights across all sources
router.get('/insights/top', (req, res) => {
  const db = req.app.locals.rawDb;
  const { limit = 20, min_score = 0.6, category } = req.query;

  let sql = `
    SELECT
      i.*,
      s.title as source_title,
      s.source_type,
      s.confidence_level as source_confidence
    FROM insights i
    JOIN sources s ON i.source_id = s.id
    WHERE i.effectiveness_score >= ?
  `;

  const params = [parseFloat(min_score)];

  if (category) {
    sql += ' AND i.category = ?';
    params.push(category);
  }

  sql += `
    ORDER BY i.effectiveness_score DESC, i.created_at DESC
    LIMIT ?
  `;

  params.push(parseInt(limit));

  db.all(sql, params, (err, insights) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse JSON fields
    insights.forEach(insight => {
      try {
        insight.tags = insight.tags ? JSON.parse(insight.tags) : [];
        insight.applicable_niches = insight.applicable_niches ? JSON.parse(insight.applicable_niches) : [];
      } catch (e) {
        insight.tags = [];
        insight.applicable_niches = [];
      }
    });

    res.json({ insights });
  });
});

module.exports = router;
