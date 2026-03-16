const express = require('express');
const router = express.Router();

// ============================================
// BASE SOURCES ROUTES
// ============================================

// Get all sources with filtering
router.get('/', (req, res) => {
  const db = req.app.locals.rawDb;
  const { type, search, limit = 50 } = req.query;

  let sql = 'SELECT * FROM sources';
  const params = [];
  const conditions = [];

  if (type) {
    conditions.push('source_type = ?');
    params.push(type);
  }

  if (search) {
    conditions.push('(title LIKE ? OR content_text LIKE ? OR author LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ sources: rows, count: rows.length });
  });
});

// Get single source with insights
router.get('/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  db.get('SELECT * FROM sources WHERE id = ?', [id], (err, source) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Get insights for this source
    db.all(
      'SELECT * FROM insights WHERE source_id = ? ORDER BY effectiveness_score DESC',
      [id],
      (err, insights) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        source.insights = insights;
        res.json({ source });
      }
    );
  });
});

// Create new source
router.post('/', (req, res) => {
  const db = req.app.locals.rawDb;
  const { source_type, title, url, author, platform, published_date, content_text, raw_data } = req.body;

  const validTypes = ['tweet', 'article', 'case_study', 'video', 'competitor_post', 'facebook_group_post'];
  if (!validTypes.includes(source_type)) {
    return res.status(400).json({ error: 'Invalid source type' });
  }

  const sql = `
    INSERT INTO sources (source_type, title, url, author, platform, published_date, content_text, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    source_type,
    title,
    url,
    author,
    platform,
    published_date || null,
    content_text,
    raw_data ? JSON.stringify(raw_data) : null
  ];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Source created successfully',
      source_id: this.lastID,
      id: this.lastID
    });
  });
});

// Add Facebook group post from URL
router.post('/facebook-group', (req, res) => {
  const db = req.app.locals.rawDb;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Parse Facebook group URL
  // Format: https://www.facebook.com/groups/{group_id}/posts/{post_id}/
  const fbGroupRegex = /facebook\.com\/groups\/(\d+)\/posts\/(\d+)/;
  const match = url.match(fbGroupRegex);

  if (!match) {
    return res.status(400).json({ 
      error: 'Invalid Facebook group post URL',
      expected_format: 'https://www.facebook.com/groups/{group_id}/posts/{post_id}/'
    });
  }

  const groupId = match[1];
  const postId = match[2];

  // Check if already exists
  db.get('SELECT * FROM sources WHERE url = ?', [url], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (existing) {
      return res.status(409).json({ 
        error: 'Source already exists',
        source_id: existing.id
      });
    }

    // Extract group name from URL (we'll need to scrape this later)
    const sql = `
      INSERT INTO sources (source_type, title, url, author, platform, content_text, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      'facebook_group_post',
      `Facebook Group Post #${postId}`,
      url,
      `Group ${groupId}`,
      'facebook',
      null, // content_text - would need to scrape
      JSON.stringify({ group_id: groupId, post_id: postId })
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Facebook group post added successfully',
        source_id: this.lastID,
        id: this.lastID,
        group_id: groupId,
        post_id: postId
      });
    });
  });
});

// Add insight to source
router.post('/:id/insights', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { insight_text, category, effectiveness_score, tags } = req.body;

  const sql = `
    INSERT INTO insights (source_id, insight_text, category, effectiveness_score, tags)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [
    id,
    insight_text,
    category,
    effectiveness_score || 0.5,
    tags ? JSON.stringify(tags) : null
  ];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Insight added successfully',
      insight_id: this.lastID
    });
  });
});

// Update insight
router.put('/insights/:insightId', (req, res) => {
  const db = req.app.locals.rawDb;
  const { insightId } = req.params;
  const { insight_text, category, effectiveness_score, tags } = req.body;

  const sql = `
    UPDATE insights
    SET insight_text = COALESCE(?, insight_text),
        category = COALESCE(?, category),
        effectiveness_score = COALESCE(?, effectiveness_score),
        tags = COALESCE(?, tags)
    WHERE id = ?
  `;
  const params = [
    insight_text,
    category,
    effectiveness_score,
    tags ? JSON.stringify(tags) : null,
    insightId
  ];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Insight not found' });
    }
    res.json({ message: 'Insight updated successfully' });
  });
});

// Delete source
router.delete('/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  db.run('DELETE FROM sources WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }
    // Insights will be cascade deleted
    res.json({ message: 'Source deleted successfully' });
  });
});

// Get top insights across all sources
router.get('/insights/top', (req, res) => {
  const db = req.app.locals.rawDb;
  const { limit = 20, min_score = 0.6 } = req.query;

  const sql = `
    SELECT i.*, s.title as source_title, s.source_type
    FROM insights i
    JOIN sources s ON i.source_id = s.id
    WHERE i.effectiveness_score >= ?
    ORDER BY i.effectiveness_score DESC, i.created_at DESC
    LIMIT ?
  `;

  db.all(sql, [parseFloat(min_score), parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ insights: rows });
  });
});

// ============================================
// ENHANCED SOURCES ROUTES (SMV Compliant)
// ============================================

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

// Get top-performing insights across all sources (enhanced version with category filter)
router.get('/insights/top-enhanced', (req, res) => {
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
