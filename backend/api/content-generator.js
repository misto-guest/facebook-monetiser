const express = require('express');
const router = express.Router();
const contentGenerator = require('../services/content-generator');
const riskScorer = require('../services/risk-scoring');

// Generate caption from source/insight
router.post('/caption', async (req, res) => {
  const { source_id, insight_id, content_type, tone, target_audience } = req.body;

  try {
    const db = req.app.locals.rawDb;

    // Get source or insight context
    let context = {};
    if (source_id) {
      const source = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM sources WHERE id = ?', [source_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      context = source;
    } else if (insight_id) {
      const insight = await new Promise((resolve, reject) => {
        db.get(`
          SELECT i.*, s.title as source_title, s.content_text
          FROM insights i
          JOIN sources s ON i.source_id = s.id
          WHERE i.id = ?
        `, [insight_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      context = insight;
    }

    // Generate caption
    const caption = await contentGenerator.generateCaption(context, {
      content_type,
      tone: tone || 'professional',
      target_audience
    });

    // Calculate risk score
    const riskScore = riskScorer.calculateRiskScore(caption);

    res.json({
      caption,
      risk_score: riskScore,
      approval_status: riskScore < 0.3 ? 'auto_approved' : 'pending'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate first comment
router.post('/comment', async (req, res) => {
  const { caption, content_type, include_cta } = req.body;

  try {
    const comment = await contentGenerator.generateFirstComment(caption, {
      content_type,
      include_cta: include_cta !== false
    });

    res.json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate image prompt
router.post('/image-prompt', async (req, res) => {
  const { caption, style, mood, content_type } = req.body;

  try {
    const prompt = await contentGenerator.generateImagePrompt(caption, {
      style: style || 'professional',
      mood: mood || 'neutral',
      content_type
    });

    res.json({ prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate complete post (caption + comment + image prompt)
router.post('/complete', async (req, res) => {
  const { source_id, insight_id, content_type, options } = req.body;

  try {
    const db = req.app.locals.rawDb;

    // Get context
    let context = {};
    if (source_id) {
      context = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM sources WHERE id = ?', [source_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else if (insight_id) {
      context = await new Promise((resolve, reject) => {
        db.get(`
          SELECT i.*, s.title as source_title, s.content_text
          FROM insights i
          JOIN sources s ON i.source_id = s.id
          WHERE i.id = ?
        `, [insight_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    // Generate all components
    const [caption, first_comment, image_prompt] = await Promise.all([
      contentGenerator.generateCaption(context, options || {}),
      contentGenerator.generateFirstComment('', options || {}),
      contentGenerator.generateImagePrompt('', options || {})
    ]);

    // Calculate risk and originality scores
    const riskScore = riskScorer.calculateRiskScore(caption);
    const originalityScore = contentGenerator.calculateOriginalityScore(caption);

    res.json({
      caption,
      first_comment,
      image_prompt,
      risk_score: riskScore,
      originality_score: originalityScore,
      approval_status: riskScore < 0.3 ? 'auto_approved' : 'pending'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check content originality
router.post('/check-originality', async (req, res) => {
  const { caption } = req.body;

  try {
    const originalityScore = contentGenerator.calculateOriginalityScore(caption);
    const isOriginal = originalityScore > 0.5;

    res.json({
      originality_score: originalityScore,
      is_original: isOriginal,
      recommendation: isOriginal ? 'Good to post' : 'Consider revising for uniqueness'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get content suggestions from insights
router.get('/suggestions', (req, res) => {
  const db = req.app.locals.rawDb;
  const { page_id, limit = 10 } = req.query;

  const sql = `
    SELECT DISTINCT
      i.id as insight_id,
      i.insight_text,
      i.category,
      i.effectiveness_score,
      s.title as source_title,
      s.source_type
    FROM insights i
    JOIN sources s ON i.source_id = s.id
    WHERE i.effectiveness_score >= 0.6
    ORDER BY i.effectiveness_score DESC, i.created_at DESC
    LIMIT ?
  `;

  db.all(sql, [parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ suggestions: rows });
  });
});

// Analyze content for risks
router.post('/analyze', (req, res) => {
  const { caption, first_comment, image_prompt } = req.body;

  try {
    const captionRisk = riskScorer.calculateRiskScore(caption || '');
    const commentRisk = riskScorer.calculateRiskScore(first_comment || '');

    const riskFlags = riskScorer.getRiskFlags(caption || '');

    res.json({
      caption_risk_score: captionRisk,
      comment_risk_score: commentRisk,
      overall_risk_score: Math.max(captionRisk, commentRisk),
      risk_flags: riskFlags,
      recommendation: captionRisk < 0.3 ? 'Safe to auto-approve' : 'Requires manual review'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
