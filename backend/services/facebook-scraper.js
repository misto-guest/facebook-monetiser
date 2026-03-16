/**
 * Facebook Scraping Service using Unified Remote Browser API
 * Supports AdsPower, BAS, and Puppeteer providers
 * API Docs: http://95.217.224.154:3000
 */

const puppeteer = require('puppeteer-core');

class FacebookScraper {
  constructor(config = {}) {
    // Unified Remote Browser API (instead of direct AdsPower)
    this.apiUrl = config.apiUrl || process.env.BROWSER_API_URL || 'http://95.217.224.154:3000';
    this.apiKey = config.apiKey || process.env.BROWSER_API_KEY;
    this.provider = config.provider || process.env.BROWSER_PROVIDER || 'adspower';
    this.profileId = config.profileId || process.env.BROWSER_PROFILE_ID;
    this.headless = config.headless !== undefined ? config.headless : true;
  }

  /**
   * Start browser via Unified Remote Browser API
   * POST /browsers/start?x_api_key=KEY
   */
  async startBrowser() {
    if (!this.apiKey) {
      throw new Error('BROWSER_API_KEY not configured');
    }

    const startParams = new URLSearchParams({
      x_api_key: this.apiKey
    });

    const requestBody = {
      provider: this.provider,
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    };

    // Add profileId for AdsPower/BAS providers
    if (this.profileId && ['adspower', 'bas'].includes(this.provider)) {
      requestBody.profileId = this.profileId;
    }

    // Add proxy if configured
    if (process.env.PROXY_URL) {
      requestBody.proxy = process.env.PROXY_URL;
    }

    console.log(`Starting browser: ${this.provider} at ${this.apiUrl}`);
    console.log('API Key (first 4 chars):', this.apiKey ? this.apiKey.substring(0, 4) + '...' : 'undefined');

    const response = await fetch(`${this.apiUrl}/browsers/start?${startParams}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log('Browser API response:', JSON.stringify(data));

    if (!data.success) {
      throw new Error(data.error || 'Failed to start browser');
    }

    const { puppeteerUrl, browserId } = data.data;
    console.log('puppeteerUrl:', puppeteerUrl);
    console.log('Browser started, connecting...');

    // Add API key to WebSocket URL if not present
    let wsUrl = puppeteerUrl;
    if (!wsUrl.includes('api_key')) {
      const separator = wsUrl.includes('?') ? '&' : '?';
      wsUrl = `${wsUrl}${separator}x_api_key=${this.apiKey}`;
    }
    console.log('WS URL with auth:', wsUrl.substring(0, 50) + '...');

    // Connect to the browser
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      defaultViewport: null,
      headers: { 'Host': 'localhost' }
    });

    console.log('Connected to browser successfully');
    return { browser, browserId };
  }

  /**
   * Stop browser via Unified Remote Browser API
   * POST /browsers/stop?x_api_key=KEY
   */
  async stopBrowser(browserId) {
    if (!browserId || !this.apiKey) return;

    const stopParams = new URLSearchParams({
      x_api_key: this.apiKey
    });

    try {
      await fetch(`${this.apiUrl}/browsers/stop?${stopParams}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: this.provider,
          browserId
        })
      });
      console.log('Browser stopped');
    } catch (e) {
      console.error('Error stopping browser:', e.message);
    }
  }

  /**
   * Scrape Facebook Page posts using real browser
   * @param {string} pageUrl - URL of the Facebook page
   * @param {number} limit - Maximum posts to scrape
   * @param {number} days - Only get posts from last N days
   */
  async scrapePagePosts(pageUrl, limit = 10, days = 5) {
    let browser;
    let browserId;

    try {
      // Start browser
      ({ browser, browserId } = await this.startBrowser());

      // Wait for browser to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get pages and close existing ones
      try {
        const pages = await browser.pages();
        for (const page of pages) {
          await page.close().catch(() => {});
        }
      } catch (e) {
        console.log('Warning: Could not get/close pages:', e.message);
      }

      // Create new page with retry
      let page;
      for (let i = 0; i < 3; i++) {
        try {
          page = await browser.newPage();
          break;
        } catch (e) {
          console.log(`Failed to create page (attempt ${i+1}):`, e.message);
          if (i === 2) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      console.log(`Navigating to ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for posts to load
      await page.waitForSelector('div[aria-role="article"]', { timeout: 10000 }).catch(() => null);

      // Extract posts
      const posts = await page.evaluate((limit, days) => {
        const now = Date.now();
        const daysMs = days * 24 * 60 * 60 * 1000;
        const cutoff = now - daysMs;

        const postElements = document.querySelectorAll('div[aria-role="article"], div[data-pagelet="FeedUnit"]');
        const results = [];

        for (const post of postElements) {
          if (results.length >= limit) break;

          try {
            // Extract text content
            const textEl = post.querySelector('div[aria-label] span, div[data-ad-preview]');
            const text = textEl ? textEl.textContent.trim() : '';

            // Extract timestamp
            const timeEl = post.querySelector('a[href*="/groups/"][aria-label], a[href*="/pages/"][aria-label], abbr');
            const timestamp = timeEl ? timeEl.getAttribute('aria-label') || timeEl.textContent : '';

            // Extract post link
            const linkEl = post.querySelector('a[href*="/posts/"]');
            const link = linkEl ? 'https://www.facebook.com' + linkEl.getAttribute('href') : '';

            if (text || link) {
              results.push({
                text: text.substring(0, 500),
                link,
                timestamp,
                post_date: new Date().toISOString().split('T')[0]
              });
            }
          } catch (e) {
            // Skip malformed posts
          }
        }

        return results;
      }, limit, days);

      console.log(`Scraped ${posts.length} posts from ${pageUrl}`);
      return posts;

    } catch (error) {
      console.error('Scraping error:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        await this.stopBrowser(browserId);
      }
    }
  }

  /**
   * Scrape Facebook Group posts
   */
  async scrapeGroupPosts(groupUrl, limit = 10, days = 5) {
    return this.scrapePagePosts(groupUrl, limit, days);
  }
}

module.exports = FacebookScraper;
