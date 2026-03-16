/**
 * Database Schema API - Simple schema initialization
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize sources table
 */
router.post('/init-sources', (req, res) => {
  const db = req.app.locals.rawDb;
  
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  // Create sources table
  const sql = `
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL CHECK(source_type IN ('tweet', 'article', 'case_study', 'video', 'competitor_post', 'facebook_group_post')),
      title TEXT,
      url TEXT UNIQUE,
      author TEXT,
      platform TEXT,
      published_date TIMESTAMP,
      content_text TEXT,
      raw_data TEXT,
      is_verified BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(sql, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Create sources: ' + err.message });
    }
    
    // Create index
    db.run('CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type)', function(err) {
      if (err) {
        return res.status(500).json({ error: 'Index: ' + err.message });
      }
      
      res.json({ success: true, message: 'Sources table created' });
    });
  });
});

module.exports = router;
