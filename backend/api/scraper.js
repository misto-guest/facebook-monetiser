/**
 * Scraping API
 * Scrape content from Facebook pages and groups using Remote Browser API
 */

const express = require('express');
const router = express.Router();
const FacebookScraper = require('../services/facebook-scraper');

// Get scraper config from environment
const getScraperConfig = () => ({
  apiUrl: process.env.BROWSER_API_URL || 'http://95.217.224.154:3000',
  apiKey: process.env.BROWSER_API_KEY,
  provider: process.env.BROWSER_PROVIDER || 'adspower',
  profileId: process.env.BROWSER_PROFILE_ID,
  headless: process.env.BROWSER_HEADLESS !== 'false'
});

/**
 * Scrape Facebook page posts
 */
router.post('/facebook-page', async (req, res) => {
  const { page_url, limit = 10, days = 5 } = req.body;
  
  if (!page_url) {
    return res.status(400).json({ error: 'page_url is required' });
  }

  const config = getScraperConfig();
  
  // Check if Browser API is configured
  if (!config.apiKey) {
    return res.json({
      success: false,
      error: 'Browser API not configured',
      message: 'Please configure BROWSER_API_KEY to enable scraping',
      page_url,
      env_needed: ['BROWSER_API_KEY']
    });
  }

  const scraper = new FacebookScraper(config);

  try {
    console.log(`Starting scrape of ${page_url}, limit: ${limit}, days: ${days}`);
    const posts = await scraper.scrapePagePosts(page_url, limit, days);
    
    res.json({
      success: true,
      message: 'Scraping completed',
      page_url,
      scraped_count: posts.length,
      posts: posts
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      page_url
    });
  }
});

/**
 * Scrape Facebook group posts
 */
router.post('/facebook-group', async (req, res) => {
  const { group_url, limit = 10, days = 5 } = req.body;
  
  if (!group_url) {
    return res.status(400).json({ error: 'group_url is required' });
  }

  const config = getScraperConfig();
  
  if (!config.apiKey) {
    return res.json({
      success: false,
      error: 'Browser API not configured',
      message: 'Please configure BROWSER_API_KEY to enable scraping',
      group_url,
      env_needed: ['BROWSER_API_KEY']
    });
  }

  const scraper = new FacebookScraper(config);

  try {
    console.log(`Starting scrape of ${group_url}, limit: ${limit}, days: ${days}`);
    const posts = await scraper.scrapeGroupPosts(group_url, limit, days);
    
    res.json({
      success: true,
      message: 'Scraping completed',
      group_url,
      scraped_count: posts.length,
      posts: posts
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      group_url
    });
  }
});

/**
 * Get scraping status
 */
router.get('/status', (req, res) => {
  const config = getScraperConfig();
  
  res.json({
    configured: !!config.apiKey,
    browserApi: {
      url: config.apiUrl,
      provider: config.provider,
      profileId: config.profileId ? 'configured' : 'not set',
      headless: config.headless
    },
    scrapers: [
      {
        name: 'facebook_page',
        status: config.apiKey ? 'ready' : 'not_configured',
        last_run: null,
        total_scraped: 0
      },
      {
        name: 'facebook_group',
        status: config.apiKey ? 'ready' : 'not_configured',
        last_run: null,
        total_scraped: 0
      }
    ]
  });
});

/**
 * Test Browser API connection
 */
router.get('/test-connection', async (req, res) => {
  const config = getScraperConfig();
  
  if (!config.apiKey) {
    return res.json({
      success: false,
      message: 'BROWSER_API_KEY not configured',
      required: ['BROWSER_API_KEY']
    });
  }

  try {
    // Mask the API key for logging
    const maskedKey = config.apiKey.substring(0, 4) + '...' + config.apiKey.substring(config.apiKey.length - 4);
    console.log('Testing connection with key:', maskedKey);
    
    const params = new URLSearchParams({ x_api_key: config.apiKey });
    const response = await fetch(`${config.apiUrl}/browsers/status?${params}`);
    const data = await response.json();
    
    res.json({
      success: true,
      message: 'Browser API connected',
      maskedKey: maskedKey,
      providers: data
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Cannot connect to Browser API',
      error: error.message
    });
  }
});

/**
 * Add source and scrape in one step
 */
router.post('/add-and-scrape', async (req, res) => {
  const { type, url, name } = req.body;
  
  if (!url || !type) {
    return res.status(400).json({ error: 'url and type are required' });
  }

  const isPage = type === 'facebook_page';
  const sourceType = isPage ? 'competitor_post' : 'facebook_group_post';
  const authorLabel = isPage ? 'Page' : 'Group';

  const config = getScraperConfig();
  let scrapedPosts = [];
  
  if (config.apiKey) {
    try {
      const scraper = new FacebookScraper(config);
      if (isPage) {
        scrapedPosts = await scraper.scrapePagePosts(url, 10);
      } else {
        scrapedPosts = await scraper.scrapeGroupPosts(url, 10);
      }
    } catch (e) {
      console.error('Scraping error:', e);
    }
  }

  res.json({
    success: true,
    message: scrapedPosts.length > 0 
      ? `Scraped ${scrapedPosts.length} posts` 
      : 'Source added (scraping not configured)',
    source: {
      source_type: sourceType,
      title: name || `Scraped ${type}`,
      url: url,
      author: authorLabel,
      platform: 'facebook'
    },
    scraping_result: {
      scraped_count: scrapedPosts.length,
      posts: scrapedPosts
    }
  });
});

/**
 * Receive pre-scraped posts from local scraper
 * Used when running scraper locally (mac-mini) and pushing to Fly
 */
router.post('/push-posts', async (req, res) => {
  const { page_name, page_url, posts } = req.body;
  
  if (!page_url || !posts || !Array.isArray(posts)) {
    return res.status(400).json({ error: 'page_url and posts array required' });
  }

  console.log(`Received ${posts.length} posts from local scraper for ${page_name}`);
  
  // In a full implementation, you'd save these to the database
  // For now, just acknowledge receipt
  res.json({
    success: true,
    message: `Received ${posts.length} posts for ${page_name}`,
    page_name,
    page_url,
    posts_received: posts.length
  });
});

module.exports = router;
