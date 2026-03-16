const express = require('express');
const router = express.Router();

// ============================================
// BASE PAGES ROUTES
// ============================================

// Get all pages
router.get('/', (req, res) => {
  const db = req.app.locals.rawDb;
  const sql = `
    SELECT p.*, 
           COUNT(DISTINCT pa.id) as assets_count,
           COUNT(DISTINCT gp.id) as posts_count
    FROM pages p
    LEFT JOIN page_assets pa ON p.id = pa.page_id
    LEFT JOIN generated_posts gp ON p.id = gp.page_id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ pages: rows });
  });
});

// Get single page with details
router.get('/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  db.get('SELECT * FROM pages WHERE id = ?', [id], (err, page) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Get assets
    db.all('SELECT * FROM page_assets WHERE page_id = ?', [id], (err, assets) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      page.assets = assets;

      // Get recent posts
      db.all(
        'SELECT * FROM generated_posts WHERE page_id = ? ORDER BY created_at DESC LIMIT 10',
        [id],
        (err, posts) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          page.recent_posts = posts;
          res.json({ page });
        }
      );
    });
  });
});

// Create new page
router.post('/', (req, res) => {
  const db = req.app.locals.rawDb;
  const { name, page_id, category, about, followers_count, country } = req.body;

  // Enforce US-only
  if (country && country !== 'US') {
    return res.status(400).json({
      error: 'Non-US pages are not supported',
      details: 'This tool is designed for US-based Facebook pages only'
    });
  }

  const sql = `
    INSERT INTO pages (name, page_id, category, about, followers_count, country)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, 'US'))
  `;
  const params = [name, page_id, category, about, followers_count || 0, country || 'US'];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Page created successfully',
      page_id: this.lastID,
      id: this.lastID
    });
  });
});

// Update page
router.put('/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { name, category, about, followers_count, country, is_active, is_own, auto_scrape } = req.body;

  // Enforce US-only
  if (country && country !== 'US') {
    return res.status(400).json({
      error: 'Non-US pages are not supported'
    });
  }

  const sql = `
    UPDATE pages
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        about = COALESCE(?, about),
        followers_count = COALESCE(?, followers_count),
        is_active = COALESCE(?, is_active),
        is_own = COALESCE(?, is_own),
        auto_scrape = COALESCE(?, auto_scrape),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const params = [name, category, about, followers_count, is_active, is_own, auto_scrape, id];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ message: 'Page updated successfully', changes: this.changes });
  });
});

// Delete page (soft delete)
router.delete('/:id', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  db.run('UPDATE pages SET is_active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ message: 'Page deactivated successfully' });
  });
});

// Add asset to page
router.post('/:id/assets', (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { asset_type, asset_url, asset_id, name } = req.body;

  const validTypes = ['website', 'group', 'ad_account', 'instagram'];
  if (!validTypes.includes(asset_type)) {
    return res.status(400).json({ error: 'Invalid asset type' });
  }

  const sql = `
    INSERT INTO page_assets (page_id, asset_type, asset_url, asset_id, name)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [id, asset_type, asset_url, asset_id, name];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Asset added successfully',
      asset_id: this.lastID
    });
  });
});

// Delete asset
router.delete('/:pageId/assets/:assetId', (req, res) => {
  const db = req.app.locals.rawDb;
  const { pageId, assetId } = req.params;

  db.run('DELETE FROM page_assets WHERE id = ? AND page_id = ?', [assetId, pageId], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ message: 'Asset deleted successfully' });
  });
});

// ============================================
// ENHANCED PAGES ROUTES (SMV Compliant)
// ============================================

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
