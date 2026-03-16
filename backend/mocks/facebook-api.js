/**
 * Facebook Graph API Mock
 * Simulates Facebook API responses for posting and management
 * TODO: Replace with real Facebook Graph API integration in Phase 2
 */

class FacebookApiMock {
  constructor() {
    this.mockPosts = new Map();
    this.mockPages = new Map();
  }

  /**
   * Mock posting to Facebook page
   */
  async postToPage(pageId, postData) {
    // Simulate API delay
    await this._delay(1000);

    const mockPostId = `${pageId}_${Date.now()}`;

    // Store mock post
    this.mockPosts.set(mockPostId, {
      id: mockPostId,
      page_id: pageId,
      ...postData,
      created_time: new Date().toISOString(),
      status: 'published'
    });

    return {
      success: true,
      post_id: mockPostId,
      url: `https://facebook.com/${pageId}/posts/${mockPostId}`,
      message: 'Post published successfully (MOCK)',
      posted_at: new Date().toISOString()
    };
  }

  /**
   * Mock scheduling a post
   */
  async schedulePost(pageId, postData, scheduledTime) {
    await this._delay(500);

    const mockPostId = `${pageId}_scheduled_${Date.now()}`;

    return {
      success: true,
      post_id: mockPostId,
      scheduled_for: scheduledTime,
      status: 'scheduled',
      message: 'Post scheduled successfully (MOCK)'
    };
  }

  /**
   * Mock getting page insights
   */
  async getPageInsights(pageId, metrics, dateRange) {
    await this._delay(800);

    const insights = {
      page_impressions: Math.floor(Math.random() * 50000) + 10000,
      page_reach: Math.floor(Math.random() * 30000) + 5000,
      page_engaged_users: Math.floor(Math.random() * 5000) + 500,
      page_post_engagements: Math.floor(Math.random() * 10000) + 1000,
      page_video_views: Math.floor(Math.random() * 20000) + 1000,
      date_range: dateRange || 'last_30_days'
    };

    return {
      success: true,
      data: insights,
      retrieved_at: new Date().toISOString(),
      source: 'mock_facebook_api'
    };
  }

  /**
   * Mock getting post insights
   */
  async getPostInsights(postId) {
    await this._delay(500);

    const insights = {
      post_impressions: Math.floor(Math.random() * 10000) + 500,
      post_reach: Math.floor(Math.random() * 5000) + 200,
      post_engaged_users: Math.floor(Math.random() * 500) + 50,
      post_reactions_like: Math.floor(Math.random() * 200) + 20,
      post_reactions_love: Math.floor(Math.random() * 50) + 5,
      post_reactions_wow: Math.floor(Math.random() * 20) + 2,
      post_reactions_haha: Math.floor(Math.random() * 30) + 3,
      post_reactions_sorry: Math.floor(Math.random() * 10) + 1,
      post_reactions_angry: Math.floor(Math.random() * 5) + 0,
      post_comments: Math.floor(Math.random() * 50) + 5,
      post_shares: Math.floor(Math.random() * 30) + 2,
      post_clicks: Math.floor(Math.random() * 200) + 20
    };

    // Calculate derived metrics
    insights.engagement_rate = (insights.post_engaged_users / insights.post_reach).toFixed(4);
    insights.ctr = (insights.post_clicks / insights.post_impressions).toFixed(4);

    return {
      success: true,
      post_id: postId,
      data: insights,
      retrieved_at: new Date().toISOString(),
      source: 'mock_facebook_api'
    };
  }

  /**
   * Mock getting page information
   */
  async getPageInfo(pageId) {
    await this._delay(300);

    const pageInfo = {
      id: pageId,
      name: `Mock Page ${pageId}`,
      category: 'Business',
      about: 'This is a mock Facebook page for testing',
      cover: {
        source: 'https://picsum.photos/seed/cover/851/315'
      },
      picture: {
        data: {
          url: 'https://picsum.photos/seed/avatar/200/200'
        }
      },
      followers_count: Math.floor(Math.random() * 50000) + 5000,
      engagement_rate: (Math.random() * 0.05 + 0.01).toFixed(3)
    };

    return {
      success: true,
      data: pageInfo,
      source: 'mock_facebook_api'
    };
  }

  /**
   * Mock listing pages for an account
   */
  async listPages(accountId) {
    await this._delay(400);

    const pages = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
      id: `mock_page_${i + 1}`,
      name: `Mock Business Page ${i + 1}`,
      category: ['Business', 'Brand', 'Company'][i % 3],
      access_token: `mock_token_${i + 1}`,
      tasks: ['MANAGE', 'MODERATE', 'CREATE_CONTENT', 'ADVERTISE'],
      followers_count: Math.floor(Math.random() * 50000) + 5000
    }));

    return {
      success: true,
      data: pages,
      total: pages.length,
      source: 'mock_facebook_api'
    };
  }

  /**
   * Mock uploading media
   */
  async uploadMedia(pageId, mediaUrl, mediaType) {
    await this._delay(2000); // Uploads take longer

    const mockMediaId = `${pageId}_media_${Date.now()}`;

    return {
      success: true,
      media_id: mockMediaId,
      media_type: mediaType,
      url: `https://scontent.mock.fbcdn.net/${mockMediaId}`,
      message: 'Media uploaded successfully (MOCK)'
    };
  }

  /**
   * Mock deleting a post
   */
  async deletePost(postId) {
    await this._delay(500);

    this.mockPosts.delete(postId);

    return {
      success: true,
      post_id: postId,
      message: 'Post deleted successfully (MOCK)'
    };
  }

  /**
   * Simulate API delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get mock post by ID (for testing)
   */
  getMockPost(postId) {
    return this.mockPosts.get(postId);
  }

  /**
   * Clear all mock data (for testing)
   */
  clearMockData() {
    this.mockPosts.clear();
    this.mockPages.clear();
  }
}

module.exports = new FacebookApiMock();
