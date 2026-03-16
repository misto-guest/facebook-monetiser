/**
 * Database Reset API - For development only
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * Add new columns to pages table
 */
router.post('/add-page-columns', (req, res) => {
  const db = req.app.locals.rawDb;
  
  const migrations = [
    'ALTER TABLE pages ADD COLUMN is_own INTEGER DEFAULT 0',
    'ALTER TABLE pages ADD COLUMN auto_scrape INTEGER DEFAULT 0',
    'ALTER TABLE pages ADD COLUMN last_scraped_at TIMESTAMP'
  ];
  
  let completed = 0;
  const errors = [];
  
  migrations.forEach(sql => {
    db.run(sql, function(err) {
      completed++;
      if (err && !err.message.includes('duplicate column')) {
        errors.push(err.message);
      }
      if (completed === migrations.length) {
        if (errors.length > 0) {
          res.json({ success: true, message: 'Migration attempted', errors });
        } else {
          res.json({ success: true, message: 'Columns added successfully' });
        }
      }
    });
  });
});

/**
 * Full database reset - WARNING: Deletes entire database
 */
router.post('/reset-sources', (req, res) => {
  const db = req.app.locals.rawDb;
  
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing db:', err);
    }
    
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/facebook-monetiser.db');
    
    // Delete the database file
    fs.unlink(dbPath, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Delete db file: ' + err.message });
      }
      
      res.json({ 
        success: true, 
        message: 'Database deleted. Please restart the app to recreate it with proper schema.',
        db_path: dbPath
      });
    });
  });
});

module.exports = router;
