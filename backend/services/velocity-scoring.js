/**
 * Velocity Scoring Service (SMV Compliant)
 * Calculates content velocity scores based on engagement rates
 * - Engagement rate per hour
 * - Velocity score calculation
 * - Trending detection
 */

class VelocityScoringService {
  constructor() {
    // Velocity thresholds for categorization
    this.thresholds = {
      trending: 0.7,      // High velocity, trending content
      moderate: 0.4,      // Moderate velocity
      low: 0.0            // Low velocity
    };

    // Engagement weights for different metrics
    this.engagementWeights = {
      likes: 0.3,
      comments: 0.4,      // Comments are worth more (higher engagement)
      shares: 0.5,        // Shares are worth even more (amplification)
      saves: 0.45         // Saves indicate high value
    };

    // Time decay factors (engagement loses value over time)
    this.timeDecay = {
      hour_1: 1.0,        // First hour: full value
      hour_6: 0.8,        // 6 hours: 80% value
      hour_12: 0.6,       // 12 hours: 60% value
      hour_24: 0.4,       // 24 hours: 40% value
      hour_48: 0.2        // 48+ hours: 20% value
    };
  }

  /**
   * Calculate velocity score for a piece of content
   * @param {Object} content - Content with engagement metrics
   * @param {number} content.likes - Number of likes
   * @param {number} content.comments - Number of comments
   * @param {number} content.shares - Number of shares
   * @param {number} content.saves - Number of saves
   * @param {number} content.age_hours - Content age in hours
   * @param {number} content.followers - Account follower count (optional)
   * @returns {number} Velocity score (0-1)
   */
  calculateVelocityScore(content) {
    if (!content) {
      return 0;
    }

    const {
      likes = 0,
      comments = 0,
      shares = 0,
      saves = 0,
      age_hours = 1,
      followers = 10000
    } = content;

    // Calculate weighted engagement score
    const engagementScore =
      (likes * this.engagementWeights.likes) +
      (comments * this.engagementWeights.comments) +
      (shares * this.engagementWeights.shares) +
      (saves * this.engagementWeights.saves);

    // Calculate engagement rate per hour
    const engagementRate = engagementScore / Math.max(age_hours, 1);

    // Normalize by follower count (engagement relative to audience size)
    const normalizedRate = engagementRate / Math.max(followers, 1) * 1000;

    // Apply time decay factor
    const timeDecayFactor = this._getTimeDecayFactor(age_hours);
    const adjustedRate = normalizedRate * timeDecayFactor;

    // Convert to velocity score (0-1 scale)
    // Using a sigmoid-like function for smooth scaling
    const velocityScore = 1 - (1 / (1 + adjustedRate * 0.5));

    return Math.max(0, Math.min(1, velocityScore));
  }

  /**
   * Calculate engagement rate per hour
   */
  calculateEngagementRate(content) {
    if (!content) {
      return 0;
    }

    const {
      likes = 0,
      comments = 0,
      shares = 0,
      saves = 0,
      age_hours = 1
    } = content;

    const totalEngagement = likes + (comments * 2) + (shares * 3) + (saves * 2.5);
    const rate = totalEngagement / Math.max(age_hours, 1);

    return rate;
  }

  /**
   * Get velocity category
   */
  getVelocityCategory(velocityScore) {
    if (velocityScore >= this.thresholds.trending) {
      return 'trending';
    } else if (velocityScore >= this.thresholds.moderate) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  /**
   * Check if content is trending
   */
  isTrending(content) {
    const velocityScore = this.calculateVelocityScore(content);
    return velocityScore >= this.thresholds.trending;
  }

  /**
   * Calculate velocity scores for multiple content items
   */
  batchCalculateVelocity(contentArray) {
    return contentArray.map(content => ({
      content_id: content.id,
      velocity_score: this.calculateVelocityScore(content),
      engagement_rate: this.calculateEngagementRate(content),
      category: this.getVelocityCategory(this.calculateVelocityScore(content)),
      is_trending: this.isTrending(content)
    }));
  }

  /**
   * Get time decay factor based on content age
   */
  _getTimeDecayFactor(age_hours) {
    if (age_hours <= 1) return this.timeDecay.hour_1;
    if (age_hours <= 6) return this.timeDecay.hour_6;
    if (age_hours <= 12) return this.timeDecay.hour_12;
    if (age_hours <= 24) return this.timeDecay.hour_24;
    return this.timeDecay.hour_48;
  }

  /**
   * Calculate predicted velocity for new content
   * Based on historical patterns
   */
  predictVelocity(content, historicalData = []) {
    if (!historicalData || historicalData.length === 0) {
      // No historical data, return baseline prediction
      return {
        predicted_velocity_score: 0.5,
        confidence: 'low',
        category: 'moderate',
        recommendation: 'Post and monitor engagement'
      };
    }

    // Calculate average velocity from historical data
    const avgVelocity = historicalData.reduce((sum, item) => {
      return sum + this.calculateVelocityScore(item);
    }, 0) / historicalData.length;

    // Adjust based on content characteristics
    let predictedVelocity = avgVelocity;

    // Boost for certain content types
    if (content.content_type === 'reel') {
      predictedVelocity *= 1.2;
    } else if (content.content_type === 'carousel') {
      predictedVelocity *= 1.1;
    }

    // Adjust for caption length (optimal: 100-300 chars)
    if (content.caption) {
      const length = content.caption.length;
      if (length >= 100 && length <= 300) {
        predictedVelocity *= 1.1;
      } else if (length > 500) {
        predictedVelocity *= 0.9;
      }
    }

    // Apply risk penalty
    if (content.risk_score && content.risk_score > 0.6) {
      predictedVelocity *= 0.8;
    }

    // Clamp to 0-1
    predictedVelocity = Math.max(0, Math.min(1, predictedVelocity));

    // Determine confidence based on sample size
    let confidence = 'low';
    if (historicalData.length > 10) {
      confidence = 'high';
    } else if (historicalData.length > 5) {
      confidence = 'medium';
    }

    return {
      predicted_velocity_score: predictedVelocity,
      confidence,
      category: this.getVelocityCategory(predictedVelocity),
      recommendation: this._getRecommendation(predictedVelocity)
    };
  }

  /**
   * Get recommendation based on predicted velocity
   */
  _getRecommendation(velocityScore) {
    if (velocityScore >= this.thresholds.trending) {
      return 'High velocity expected - post during peak hours for maximum impact';
    } else if (velocityScore >= this.thresholds.moderate) {
      return 'Moderate velocity expected - standard posting strategy';
    } else {
      return 'Low velocity expected - consider improving content or timing';
    }
  }

  /**
   * Compare velocity scores between two content items
   */
  compareVelocity(content1, content2) {
    const score1 = this.calculateVelocityScore(content1);
    const score2 = this.calculateVelocityScore(content2);

    const difference = score2 - score1;
    const percentDifference = (difference / score1) * 100;

    return {
      content1_score: score1,
      content2_score: score2,
      difference,
      percent_difference: percentDifference,
      winner: score2 > score1 ? 'content2' : score1 > score2 ? 'content1' : 'tie',
      interpretation: this._interpretComparison(percentDifference)
    };
  }

  /**
   * Interpret velocity comparison result
   */
  _interpretComparison(percentDifference) {
    if (Math.abs(percentDifference) < 10) {
      return 'Similar velocity performance';
    } else if (percentDifference > 30) {
      return 'Content 2 significantly outperforms Content 1';
    } else if (percentDifference > 10) {
      return 'Content 2 moderately outperforms Content 1';
    } else if (percentDifference < -30) {
      return 'Content 1 significantly outperforms Content 2';
    } else {
      return 'Content 1 moderately outperforms Content 2';
    }
  }

  /**
   * Get velocity trends over time
   */
  analyzeVelocityTrends(contentArray) {
    if (!contentArray || contentArray.length === 0) {
      return {
        trend: 'unknown',
        average_velocity: 0,
        best_performer: null,
        worst_performer: null
      };
    }

    const velocities = contentArray.map(content => ({
      id: content.id,
      score: this.calculateVelocityScore(content),
      created_at: content.created_at || content.scraped_at
    }));

    // Calculate average
    const averageVelocity = velocities.reduce((sum, v) => sum + v.score, 0) / velocities.length;

    // Find best and worst performers
    const sorted = [...velocities].sort((a, b) => b.score - a.score);
    const bestPerformer = sorted[0];
    const worstPerformer = sorted[sorted.length - 1];

    // Determine trend (compare first half with second half)
    const midpoint = Math.floor(velocities.length / 2);
    const firstHalf = velocities.slice(0, midpoint);
    const secondHalf = velocities.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, v) => sum + v.score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, v) => sum + v.score, 0) / secondHalf.length;

    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'improving';
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'declining';
    }

    return {
      trend,
      average_velocity: averageVelocity,
      best_performer: bestPerformer,
      worst_performer: worstPerformer,
      first_half_average: firstHalfAvg,
      second_half_average: secondHalfAvg,
      total_analyzed: velocities.length
    };
  }

  /**
   * Get content recommendations based on velocity analysis
   */
  getContentRecommendations(contentArray) {
    const trends = this.analyzeVelocityTrends(contentArray);
    const recommendations = [];

    // Trend-based recommendations
    if (trends.trend === 'improving') {
      recommendations.push({
        type: 'positive',
        message: 'Content velocity is improving over time. Continue current strategy.'
      });
    } else if (trends.trend === 'declining') {
      recommendations.push({
        type: 'warning',
        message: 'Content velocity is declining. Consider refreshing content approach.'
      });
    }

    // Average velocity recommendation
    if (trends.average_velocity < this.thresholds.moderate) {
      recommendations.push({
        type: 'action',
        message: 'Average velocity is low. Focus on improving engagement quality.'
      });
    }

    // Best performer analysis
    if (trends.best_performer && trends.best_performer.score >= this.thresholds.trending) {
      recommendations.push({
        type: 'insight',
        message: `Content ID ${trends.best_performer.id} achieved trending velocity. Analyze for patterns.`
      });
    }

    return recommendations;
  }
}

module.exports = new VelocityScoringService();
