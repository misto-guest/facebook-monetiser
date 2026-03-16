/**
 * Firecrawl Service
 * Web scraping for competitor research and content extraction
 * Respects rate limits and focuses on text content
 */

class FirecrawlService {
  constructor() {
    this.baseUrl = 'https://api.firecrawl.dev/v1';
    this.apiKey = process.env.FIRECRAWL_API_KEY || null;
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequest = 0;
  }

  /**
   * Rate limiting helper
   */
  async _respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }

  /**
   * Scrape a single URL for content
   */
  async scrapeUrl(url, options = {}) {
    if (!this.apiKey) {
      return this._mockScrape(url, options);
    }

    await this._respectRateLimit();

    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: options.onlyMainContent !== false,
          includeTags: options.includeTags || [],
          excludeTags: options.excludeTags || ['nav', 'footer', 'header'],
          waitFor: options.waitFor || 0,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        url,
        title: data.metadata?.title || '',
        content: data.markdown || data.content || '',
        html: data.html || '',
        images: data.images || [],
        links: data.links || [],
        metadata: data.metadata || {},
        success: true
      };
    } catch (error) {
      console.error('Firecrawl scrape error:', error);
      return {
        url,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Batch scrape multiple URLs
   */
  async batchScrape(urls, options = {}) {
    const results = [];

    for (const url of urls) {
      const result = await this.scrapeUrl(url, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Crawl a website starting from a URL
   */
  async crawl(startUrl, options = {}) {
    if (!this.apiKey) {
      return this._mockCrawl(startUrl, options);
    }

    await this._respectRateLimit();

    try {
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url: startUrl,
          limit: options.limit || 10,
          maxDepth: options.maxDepth || 1,
          allowBackwardCrawling: false,
          includeExternalLinks: false,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        startUrl,
        crawlId: data.id,
        total_pages: data.totalPages || 0,
        results: data.data || [],
        success: true
      };
    } catch (error) {
      console.error('Firecrawl crawl error:', error);
      return {
        startUrl,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Extract competitor insights from scraped content
   */
  extractInsights(scrapedData) {
    if (!scrapedData.success || !scrapedData.content) {
      return {
        topics: [],
        engagement_signals: [],
        content_types: [],
        hashtags: []
      };
    }

    const content = scrapedData.content;
    const insights = {
      topics: this._extractTopics(content),
      engagement_signals: this._detectEngagementSignals(content),
      content_types: this._detectContentTypes(content),
      hashtags: this._extractHashtags(content),
      word_count: content.split(/\s+/).length,
      media_count: scrapedData.images?.length || 0
    };

    return insights;
  }

  /**
   * Extract trending topics from content
   */
  _extractTopics(content) {
    const nicheKeywords = {
      '90s nostalgia': ['90s', 'nostalgia', 'throwback', 'vintage', 'retro', 'childhood', 'memories', 'decade'],
      'political': ['election', 'government', 'policy', 'political', 'vote', 'congress', 'senate', 'president'],
      'emotional': ['motivation', 'inspiration', 'emotional', 'feelings', 'support', 'mental health', 'hope']
    };

    const detectedTopics = [];
    const lowerContent = content.toLowerCase();

    for (const [topic, keywords] of Object.entries(nicheKeywords)) {
      const matchCount = keywords.filter(keyword => lowerContent.includes(keyword)).length;
      if (matchCount >= 2) {
        detectedTopics.push({ topic, match_count: matchCount });
      }
    }

    return detectedTopics.sort((a, b) => b.match_count - a.match_count);
  }

  /**
   * Detect engagement signals
   */
  _detectEngagementSignals(content) {
    const signals = [];

    // Question format (encourages comments)
    if (content.includes('?')) {
      signals.push({ type: 'question', text: 'Asks audience question' });
    }

    // Call to action
    const ctaPhrases = ['link in bio', 'follow for more', 'subscribe', 'comment below', 'share this'];
    if (ctaPhrases.some(phrase => content.toLowerCase().includes(phrase))) {
      signals.push({ type: 'cta', text: 'Includes call to action' });
    }

    // Emoji usage
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 3) {
      signals.push({ type: 'emoji_heavy', text: `${emojiCount} emojis used` });
    }

    // Hashtag density
    const hashtagCount = (content.match(/#/g) || []).length;
    if (hashtagCount > 5) {
      signals.push({ type: 'hashtag_heavy', text: `${hashtagCount} hashtags used` });
    }

    return signals;
  }

  /**
   * Detect content types
   */
  _detectContentTypes(content) {
    const types = [];

    // Image references
    if (content.includes('![') || content.includes('<img')) {
      types.push('image');
    }

    // Video references
    if (content.includes('watch?v=') || content.includes('embed')) {
      types.push('video');
    }

    // List format
    if (content.includes('1.') || content.includes('* ') || content.includes('- ')) {
      types.push('list');
    }

    // Storytelling
    const storytellingWords = ['remember', 'story', 'told', 'happened', 'experience', 'journey'];
    if (storytellingWords.some(word => content.toLowerCase().includes(word))) {
      types.push('story');
    }

    return types;
  }

  /**
   * Extract hashtags
   */
  _extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = [];
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      matches.push(match[1]);
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Mock scrape for development
   */
  _mockScrape(url, options) {
    return {
      url,
      title: 'Mock Content from ' + new URL(url).hostname,
      content: `# Sample Content\n\nThis is mock scraped content from ${url}.\n\nEngaging hook about 90s nostalgia or emotional content.\n\nKey points:\n- Point 1\n- Point 2\n- Point 3\n\nRemember to like and follow! #nostalgia #throwback`,
      html: '',
      images: ['https://picsum.photos/800/600?random=1'],
      links: [],
      metadata: { author: 'Mock Author', date: new Date().toISOString() },
      success: true
    };
  }

  /**
   * Mock crawl for development
   */
  _mockCrawl(startUrl, options) {
    return {
      startUrl,
      crawlId: 'mock-crawl-' + Date.now(),
      total_pages: 5,
      results: [
        {
          url: startUrl,
          content: 'Main page content'
        },
        {
          url: startUrl + '/about',
          content: 'About page content'
        },
        {
          url: startUrl + '/blog',
          content: 'Blog page content'
        }
      ],
      success: true
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.apiKey) {
      return { status: 'mock_mode', message: 'Using mock responses (no API key configured)' };
    }

    try {
      await this._respectRateLimit();
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return { status: 'ok', api_reachable: response.ok };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new FirecrawlService();
