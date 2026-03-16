const express = require('express');
const router = express.Router();
const riskScorer = require('../services/risk-scoring');
const { validate } = require('../middleware/validation');

// Helper to wrap sqlite3 callbacks in promises
const dbGet = (db, sql, params) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbAll = (db, sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbRun = (db, sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

// Get all posts with filtering
router.get('/', async (req, res) => {
  const db = req.app.locals.rawDb;
  const { page_id, status, content_type, limit } = req.query;

  try {
    let sql = `
      SELECT gp.*, p.name as page_name, s.title as source_title
      FROM generated_posts gp
      JOIN pages p ON gp.page_id = p.id
      LEFT JOIN sources s ON gp.source_id = s.id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (page_id) {
      conditions.push('gp.page_id = ?');
      params.push(page_id);
    }

    if (status) {
      conditions.push('gp.approval_status = ?');
      params.push(status);
    }

    if (content_type) {
      conditions.push('gp.content_type = ?');
      params.push(content_type);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY gp.generated_at DESC LIMIT ?';
    params.push(parseInt(limit) || 50);

    const rows = await dbAll(db, sql, params);
    res.json({ posts: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts', message: err.message });
  }
});

// Get single post with performance
router.get('/:id', validate('idParam', 'params'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  try {
    const post = await dbGet(db, 'SELECT * FROM generated_posts WHERE id = ?', [id]);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get performance data
    const performance = await dbGet(db, 'SELECT * FROM post_performance WHERE post_id = ?', [id]);
    post.performance = performance;
    
    res.json({ post });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post', message: err.message });
  }
});

// Create new post
router.post('/', validate('createPost', 'body'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const {
    page_id,
    content_type,
    caption,
    first_comment,
    image_prompt,
    source_id,
    competitor_id,
    scheduled_for
  } = req.body;

  try {
    // Calculate risk score
    const riskScore = riskScorer.calculateRiskScore(caption || '');

    // Determine approval status based on risk
    let approvalStatus = 'pending';
    if (riskScore < 0.3) {
      approvalStatus = 'auto_approved';
    } else if (riskScore >= 0.7) {
      approvalStatus = 'pending'; // High risk requires manual review
    }

    const sql = `
      INSERT INTO generated_posts (
        page_id, content_type, caption, first_comment, image_prompt,
        source_id, competitor_id, risk_score, approval_status, scheduled_for
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      page_id,
      content_type,
      caption || null,
      first_comment || null,
      image_prompt || null,
      source_id || null,
      competitor_id || null,
      riskScore,
      approvalStatus,
      scheduled_for || null
    ];

    const result = await dbRun(db, sql, params);
    
    res.status(201).json({
      message: 'Post created successfully',
      post_id: result.lastID,
      risk_score: riskScore,
      approval_status: approvalStatus
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(400).json({ error: 'Failed to create post', message: err.message });
  }
});

// Update post
router.put('/:id', validate('idParam', 'params'), validate('updatePost', 'body'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { caption, first_comment, image_prompt, scheduled_for } = req.body;

  try {
    // Recalculate risk if caption changed
    let riskScore = null;
    if (caption !== undefined) {
      riskScore = riskScorer.calculateRiskScore(caption || '');
    }

    const sql = `
      UPDATE generated_posts
      SET caption = COALESCE(?, caption),
          first_comment = COALESCE(?, first_comment),
          image_prompt = COALESCE(?, image_prompt),
          scheduled_for = COALESCE(?, scheduled_for),
          risk_score = COALESCE(?, risk_score)
      WHERE id = ?
    `;
    const params = [
      caption !== undefined ? caption : null,
      first_comment !== undefined ? first_comment : null,
      image_prompt !== undefined ? image_prompt : null,
      scheduled_for !== undefined ? scheduled_for : null,
      riskScore,
      id
    ];

    const result = await dbRun(db, sql, params);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post updated successfully', risk_score: riskScore });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(400).json({ error: 'Failed to update post', message: err.message });
  }
});

// Approve/reject post
router.put('/:id/approval', validate('idParam', 'params'), validate('approvalStatus', 'body'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { status } = req.body;

  try {
    const sql = 'UPDATE generated_posts SET approval_status = ? WHERE id = ?';
    const result = await dbRun(db, sql, [status, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: `Post ${status} successfully` });
  } catch (err) {
    console.error('Error updating approval status:', err);
    res.status(400).json({ error: 'Failed to update approval status', message: err.message });
  }
});

// Mark post as posted
router.post('/:id/post', validate('idParam', 'params'), validate('markPosted', 'body'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const { platform_post_id } = req.body;

  try {
    const sql = `
      UPDATE generated_posts
      SET approval_status = 'posted',
          posted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await dbRun(db, sql, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Update with platform post ID if provided
    if (platform_post_id) {
      await dbRun(db, 
        'UPDATE generated_posts SET platform_post_id = ? WHERE id = ?',
        [platform_post_id, id]
      );
    }

    res.json({ message: 'Post marked as posted' });
  } catch (err) {
    console.error('Error marking post as posted:', err);
    res.status(400).json({ error: 'Failed to mark post as posted', message: err.message });
  }
});

// Add/update performance data
router.put('/:id/performance', validate('idParam', 'params'), validate('performanceUpdate', 'body'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;
  const {
    platform_post_id,
    reach,
    impressions,
    engagement_rate,
    clicks,
    shares,
    comments,
    likes,
    saves,
    cpc,
    ctr
  } = req.body;

  try {
    const sql = `
      INSERT OR REPLACE INTO post_performance (
        post_id, platform_post_id, reach, impressions, engagement_rate,
        clicks, shares, comments, likes, saves, cpc, ctr
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      platform_post_id || null,
      reach || 0,
      impressions || 0,
      engagement_rate || 0,
      clicks || 0,
      shares || 0,
      comments || 0,
      likes || 0,
      saves || 0,
      cpc || null,
      ctr || null
    ];

    await dbRun(db, sql, params);
    res.json({ message: 'Performance data updated successfully' });
  } catch (err) {
    console.error('Error updating performance:', err);
    res.status(400).json({ error: 'Failed to update performance', message: err.message });
  }
});

// Delete post
router.delete('/:id', validate('idParam', 'params'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { id } = req.params;

  try {
    const result = await dbRun(db, 'DELETE FROM generated_posts WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(400).json({ error: 'Failed to delete post', message: err.message });
  }
});

// Get posts requiring approval
router.get('/queue/approval', validate('approvalQueueQuery', 'query'), async (req, res) => {
  const db = req.app.locals.rawDb;
  const { min_risk } = req.query;

  try {
    const sql = `
      SELECT gp.*, p.name as page_name
      FROM generated_posts gp
      JOIN pages p ON gp.page_id = p.id
      WHERE gp.approval_status = 'pending'
        AND gp.risk_score >= ?
      ORDER BY gp.risk_score DESC, gp.generated_at ASC
    `;

    const rows = await dbAll(db, sql, [parseFloat(min_risk)]);
    res.json({ posts: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching approval queue:', err);
    res.status(500).json({ error: 'Failed to fetch approval queue', message: err.message });
  }
});

// Get scheduled posts
router.get('/queue/scheduled', async (req, res) => {
  const db = req.app.locals.rawDb;

  try {
    const sql = `
      SELECT gp.*, p.name as page_name
      FROM generated_posts gp
      JOIN pages p ON gp.page_id = p.id
      WHERE gp.approval_status IN ('auto_approved', 'approved')
        AND gp.scheduled_for IS NOT NULL
        AND gp.posted_at IS NULL
      ORDER BY gp.scheduled_for ASC
    `;

    const rows = await dbAll(db, sql, []);
    res.json({ posts: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching scheduled posts:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled posts', message: err.message });
  }
});

module.exports = router;
