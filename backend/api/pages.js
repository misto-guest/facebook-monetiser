const express = require('express');
const router = express.Router();

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

module.exports = router;
