const express = require('express');
const router = express.Router();
const predictionService = require('../services/prediction-service');

// ============================================
// BASE PREDICTIONS ROUTES
// ============================================

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

// ============================================
// ENHANCED PREDICTIONS ROUTES (SMV Compliant)
// ============================================

// Get CTR prediction for a specific post
router.get('/ctr/:postId', async (req, res) => {
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

    // Get historical data for this page
    const historicalData = await new Promise((resolve, reject) => {
      const sql = `
        SELECT
          pp.engagement_rate as ctr,
          pp.clicks,
          pp.reach
        FROM post_performance pp
        JOIN generated_posts gp ON pp.post_id = gp.id
        WHERE gp.page_id = ?
          AND pp.engagement_rate IS NOT NULL
        ORDER BY pp.recorded_at DESC
        LIMIT 20
      `;

      db.all(sql, [post.page_id], (err, rows) => {
        if (err) reject(err);
        else {
          const avgCtr = rows.length > 0
            ? rows.reduce((sum, r) => sum + (r.ctr || 0), 0) / rows.length
            : null;

          resolve({
            avg_ctr: avgCtr,
            sample_size: rows.length
          });
        }
      });
    });

    // Calculate CTR prediction
    const predicted_ctr = await predictionService.predictCTR(post, page, historicalData);

    // Get confidence score
    const confidence = await predictionService.calculateConfidence(post, page, historicalData);

    res.json({
      post_id: parseInt(postId),
      predicted_ctr,
      confidence_score: confidence,
      baseline_ctr: predictionService.baselineMetrics.avg_ctr,
      historical_data: historicalData,
      factors: {
        content_type: post.content_type,
        niche: page.primary_niche,
        originality_score: post.originality_score,
        risk_score: post.risk_score
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get full performance prediction for a specific post
router.get('/performance/:postId', async (req, res) => {
  const db = req.app.locals.rawDb;
  const { postId } = req.params;
  const { include_historical = false } = req.query;

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

    // Get historical data if requested
    let historicalData = null;
    if (include_historical === 'true') {
      historicalData = await new Promise((resolve, reject) => {
        const sql = `
          SELECT
            pp.engagement_rate as ctr,
            pp.clicks,
            pp.reach,
            pp.impressions
          FROM post_performance pp
          JOIN generated_posts gp ON pp.post_id = gp.id
          WHERE gp.page_id = ?
            AND pp.engagement_rate IS NOT NULL
          ORDER BY pp.recorded_at DESC
          LIMIT 20
        `;

        db.all(sql, [post.page_id], (err, rows) => {
          if (err) reject(err);
          else {
            const avgCtr = rows.length > 0
              ? rows.reduce((sum, r) => sum + (r.ctr || 0), 0) / rows.length
              : null;
            const avgCvr = rows.length > 0
              ? rows.reduce((sum, r) => sum + ((r.clicks || 0) / Math.max(r.impressions || 1, 1)), 0) / rows.length
              : null;

            resolve({
              avg_ctr: avgCtr,
              avg_cvr: avgCvr,
              sample_size: rows.length
            });
          }
        });
      });
    }

    // Generate full prediction
    const prediction = await predictionService.predictPerformance(post, page, historicalData);

    res.json({
      post_id: parseInt(postId),
      page: {
        id: page.id,
        name: page.name,
        primary_niche: page.primary_niche,
        followers_count: page.followers_count
      },
      post: {
        id: post.id,
        content_type: post.content_type,
        originality_score: post.originality_score,
        risk_score: post.risk_score
      },
      prediction,
      historical_data: include_historical === 'true' ? historicalData : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get batch predictions for multiple posts
router.post('/batch', async (req, res) => {
  const db = req.app.locals.rawDb;
  const { post_ids } = req.body;

  if (!post_ids || !Array.isArray(post_ids)) {
    return res.status(400).json({ error: 'post_ids array is required' });
  }

  try {
    const predictions = [];

    for (const postId of post_ids) {
      // Get post details
      const post = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM generated_posts WHERE id = ?', [postId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!post) {
        predictions.push({
          post_id: postId,
          error: 'Post not found'
        });
        continue;
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

      predictions.push({
        post_id: postId,
        prediction
      });
    }

    res.json({
      processed: predictions.length,
      predictions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prediction accuracy metrics (enhanced version)
router.get('/accuracy/metrics', (req, res) => {
  const db = req.app.locals.rawDb;

  const sql = `
    SELECT
      COUNT(*) as total_predictions,
      AVG(ap.confidence_score) as avg_confidence,
      COUNT(pp.post_id) as predictions_with_actuals,
      AVG(
        CASE
          WHEN pp.engagement_rate IS NOT NULL THEN ABS(ap.predicted_ctr - pp.engagement_rate)
          ELSE NULL
        END
      ) as avg_ctr_error,
      AVG(
        CASE
          WHEN pp.reach IS NOT NULL THEN ABS(ap.predicted_metrics->>'$.estimated_reach' - pp.reach) / pp.reach
          ELSE NULL
        END
      ) as avg_reach_error_pct
    FROM ad_predictions ap
    LEFT JOIN post_performance pp ON ap.post_id = pp.post_id
  `;

  db.get(sql, [], (err, metrics) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate accuracy percentage
    const accuracyPct = metrics.avg_ctr_error
      ? Math.max(0, 1 - metrics.avg_ctr_error) * 100
      : null;

    res.json({
      metrics: {
        ...metrics,
        estimated_accuracy_pct: accuracyPct
      }
    });
  });
});

// Get prediction vs actual comparisons (enhanced version)
router.get('/comparisons', (req, res) => {
  const db = req.app.locals.rawDb;
  const { limit = 20 } = req.query;

  const sql = `
    SELECT
      ap.post_id,
      ap.predicted_ctr,
      ap.predicted_cvr,
      ap.predicted_cpa,
      pp.engagement_rate as actual_ctr,
      pp.clicks,
      pp.reach,
      pp.impressions,
      gp.content_type,
      gp.caption,
      p.name as page_name,
      ABS(ap.predicted_ctr - pp.engagement_rate) as ctr_delta,
      CASE
        WHEN pp.engagement_rate IS NOT NULL THEN
          1 - (ABS(ap.predicted_ctr - pp.engagement_rate) / GREATEST(ap.predicted_ctr, pp.engagement_rate))
        ELSE NULL
      END as accuracy_score
    FROM ad_predictions ap
    JOIN generated_posts gp ON ap.post_id = gp.id
    JOIN pages p ON gp.page_id = p.id
    LEFT JOIN post_performance pp ON ap.post_id = pp.post_id
    WHERE pp.engagement_rate IS NOT NULL
    ORDER BY accuracy_score DESC
    LIMIT ?
  `;

  db.all(sql, [parseInt(limit)], (err, comparisons) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      comparisons,
      count: comparisons.length
    });
  });
});

module.exports = router;
