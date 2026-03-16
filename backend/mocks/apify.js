/**
 * Apify Scraper Mock
 * Simulates Apify Facebook/Instagram scraper responses
 * TODO: Replace with real Apify integration in Phase 2
 */

class ApifyMock {
  /**
   * Mock scraping Facebook page posts
   */
  async scrapeFacebookPosts(pageId, options = {}) {
    const { maxPosts = 20 } = options;

    // Simulate API delay
    await this._delay(500);

    // Generate mock posts
    const posts = Array.from({ length: Math.min(maxPosts, 10) }, (_, i) => ({
      id: `post_${Date.now()}_${i}`,
      url: `https://facebook.com/${pageId}/posts/${i}`,
      text: this._generateMockCaption(),
      likes: Math.floor(Math.random() * 5000) + 100,
      shares: Math.floor(Math.random() * 500) + 10,
      comments: Math.floor(Math.random() * 200) + 5,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: ['photo', 'video', 'text'][Math.floor(Math.random() * 3)]
    }));

    return {
      success: true,
      posts,
      scraped_at: new Date().toISOString(),
      source: 'mock_apify'
    };
  }

  /**
   * Mock scraping Instagram posts
   */
  async scrapeInstagramPosts(username, options = {}) {
    const { maxPosts = 20 } = options;

    await this._delay(500);

    const posts = Array.from({ length: Math.min(maxPosts, 10) }, (_, i) => ({
      id: `ig_post_${Date.now()}_${i}`,
      url: `https://instagram.com/p/${this._generateId()}/`,
      caption: this._generateMockCaption(),
      likes: Math.floor(Math.random() * 10000) + 500,
      comments: Math.floor(Math.random() * 500) + 20,
      video_views: Math.random() > 0.5 ? Math.floor(Math.random() * 50000) + 1000 : null,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: Math.random() > 0.3 ? 'image' : 'video'
    }));

    return {
      success: true,
      posts,
      scraped_at: new Date().toISOString(),
      source: 'mock_apify'
    };
  }

  /**
   * Mock scraping Twitter/X tweets
   */
  async scrapeTweets(handle, options = {}) {
    const { maxTweets = 50 } = options;

    await this._delay(500);

    const tweets = Array.from({ length: Math.min(maxTweets, 20) }, (_, i) => ({
      id: this._generateId(),
      url: `https://twitter.com/${handle}/status/${this._generateId()}`,
      text: this._generateMockTweet(),
      likes: Math.floor(Math.random() * 1000) + 10,
      retweets: Math.floor(Math.random() * 200) + 5,
      replies: Math.floor(Math.random() * 100) + 1,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));

    return {
      success: true,
      tweets,
      scraped_at: new Date().toISOString(),
      source: 'mock_apify'
    };
  }

  /**
   * Mock scraping competitor insights
   */
  async scrapeCompetitorInsights(pageIds) {
    await this._delay(800);

    const insights = pageIds.map(pageId => ({
      page_id: pageId,
      follower_count: Math.floor(Math.random() * 100000) + 10000,
      top_posts_count: 5,
      avg_engagement_rate: (Math.random() * 0.05 + 0.01).toFixed(3),
      last_updated: new Date().toISOString()
    }));

    return {
      success: true,
      insights,
      scraped_at: new Date().toISOString(),
      source: 'mock_apify'
    };
  }

  /**
   * Generate mock caption
   */
  _generateMockCaption() {
    const templates = [
      "The secret to success? Consistency. Here's what I learned:",
      "Most people get this wrong. Let me show you the right way:",
      "POV: You finally figured it out",
      "Stop making these 3 mistakes:",
      "Here's the strategy that changed everything for me:",
      "The truth nobody tells you about this:",
      "Why I started and why I'm not stopping:",
      "A year from now, you'll wish you started today:"
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template + " " + this._generateHashtags();
  }

  /**
   * Generate mock tweet
   */
  _generateMockTweet() {
    const templates = [
      "Hot take: most advice on this topic is wrong. Here's why:",
      "Unpopular opinion but I don't care who disagrees:",
      "If you're not doing this, you're leaving money on the table:",
      "The gap between where you are and where you want to be is called:",
      "Nobody talks about this but it's important:",
      "3 things I wish I knew when I started:",
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template + " #growth #mindset #business";
  }

  /**
   * Generate hashtags
   */
  _generateHashtags() {
    const hashtagSets = [
      "#growth #mindset #business #entrepreneur",
      "#marketing #socialmedia #digitalmarketing #content",
      "#success #motivation #inspiration #goals",
      "#tips #learn #education #knowledge",
      "#strategy #tactics #results #performance"
    ];
    return hashtagSets[Math.floor(Math.random() * hashtagSets.length)];
  }

  /**
   * Generate random ID
   */
  _generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Simulate API delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ApifyMock();
