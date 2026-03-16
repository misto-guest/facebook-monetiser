/**
 * Facebook Publisher Service
 * Handles automatic posting to Facebook pages via Graph API
 */

class FacebookPublisher {
  constructor() {
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Get access token
   */
  getAccessToken() {
    return process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  }

  /**
   * Publish image post to Facebook
   */
  async publishImagePost(pageId, caption, imageUrl) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    }

    try {
      // Step 1: Upload photo
      const photoResponse = await fetch(`${this.baseUrl}/${pageId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: imageUrl,
          caption: caption,
          access_token: accessToken,
          published: true
        })
      });

      const photoData = await photoResponse.json();

      if (photoData.error) {
        throw new Error(photoData.error.message);
      }

      return {
        success: true,
        postId: photoData.id,
        postUrl: `https://www.facebook.com/${photoData.id}`,
        type: 'image'
      };
    } catch (error) {
      console.error('Facebook image post error:', error);
      throw error;
    }
  }

  /**
   * Publish text post to Facebook
   */
  async publishTextPost(pageId, message) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${pageId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          access_token: accessToken,
          published: true
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        postId: data.id,
        postUrl: `https://www.facebook.com/${data.id}`,
        type: 'text'
      };
    } catch (error) {
      console.error('Facebook text post error:', error);
      throw error;
    }
  }

  /**
   * Publish post with first comment
   */
  async publishPostWithComment(pageId, postType, content, firstComment) {
    // Publish main post
    let result;
    if (postType === 'image') {
      result = await this.publishImagePost(pageId, content.caption, content.imageUrl);
    } else {
      result = await this.publishTextPost(pageId, content.message);
    }

    // Add first comment if provided
    if (result.success && firstComment) {
      await this.addComment(result.postId, firstComment);
    }

    return result;
  }

  /**
   * Add comment to a post
   */
  async addComment(postId, comment) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: comment,
          access_token: accessToken
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('Error adding comment:', data.error.message);
        return null;
      }

      return {
        success: true,
        commentId: data.id
      };
    } catch (error) {
      console.error('Comment error:', error);
      return null;
    }
  }

  /**
   * Schedule post (note: Facebook doesn't have native scheduling via API, this tracks in our DB)
   */
  async schedulePost(postData, scheduledFor) {
    // Store in database with scheduled status
    // The cron job will handle actual publishing
    return {
      success: true,
      scheduled: true,
      scheduledFor: scheduledFor
    };
  }

  /**
   * Delete post
   */
  async deletePost(postId) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: accessToken
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        deleted: true
      };
    } catch (error) {
      console.error('Facebook delete error:', error);
      throw error;
    }
  }

  /**
   * Get page info
   */
  async getPageInfo(pageId) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${pageId}?fields=name,fan_count,picture&access_token=${accessToken}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        id: data.id,
        name: data.name,
        followerCount: data.fan_count,
        pictureUrl: data.picture?.data?.url
      };
    } catch (error) {
      console.error('Get page info error:', error);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return {
        success: false,
        error: 'No access token configured'
      };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/${this.apiVersion}/me?access_token=${accessToken}`);
      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: data.error.message
        };
      }

      return {
        success: true,
        pageId: data.id,
        pageName: data.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new FacebookPublisher();
