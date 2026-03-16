const express = require('express');
const router = express.Router();

/**
 * Enhanced Pages API Endpoints (SMV Compliant)
 * - GET /api/pages/:id/assets — Get all assets for a page
 * - POST /api/pages/:id/monetization — Update monetization status
 * - GET /api/pages/by-niche/:niche — Filter pages by niche
 */

// Get all assets for a specific page
router.get('/:id/assets', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  const sql = `
    SELECT
      pa.*,
      p.name as page_name
    FROM page_assets pa
    JOIN pages p ON pa.page_id = p.id
    WHERE pa.page_id = ?
    ORDER BY pa.asset_type, pa.created_at DESC
  `;

  db.all(sql, [id], (err, assets) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse metadata JSON for each asset
    assets.forEach(asset => {
      if (asset.metadata) {
        try {
          asset.metadata = JSON.parse(asset.metadata);
        } catch (e) {
          asset.metadata = {};
        }
      }
    });

    res.json({
      page_id: id,
      assets_count: assets.length,
      assets
    });
  });
});

// Update monetization status for a page
router.post('/:id/monetization', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { monetization_status, notes } = req.body;

  const validStatuses = ['approved', 'pending', 'restricted'];
  if (!monetization_status || !validStatuses.includes(monetization_status)) {
    return res.status(400).json({
      error: 'Invalid monetization status',
      valid_statuses: validStatuses
    });
  }

  const sql = `
    UPDATE pages
    SET
      monetization_status = ?,
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [monetization_status, notes, id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({
      message: 'Monetization status updated successfully',
      page_id: parseInt(id),
      monetization_status,
      updated_at: new Date().toISOString()
    });
  });
});

// Get pages by niche
router.get('/by-niche/:niche', (req, res) => {
  const db = req.app.locals.rawDb;
  const { niche } = req.params;
  const { limit = 50, include_restricted = false } = req.query;

  let sql = `
    SELECT
      p.*,
      COUNT(DISTINCT pa.id) as assets_count,
      COUNT(DISTINCT gp.id) as posts_count,
      COUNT(DISTINCT CASE WHEN gp.approval_status = 'posted' THEN gp.id END) as posted_count
    FROM pages p
    LEFT JOIN page_assets pa ON p.id = pa.page_id
    LEFT JOIN generated_posts gp ON p.id = gp.page_id
    WHERE p.primary_niche = ?
      AND p.is_active = 1
  `;

  const params = [niche];

  if (include_restricted !== 'true') {
    sql += ' AND (p.monetization_status IS NULL OR p.monetization_status != "restricted")';
  }

  sql += `
    GROUP BY p.id
    ORDER BY p.followers_count DESC
    LIMIT ?
  `;

  params.push(parseInt(limit));

  db.all(sql, params, (err, pages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      niche,
      pages_count: pages.length,
      pages
    });
  });
});

// Get pages with monetization status
router.get('/monetization/status', (req, res) => {
  const db = req.app.locals.rawDb;
  const { status } = req.query;

  let sql = `
    SELECT
      p.*,
      COUNT(DISTINCT pa.id) as assets_count,
      COUNT(DISTINCT gp.id) as posts_count
    FROM pages p
    LEFT JOIN page_assets pa ON p.id = pa.page_id
    LEFT JOIN generated_posts gp ON p.id = gp.page_id
    WHERE p.is_active = 1
  `;

  const params = [];

  if (status) {
    sql += ' AND p.monetization_status = ?';
    params.push(status);
  }

  sql += `
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  db.all(sql, params, (err, pages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ pages });
  });
});

// Update page details (including new SMV fields)
router.put('/:id/details', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const {
    owner_name,
    owner_entity,
    creation_date,
    primary_niche,
    language,
    notes
  } = req.body;

  const sql = `
    UPDATE pages
    SET
      owner_name = COALESCE(?, owner_name),
      owner_entity = COALESCE(?, owner_entity),
      creation_date = COALESCE(?, creation_date),
      primary_niche = COALESCE(?, primary_niche),
      language = COALESCE(?, language),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    sql,
    [owner_name, owner_entity, creation_date, primary_niche, language, notes, id],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json({
        message: 'Page details updated successfully',
        page_id: parseInt(id)
      });
    }
  );
});

// Get page analytics summary
router.get('/:id/analytics', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  const sql = `
    SELECT
      p.*,
      COUNT(DISTINCT pa.id) as assets_count,
      COUNT(DISTINCT gp.id) as total_posts,
      COUNT(DISTINCT CASE WHEN gp.approval_status = 'posted' THEN gp.id END) as posted_posts,
      COUNT(DISTINCT CASE WHEN gp.approval_status = 'pending' THEN gp.id END) as pending_posts,
      COUNT(DISTINCT CASE WHEN gp.approval_status = 'scheduled' THEN gp.id END) as scheduled_posts,
      AVG(pp.engagement_rate) as avg_engagement_rate,
      SUM(pp.reach) as total_reach,
      SUM(pp.impressions) as total_impressions
    FROM pages p
    LEFT JOIN page_assets pa ON p.id = pa.page_id
    LEFT JOIN generated_posts gp ON p.id = gp.page_id
    LEFT JOIN post_performance pp ON gp.id = pp.post_id
    WHERE p.id = ?
    GROUP BY p.id
  `;

  db.get(sql, [id], (err, analytics) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!analytics) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ analytics });
  });
});

module.exports = router;
