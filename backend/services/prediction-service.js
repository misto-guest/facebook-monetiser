/**
 * Enhanced Ad Prediction Service (SMV Compliant)
 * Predicts performance metrics for Facebook ads/posts
 * - CTR prediction based on historical data
 * - CVR prediction based on content type and niche
 * - CPA prediction based on niche and content
 * - Confidence scoring for predictions
 */

class PredictionService {
  constructor() {
    this.baselineMetrics = {
      avg_ctr: 0.025, // 2.5%
      avg_cvr: 0.012, // 1.2%
      avg_cpa: 8.50, // $8.50
      avg_engagement_rate: 0.035 // 3.5%
    };

    // Enhanced factors with SMV spec considerations
    this.factors = {
      content_type: {
        image: { ctr_multiplier: 1.0, cvr_multiplier: 1.0, cpa_multiplier: 1.0 },
        reel: { ctr_multiplier: 1.4, cvr_multiplier: 1.3, cpa_multiplier: 0.8 },
        text: { ctr_multiplier: 0.8, cvr_multiplier: 0.7, cpa_multiplier: 1.2 },
        carousel: { ctr_multiplier: 1.2, cvr_multiplier: 1.1, cpa_multiplier: 0.9 },
        story: { ctr_multiplier: 1.1, cvr_multiplier: 1.2, cpa_multiplier: 1.0 }
      },
      niche_performance: {
        'fitness': { ctr: 1.2, cvr: 1.3, cpa: 0.8 },
        'finance': { ctr: 0.9, cvr: 1.5, cpa: 0.9 },
        'beauty': { ctr: 1.3, cvr: 1.1, cpa: 0.85 },
        'food': { ctr: 1.1, cvr: 0.9, cpa: 1.0 },
        'travel': { ctr: 1.0, cvr: 0.8, cpa: 1.1 },
        'tech': { ctr: 0.95, cvr: 1.2, cpa: 0.95 },
        'gaming': { ctr: 1.15, cvr: 1.0, cpa: 1.0 },
        'lifestyle': { ctr: 1.05, cvr: 1.05, cpa: 1.0 }
      },
      time_of_day: {
        morning: { ctr: 0.9, engagement: 0.85 },
        afternoon: { ctr: 1.0, engagement: 1.0 },
        evening: { ctr: 1.2, engagement: 1.3 },
        night: { ctr: 0.7, engagement: 0.6 }
      },
      risk_penalty: {
        low: { multiplier: 1.0, confidence: 0.2 },
        medium: { multiplier: 0.85, confidence: 0.1 },
        high: { multiplier: 0.6, confidence: -0.2 }
      }
    };
  }

  /**
   * Predict CTR for a specific post
   * Based on historical data, content type, and niche
   */
  async predictCTR(post, page, historicalData = null) {
    let ctr = this.baselineMetrics.avg_ctr;

    // Content type factor
    const typeFactor = this.factors.content_type[post.content_type] || this.factors.content_type.image;
    ctr *= typeFactor.ctr_multiplier;

    // Niche factor (if page has primary_niche)
    if (page.primary_niche && this.factors.niche_performance[page.primary_niche]) {
      const nicheFactor = this.factors.niche_performance[page.primary_niche];
      ctr *= nicheFactor.ctr;
    }

    // Risk factor
    if (post.risk_score < 0.3) {
      ctr *= this.factors.risk_penalty.low.multiplier;
    } else if (post.risk_score < 0.6) {
      ctr *= this.factors.risk_penalty.medium.multiplier;
    } else {
      ctr *= this.factors.risk_penalty.high.multiplier;
    }

    // Originality boost
    const originalityMultiplier = 0.8 + (post.originality_score || 0.5) * 0.4;
    ctr *= originalityMultiplier;

    // Historical adjustment (if available)
    if (historicalData && historicalData.avg_ctr) {
      const historicalWeight = 0.3;
      ctr = (ctr * (1 - historicalWeight)) + (historicalData.avg_ctr * historicalWeight);
    }

    // Time-based factor
    const hour = new Date().getHours();
    let timeFactor = this.factors.time_of_day.afternoon;
    if (hour >= 6 && hour < 12) timeFactor = this.factors.time_of_day.morning;
    else if (hour >= 18 && hour < 23) timeFactor = this.factors.time_of_day.evening;
    else if (hour >= 23 || hour < 6) timeFactor = this.factors.time_of_day.night;
    ctr *= timeFactor.ctr;

    // Add small variance for realism (±5%)
    const variance = 0.95 + (Math.random() * 0.1);
    ctr *= variance;

    return Math.max(0.005, Math.min(0.10, ctr));
  }

  /**
   * Predict CVR for a specific post
   * Based on content type, niche, and quality
   */
  async predictCVR(post, page, historicalData = null) {
    let cvr = this.baselineMetrics.avg_cvr;

    // Content type factor
    const typeFactor = this.factors.content_type[post.content_type] || this.factors.content_type.image;
    cvr *= typeFactor.cvr_multiplier;

    // Niche factor
    if (page.primary_niche && this.factors.niche_performance[page.primary_niche]) {
      const nicheFactor = this.factors.niche_performance[page.primary_niche];
      cvr *= nicheFactor.cvr;
    }

    // Originality has strong impact on conversions
    const originalityMultiplier = 0.7 + (post.originality_score || 0.5) * 0.6;
    cvr *= originalityMultiplier;

    // Risk penalty (stronger impact on conversions)
    if (post.risk_score < 0.3) {
      cvr *= this.factors.risk_penalty.low.multiplier;
    } else if (post.risk_score < 0.6) {
      cvr *= this.factors.risk_penalty.medium.multiplier;
    } else {
      cvr *= this.factors.risk_penalty.high.multiplier;
    }

    // Historical adjustment
    if (historicalData && historicalData.avg_cvr) {
      const historicalWeight = 0.4;
      cvr = (cvr * (1 - historicalWeight)) + (historicalData.avg_cvr * historicalWeight);
    }

    // Caption quality factor (clear CTA increases conversions)
    if (post.caption) {
      const ctaKeywords = ['link in bio', 'shop now', 'learn more', 'sign up', 'get started'];
      const hasCTA = ctaKeywords.some(keyword => post.caption.toLowerCase().includes(keyword));
      if (hasCTA) {
        cvr *= 1.15;
      }
    }

    return Math.max(0.001, Math.min(0.08, cvr));
  }

  /**
   * Predict CPA for a specific post
   * Based on niche, content type, and estimated performance
   */
  async predictCPA(post, page, historicalData = null) {
    let cpa = this.baselineMetrics.avg_cpa;

    // Content type factor (better engagement = lower CPA)
    const typeFactor = this.factors.content_type[post.content_type] || this.factors.content_type.image;
    cpa *= typeFactor.cpa_multiplier;

    // Niche factor
    if (page.primary_niche && this.factors.niche_performance[page.primary_niche]) {
      const nicheFactor = this.factors.niche_performance[page.primary_niche];
      cpa *= nicheFactor.cpa;
    }

    // Higher risk = higher CPA (platform penalties)
    if (post.risk_score < 0.3) {
      cpa /= this.factors.risk_penalty.low.multiplier;
    } else if (post.risk_score < 0.6) {
      cpa /= this.factors.risk_penalty.medium.multiplier;
    } else {
      cpa /= this.factors.risk_penalty.high.multiplier;
    }

    // Better originality = lower CPA
    const originalityMultiplier = 1.3 - (post.originality_score || 0.5) * 0.6;
    cpa *= originalityMultiplier;

    // Historical adjustment
    if (historicalData && historicalData.avg_cpa) {
      const historicalWeight = 0.35;
      cpa = (cpa * (1 - historicalWeight)) + (historicalData.avg_cpa * historicalWeight);
    }

    // Follower count factor (larger audiences = lower CPA)
    if (page.followers_count) {
      if (page.followers_count > 100000) {
        cpa *= 0.85;
      } else if (page.followers_count > 50000) {
        cpa *= 0.92;
      } else if (page.followers_count < 1000) {
        cpa *= 1.2;
      }
    }

    return Math.max(1.0, Math.min(50.0, cpa));
  }

  /**
   * Calculate prediction confidence score
   */
  async calculateConfidence(post, page, historicalData) {
    let confidence = 0.5; // Base confidence

    // Historical data available increases confidence
    if (historicalData && historicalData.sample_size > 5) {
      confidence += 0.2;
    }

    // Higher originality increases confidence
    confidence += (post.originality_score - 0.5) * 0.2;

    // Lower risk increases confidence
    if (post.risk_score < 0.3) {
      confidence += this.factors.risk_penalty.low.confidence;
    } else if (post.risk_score < 0.6) {
      confidence += this.factors.risk_penalty.medium.confidence;
    } else {
      confidence += this.factors.risk_penalty.high.confidence;
    }

    // Page maturity increases confidence
    if (page.followers_count > 10000) {
      confidence += 0.1;
    }

    // Caption quality
    if (post.caption && post.caption.length >= 50) {
      confidence += 0.05;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Predict full performance for a post
   */
  async predictPerformance(post, page, historicalData = null) {
    const predicted_ctr = await this.predictCTR(post, page, historicalData);
    const predicted_cvr = await this.predictCVR(post, page, historicalData);
    const predicted_cpa = await this.predictCPA(post, page, historicalData);
    const confidence = await this.calculateConfidence(post, page, historicalData);

    const engagement_multiplier = 0.7 + (post.originality_score || 0.5) * 0.6;
    const estimated_reach = Math.min(
      Math.round((page.followers_count || 0) * 0.15),
      10000
    );

    const predicted_metrics = {
      estimated_reach,
      estimated_impressions: Math.round(estimated_reach * 1.5),
      estimated_engagement: Math.round(estimated_reach * this.baselineMetrics.avg_engagement_rate * engagement_multiplier),
      estimated_clicks: Math.round(estimated_reach * predicted_ctr),
      estimated_shares: Math.round(estimated_reach * 0.005 * engagement_multiplier),
      estimated_comments: Math.round(estimated_reach * 0.002 * engagement_multiplier),
      estimated_likes: Math.round(estimated_reach * 0.025 * engagement_multiplier),
      estimated_conversions: Math.round(estimated_reach * predicted_ctr * predicted_cvr)
    };

    const failure_reasons = await this._assessFailureRisk(post, page);

    return {
      predicted_ctr,
      predicted_cvr,
      predicted_cpa,
      confidence_score: confidence,
      predicted_metrics,
      failure_reasons
    };
  }

  /**
   * Assess potential failure reasons
   */
  async _assessFailureRisk(post, page) {
    const reasons = [];

    // Risk assessment
    if (post.risk_score > 0.6) {
      reasons.push({
        type: 'content_risk',
        severity: 'high',
        message: 'High risk content may reduce engagement or get flagged'
      });
    }

    // Originality check
    if (post.originality_score < 0.4) {
      reasons.push({
        type: 'low_originality',
        severity: 'medium',
        message: 'Content lacks uniqueness, may not stand out'
      });
    }

    // Engagement potential
    const engagement_multiplier = 0.7 + (post.originality_score || 0.5) * 0.6;
    if (engagement_multiplier < 0.85) {
      reasons.push({
        type: 'low_engagement_potential',
        severity: 'medium',
        message: 'Content may not resonate with audience'
      });
    }

    // Reach limitation
    if ((page.followers_count || 0) < 1000) {
      reasons.push({
        type: 'limited_reach',
        severity: 'low',
        message: 'Small follower base limits potential reach'
      });
    }

    // Caption quality
    if (!post.caption || post.caption.length < 20) {
      reasons.push({
        type: 'weak_caption',
        severity: 'low',
        message: 'Short or missing caption may reduce engagement'
      });
    }

    // Niche mismatch (if page has niche and post doesn't align)
    if (page.primary_niche && post.caption) {
      const nicheKeywords = {
        'fitness': ['workout', 'fitness', 'gym', 'exercise', 'training'],
        'finance': ['money', 'invest', 'finance', 'wealth', 'financial'],
        'beauty': ['makeup', 'beauty', 'skincare', 'cosmetic', 'glam'],
        'food': ['food', 'recipe', 'cook', 'meal', 'delicious'],
        'travel': ['travel', 'trip', 'destination', 'adventure', 'explore']
      };

      const keywords = nicheKeywords[page.primary_niche] || [];
      const hasNicheContent = keywords.some(kw => post.caption.toLowerCase().includes(kw));

      if (!hasNicheContent && keywords.length > 0) {
        reasons.push({
          type: 'niche_mismatch',
          severity: 'low',
          message: 'Content may not align with page niche'
        });
      }
    }

    return reasons;
  }

  /**
   * Compare prediction with actual performance
   */
  compareWithActual(prediction, actual) {
    const ctr_delta = actual.ctr - prediction.predicted_ctr;
    const cvr_delta = actual.cvr - prediction.predicted_cvr;
    const cpa_delta = actual.cpa - prediction.predicted_cpa;

    const isAccurate =
      Math.abs(ctr_delta) < 0.01 &&
      Math.abs(cvr_delta) < 0.005 &&
      Math.abs(cpa_delta) < 2.0;

    return {
      is_accurate: isAccurate,
      ctr_delta,
      cvr_delta,
      cpa_delta,
      accuracy_score: this._calculateAccuracyScore(ctr_delta, cvr_delta, cpa_delta)
    };
  }

  /**
   * Calculate overall accuracy score
   */
  _calculateAccuracyScore(ctr_delta, cvr_delta, cpa_delta) {
    const ctr_accuracy = Math.max(0, 1 - Math.abs(ctr_delta) / 0.05);
    const cvr_accuracy = Math.max(0, 1 - Math.abs(cvr_delta) / 0.02);
    const cpa_accuracy = Math.max(0, 1 - Math.abs(cpa_delta) / 10);

    return (ctr_accuracy + cvr_accuracy + cpa_accuracy) / 3;
  }
}

module.exports = new PredictionService();
