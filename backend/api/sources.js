const express = require('express');
const router = express.Router();

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

module.exports = router;
