/**
 * Publishing API
 * Endpoints for publishing and scheduling posts
 */

const router = require('express').Router();
const facebookPublisher = require('../services/facebook-publisher');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/facebook-monetiser.db');

/**
 * Publish post immediately
 */
router.post('/publish', async (req, res) => {
  const { pageId, contentType, caption, imageUrl, firstComment } = req.body;

  if (!pageId || !contentType || !caption) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: pageId, contentType, caption'
    });
  }

  try {
    // Get page info
    const db = new Database(DB_PATH);
    const page = db.prepare('SELECT * FROM facebook_pages WHERE id = ?').get(pageId);

    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    let result;

    if (contentType === 'image') {
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'imageUrl is required for image posts'
        });
      }

      result = await facebookPublisher.publishImagePost(
        page.facebook_page_id,
        caption,
        imageUrl
      );
    } else {
      result = await facebookPublisher.publishTextPost(
        page.facebook_page_id,
        caption
      );
    }

    if (result.success) {
      // Add first comment if provided
      if (firstComment) {
        await facebookPublisher.addComment(result.postId, firstComment);
      }

      // Store in database
      const stmt = db.prepare(`
        INSERT INTO posts (
          facebook_post_id,
          page_id,
          content_type,
          caption_text,
          image_url,
          first_comment,
          published_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        result.postId,
        pageId,
        contentType,
        caption,
        imageUrl || null,
        firstComment || null,
        new Date().toISOString(),
        new Date().toISOString()
      );

      db.close();

      res.json({
        success: true,
        post: {
          id: result.postId,
          url: result.postUrl,
          type: result.type
        }
      });
    } else {
      db.close();
      res.status(500).json({
        success: false,
        error: 'Failed to publish post'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Schedule post for later
 */
router.post('/schedule', (req, res) => {
  const { pageId, contentType, caption, imageUrl, firstComment, scheduledFor } = req.body;

  if (!pageId || !contentType || !caption || !scheduledFor) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: pageId, contentType, caption, scheduledFor'
    });
  }

  try {
    const db = new Database(DB_PATH);

    const stmt = db.prepare(`
      INSERT INTO scheduled_posts (
        page_id,
        content_type,
        caption_text,
        image_url,
        first_comment,
        scheduled_for,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      pageId,
      contentType,
      caption,
      imageUrl || null,
      firstComment || null,
      new Date(scheduledFor).toISOString(),
      'scheduled',
      new Date().toISOString(),
      new Date().toISOString()
    );

    db.close();

    res.json({
      success: true,
      scheduledPost: {
        id: result.lastInsertRowid,
        scheduledFor: scheduledFor
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get scheduled posts
 */
router.get('/scheduled', (req, res) => {
  const { pageId, status } = req.query;

  try {
    const db = new Database(DB_PATH);

    let query = `
      SELECT
        sp.*,
        p.page_name
      FROM scheduled_posts sp
      JOIN facebook_pages p ON sp.page_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (pageId) {
      query += ' AND sp.page_id = ?';
      params.push(pageId);
    }

    if (status) {
      query += ' AND sp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sp.scheduled_for DESC';

    const posts = db.prepare(query).all(...params);
    db.close();

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cancel scheduled post
 */
router.delete('/scheduled/:id', (req, res) => {
  const { id } = req.params;

  try {
    const db = new Database(DB_PATH);

    const stmt = db.prepare(`
      UPDATE scheduled_posts
      SET status = 'cancelled',
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
    db.close();

    res.json({
      success: true,
      message: 'Post cancelled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test Facebook connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const result = await facebookPublisher.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: 'Facebook API connection successful',
        pageId: result.pageId,
        pageName: result.pageName
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
