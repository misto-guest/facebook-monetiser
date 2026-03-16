const express = require('express');
const router = express.Router();
const predictionService = require('../services/prediction-service');

// Get predictions for a post
router.get('/post/:postId', (req, res) => {
  const db = req.app.locals.rawDb;
  const { postId } = req.params;

  db.get(
    'SELECT * FROM ad_predictions WHERE post_id = ? ORDER BY created_at DESC LIMIT 1',
    [postId],
    (err, prediction) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!prediction) {
        return res.status(404).json({ error: 'No prediction found for this post' });
      }

      // Parse JSON fields
      prediction.predicted_metrics = JSON.parse(prediction.predicted_metrics || '{}');
      prediction.failure_reasons = JSON.parse(prediction.failure_reasons || '[]');

      res.json({ prediction });
    }
  );
});

// Create prediction for a post
router.post('/post/:postId/predict', async (req, res) => {
  const db = req.app.locals.rawDb;
  const { postId } = req.params;

  try {
    // Get post details
    const post = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM generated_posts WHERE id = ?', [postId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get page details
    const page = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM pages WHERE id = ?', [post.page_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Generate prediction
    const prediction = await predictionService.predictPerformance(post, page);

    // Store prediction
    const sql = `
      INSERT INTO ad_predictions (
        post_id, predicted_ctr, predicted_cvr, predicted_cpa,
        confidence_score, predicted_metrics, failure_reasons
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        postId,
        prediction.predicted_ctr,
        prediction.predicted_cvr,
        prediction.predicted_cpa,
        prediction.confidence_score,
        JSON.stringify(prediction.predicted_metrics),
        JSON.stringify(prediction.failure_reasons || [])
      ],
      function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        res.status(201).json({
          message: 'Prediction created successfully',
          prediction_id: this.lastID,
          prediction
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all predictions
router.get('/', (req, res) => {
  const db = req.app.locals.rawDb;
  const { limit = 50, min_confidence = 0 } = req.query;

  const sql = `
    SELECT ap.*, gp.caption, gp.content_type, p.name as page_name
    FROM ad_predictions ap
    JOIN generated_posts gp ON ap.post_id = gp.id
    JOIN pages p ON gp.page_id = p.id
    WHERE ap.confidence_score >= ?
    ORDER BY ap.created_at DESC
    LIMIT ?
  `;

  db.all(sql, [parseFloat(min_confidence), parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse JSON fields
    rows.forEach(row => {
      row.predicted_metrics = JSON.parse(row.predicted_metrics || '{}');
      row.failure_reasons = JSON.parse(row.failure_reasons || '[]');
    });

    res.json({ predictions: rows, count: rows.length });
  });
});

// Compare prediction vs actual performance
router.get('/post/:postId/accuracy', (req, res) => {
  const db = req.app.locals.rawDb;
  const { postId } = req.params;

  const sql = `
    SELECT
      ap.predicted_ctr, ap.predicted_cvr, ap.predicted_cpa,
      pp.engagement_rate, pp.clicks, pp.reach
    FROM ad_predictions ap
    LEFT JOIN post_performance pp ON ap.post_id = pp.post_id
    WHERE ap.post_id = ?
  `;

  db.get(sql, [postId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'No prediction or performance data found' });
    }

    // Calculate deltas
    const accuracy = {
      predicted_ctr: row.predicted_ctr,
      actual_engagement_rate: row.engagement_rate,
      ctr_delta: row.engagement_rate - row.predicted_ctr,
      predicted_cvr: row.predicted_cvr,
      predicted_cpa: row.predicted_cpa,
      has_performance_data: row.reach > 0
    };

    res.json({ accuracy });
  });
});

// Get prediction accuracy stats
router.get('/stats/accuracy', (req, res) => {
  const db = req.app.locals.rawDb;

  const sql = `
    SELECT
      COUNT(*) as total_predictions,
      AVG(ap.confidence_score) as avg_confidence,
      COUNT(pp.post_id) as predictions_with_actuals
    FROM ad_predictions ap
    LEFT JOIN post_performance pp ON ap.post_id = pp.post_id
  `;

  db.get(sql, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ stats: row });
  });
});

// Get flagged predictions (prediction vs reality contradictions)
router.get('/flags/contradictions', (req, res) => {
  const db = req.app.locals.rawDb;
  const { threshold = 0.3 } = req.query;

  const sql = `
    SELECT
      ap.post_id,
      ap.predicted_ctr,
      pp.engagement_rate as actual_ctr,
      ABS(ap.predicted_ctr - pp.engagement_rate) as delta,
      gp.caption,
      p.name as page_name
    FROM ad_predictions ap
    JOIN generated_posts gp ON ap.post_id = gp.id
    JOIN pages p ON gp.page_id = p.id
    JOIN post_performance pp ON ap.post_id = pp.post_id
    WHERE ABS(ap.predicted_ctr - pp.engagement_rate) > ?
    ORDER BY delta DESC
  `;

  db.all(sql, [parseFloat(threshold)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ contradictions: rows, count: rows.length });
  });
});

module.exports = router;
