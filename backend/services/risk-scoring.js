/**
 * Enhanced Risk Scoring Service (SMV Compliant)
 * Calculates risk scores for content based on various factors
 * - Enhanced political keyword detection
 * - Enhanced sensitive topic detection
 * - Enhanced non-US context detection
 * - Improved originality scoring
 */

const RISK_KEYWORDS = {
  // Enhanced political keywords
  political: [
    'election', 'politician', 'president', 'congress', 'senate',
    'democrat', 'republican', 'vote', 'ballot', 'campaign',
    'political', 'government', 'policy', 'legislation', 'congressional',
    'senator', 'representative', 'candidate', 'voter', 'polling',
    'administration', ' partisan', 'ideology', 'lobby', 'advocacy',
    'referendum', 'primary', 'caucus', 'inauguration', 'impeachment'
  ],

  // Enhanced sensitive topics
  sensitive: [
    'abortion', 'religion', 'race', 'war', 'terrorism',
    'protest', 'controversy', 'scandal', 'discrimination',
    'gun control', 'immigration', 'healthcare debate',
    'gender identity', 'sexual orientation', 'police brutality',
    'climate change debate', 'conspiracy theory', 'hate speech',
    'extremism', 'radical', 'supremacist', 'nationalist',
    'civil rights', 'human rights violation', 'genocide', 'ethnic'
  ],

  // Enhanced non-US indicators
  non_us: [
    // Country/region specific
    'brexit', 'eu', 'euro', 'european union', 'parliament', 'prime minister',
    'nhs', 'rupee', 'yuan', 'rubel', 'ruble', 'australian dollar', 'cad only',
    'uk only', 'australia only', 'canada only', 'india only', 'european only',
    'british', 'french', 'german', 'spanish', 'italian',

    // Non-US locations
    'london', 'paris', 'berlin', 'tokyo', 'sydney', 'toronto',
    'dubai', 'singapore', 'mumbai', 'amsterdam', 'rome',

    // Non-US political entities
    'eu parliament', 'commons mps', ' Bundestag', 'diet', 'knesset',

    // Non-US cultural references
    'cricket match', 'football premier league', 'europes', 'asias', 'apac',
    'emea', 'latam', 'mena', 'asean', 'commonwealth',

    // Non-US currencies
    '£', '€', '₹', '₽', '¥', 'a$', 'c$', 's$', 'hk$', 's.a.r',

    // Non-US spellings/phrases
    'colour', 'favour', 'centre', 'theatre', 'organisation',
    ' judgement', 'licence', 'defence', 'grey', 'tyre'
  ],

  // Spam indicators
  spam: [
    'buy now', 'click here', 'limited time', 'act now',
    'free money', 'get rich', 'make money fast', 'clickbait',
    'you won', 'claim now', 'urgent', 'expire soon',
    'once in a lifetime', 'exclusive deal', 'risk-free'
  ]
};

class RiskScorer {
  constructor() {
    this.automationLimits = null;
  }

  /**
   * Calculate overall risk score (0-1, where 1 is highest risk)
   */
  calculateRiskScore(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    const lowerText = text.toLowerCase();
    let totalRisk = 0;

    // Political content risk (30% weight)
    const politicalRisk = this._checkKeywordRisk(lowerText, RISK_KEYWORDS.political);
    totalRisk += politicalRisk * 0.3;

    // Sensitive topic risk (40% weight)
    const sensitiveRisk = this._checkKeywordRisk(lowerText, RISK_KEYWORDS.sensitive);
    totalRisk += sensitiveRisk * 0.4;

    // Non-US context risk (50% weight - very high risk)
    const nonUsRisk = this._checkNonUSContext(lowerText, text);
    totalRisk += nonUsRisk * 0.5;

    // Spam indicators (20% weight)
    const spamRisk = this._checkKeywordRisk(lowerText, RISK_KEYWORDS.spam);
    totalRisk += spamRisk * 0.2;

    // Check for excessive caps (shouting)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) {
      totalRisk += 0.15;
    } else if (capsRatio > 0.3) {
      totalRisk += 0.08;
    }

    // Check for excessive emojis
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 5) {
      totalRisk += 0.1;
    } else if (emojiCount > 3) {
      totalRisk += 0.05;
    }

    // Check for excessive punctuation (!!!, ???)
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    if (exclamationCount > 3 || questionCount > 3) {
      totalRisk += 0.08;
    }

    // Check for URL shorteners (often spammy)
    if (text.includes('bit.ly') || text.includes('tinyurl') || text.includes('goo.gl')) {
      totalRisk += 0.15;
    }

    // Normalize to 0-1 range
    return Math.min(totalRisk, 1);
  }

  /**
   * Check for specific keyword categories
   */
  _checkKeywordRisk(text, keywords) {
    let foundCount = 0;
    const found = [];

    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        foundCount++;
        found.push(keyword);
      }
    });

    // Escalating risk based on count
    // 1 keyword = 0.2, 2 = 0.4, 3 = 0.6, 4+ = 0.8+
    const riskScore = Math.min(foundCount * 0.25, 1);

    return riskScore;
  }

  /**
   * Enhanced non-US context detection
   */
  _checkNonUSContext(lowerText, originalText) {
    let riskScore = 0;

    // Check for currency symbols
    const currencySymbols = ['£', '€', '₹', '₽', '¥'];
    if (currencySymbols.some(symbol => originalText.includes(symbol))) {
      riskScore += 0.4;
    }

    // Check for non-US spellings (common British spellings)
    const britishSpellings = ['colour', 'favour', 'centre', 'theatre', 'organisation', 'licence', 'defence'];
    const spellingCount = britishSpellings.filter(word => lowerText.includes(word)).length;
    if (spellingCount > 0) {
      riskScore += spellingCount * 0.15;
    }

    // Check for region-specific phrases
    const regionPhrases = ['uk only', 'eu only', 'europe only', 'asia only', 'aus only', 'canada only'];
    if (regionPhrases.some(phrase => lowerText.includes(phrase))) {
      riskScore += 0.5;
    }

    // Check for non-US city mentions (major cities)
    const nonUSCities = ['london', 'paris', 'berlin', 'tokyo', 'sydney', 'toronto', 'dubai', 'singapore'];
    const cityCount = nonUSCities.filter(city => lowerText.includes(city)).length;
    if (cityCount > 0) {
      riskScore += cityCount * 0.1;
    }

    return Math.min(riskScore, 1);
  }

  /**
   * Calculate originality score (0-1, where 1 is most original)
   */
  calculateOriginalityScore(text, existingPosts = []) {
    if (!text || typeof text !== 'string') {
      return 0.5;
    }

    let originalityScore = 0.8; // Start with decent score

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = new Set(words);

    // Lexical diversity (unique words / total words)
    const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
    originalityScore += (lexicalDiversity - 0.5) * 0.2;

    // Penalty for common clichés
    const cliches = [
      'game changer', 'think outside the box', 'at the end of the day',
      'paradigm shift', 'synergy', 'move the needle', 'deep dive',
      'circle back', 'touch base', 'low hanging fruit', 'win-win'
    ];
    const clicheCount = cliches.filter(cliche => lowerText.includes(cliche)).length;
    originalityScore -= clicheCount * 0.1;

    // Penalty for overused marketing phrases
    const marketingPhrases = [
      'don\'t miss out', 'limited spots', 'act now', 'while supplies last',
      'exclusive offer', 'once in a lifetime', 'amazing deal'
    ];
    const marketingCount = marketingPhrases.filter(phrase => lowerText.includes(phrase)).length;
    originalityScore -= marketingCount * 0.08;

    // Boost for unique combinations (uncommon word pairs)
    const uncommonPairs = this._countUncommonPairs(words);
    originalityScore += uncommonPairs * 0.02;

    // Compare with existing posts if provided
    if (existingPosts.length > 0) {
      const similarityScore = this._calculateSimilarity(lowerText, existingPosts);
      originalityScore -= similarityScore * 0.3;
    }

    // Length factor (very short or very long content less original)
    if (text.length < 30) {
      originalityScore -= 0.15;
    } else if (text.length > 500) {
      originalityScore -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, originalityScore));
  }

  /**
   * Count uncommon word pairs (heuristic for originality)
   */
  _countUncommonPairs(words) {
    const commonPairs = [
      ['thank', 'you'], ['follow', 'us'], ['click', 'link'],
      ['link', 'bio'], ['new', 'video'], ['check', 'out']
    ];

    let uncommonCount = 0;
    for (let i = 0; i < words.length - 1; i++) {
      const pair = [words[i], words[i + 1]];
      const isCommon = commonPairs.some(common =>
        common[0] === pair[0] && common[1] === pair[1]
      );
      if (!isCommon) {
        uncommonCount++;
      }
    }

    return uncommonCount;
  }

  /**
   * Calculate similarity with existing posts
   */
  _calculateSimilarity(text, existingPosts) {
    let maxSimilarity = 0;

    existingPosts.forEach(post => {
      if (post.caption) {
        const postLower = post.caption.toLowerCase();
        const intersection = this._getWordIntersection(text.split(/\s+/), postLower.split(/\s+/));
        const union = new Set([...text.split(/\s+/), ...postLower.split(/\s+/)]);

        const jaccard = intersection.size / union.size;
        maxSimilarity = Math.max(maxSimilarity, jaccard);
      }
    });

    return maxSimilarity;
  }

  /**
   * Get word intersection for similarity calculation
   */
  _getWordIntersection(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set();

    set1.forEach(word => {
      if (set2.has(word)) {
        intersection.add(word);
      }
    });

    return intersection;
  }

  /**
   * Get detailed risk flags for content
   */
  getRiskFlags(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const lowerText = text.toLowerCase();
    const flags = [];

    // Check each category
    Object.keys(RISK_KEYWORDS).forEach(category => {
      const found = RISK_KEYWORDS[category].filter(keyword =>
        lowerText.includes(keyword.toLowerCase())
      );

      if (found.length > 0) {
        flags.push({
          category,
          keywords_found: found,
          risk_level: Math.min(found.length * 0.25, 1)
        });
      }
    });

    // Check caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) {
      flags.push({
        category: 'formatting',
        issue: 'excessive_caps',
        risk_level: 0.15,
        detail: `${Math.round(capsRatio * 100)}% uppercase`
      });
    }

    // Check emojis
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 5) {
      flags.push({
        category: 'formatting',
        issue: 'excessive_emojis',
        risk_level: 0.1,
        detail: `${emojiCount} emojis`
      });
    }

    // Check punctuation
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      flags.push({
        category: 'formatting',
        issue: 'excessive_punctuation',
        risk_level: 0.08,
        detail: `${exclamationCount} exclamation marks`
      });
    }

    // Check URL shorteners
    if (text.includes('bit.ly') || text.includes('tinyurl') || text.includes('goo.gl')) {
      flags.push({
        category: 'spam',
        issue: 'url_shortener',
        risk_level: 0.15,
        detail: 'URL shortener detected'
      });
    }

    return flags;
  }

  /**
   * Check if content requires manual approval
   */
  requiresManualApproval(text, threshold = 0.5) {
    const riskScore = this.calculateRiskScore(text);
    return riskScore >= threshold;
  }

  /**
   * Get approval recommendation
   */
  getApprovalRecommendation(text, existingPosts = []) {
    const riskScore = this.calculateRiskScore(text);
    const originalityScore = this.calculateOriginalityScore(text, existingPosts);
    const flags = this.getRiskFlags(text);

    // Combine risk and originality for final decision
    const combinedScore = riskScore - (originalityScore * 0.2);

    if (combinedScore < 0.25 && originalityScore > 0.4) {
      return {
        status: 'auto_approve',
        confidence: 'high',
        risk_score: riskScore,
        originality_score: originalityScore,
        reason: 'Low risk, original content'
      };
    } else if (combinedScore < 0.5) {
      return {
        status: 'manual_review',
        confidence: 'medium',
        risk_score: riskScore,
        originality_score: originalityScore,
        reason: 'Moderate risk - manual review recommended',
        flags: flags.filter(f => f.risk_level > 0.2)
      };
    } else {
      return {
        status: 'manual_approval_required',
        confidence: 'high',
        risk_score: riskScore,
        originality_score: originalityScore,
        reason: 'High risk content - manual approval required',
        flags
      };
    }
  }

  /**
   * Batch score multiple posts
   */
  batchScore(posts) {
    return posts.map(post => ({
      post_id: post.id,
      risk_score: this.calculateRiskScore(post.caption || ''),
      originality_score: this.calculateOriginalityScore(post.caption || '', []),
      flags: this.getRiskFlags(post.caption || ''),
      recommendation: this.getApprovalRecommendation(post.caption || '', [])
    }));
  }
}

module.exports = new RiskScorer();
