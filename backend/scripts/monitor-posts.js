#!/usr/bin/env node

/**
 * Post Monitoring Script
 * Tracks post counts and engagement metrics from Facebook pages
 * Run via cron: 0 */6 * * * cd /app && node backend/scripts/monitor-posts.js >> logs/automation.log 2>&1
 */

const path = require('path');
const Database = require('better-sqlite3');

// Paths
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../database/facebook-monetiser.db');
const LOG_FILE = path.join(__dirname, '../../logs/automation.log');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/**
 * Logger
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  console.log(logMessage.trim());

  // Append to log file
  const fs = require('fs');
  const logsDir = path.dirname(LOG_FILE);

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Get all tracked Facebook pages
 */
function getTrackedPages() {
  const stmt = db.prepare(`
    SELECT * FROM facebook_pages
    WHERE is_tracking = 1
    ORDER BY page_name
  `);

  return stmt.all();
}

/**
 * Fetch recent posts from Facebook Graph API
 */
async function fetchRecentPosts(page) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    log('FACEBOOK_PAGE_ACCESS_TOKEN not configured. Using mock data.', 'WARN');
    return mockRecentPosts(page);
  }

  if (!page.page_id) {
    log(`No page_id for ${page.page_name}. Skipping.`, 'WARN');
    return [];
  }

  try {
    // Get posts from last 7 days
    const url = `https://graph.facebook.com/v18.0/${page.page_id}/posts?` +
      `fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&` +
      `limit=25&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const posts = data.data || [];
    log(`✅ Fetched ${posts.length} posts for ${page.page_name}`, 'INFO');

    return posts;
  } catch (error) {
    log(`Error fetching posts for ${page.page_name}: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Mock recent posts (for development/testing)
 */
function mockRecentPosts(page) {
  const postCount = Math.floor(Math.random() * 10) + 5;
  const posts = [];

  for (let i = 0; i < postCount; i++) {
    posts.push({
      id: `mock_${page.page_id}_${Date.now()}_${i}`,
      message: `Mock post ${i + 1} for ${page.page_name}`,
      created_time: new Date(Date.now() - i * 3600000).toISOString(),
      likes: { summary: { total_count: Math.floor(Math.random() * 1000) + 50 } },
      comments: { summary: { total_count: Math.floor(Math.random() * 100) + 5 } },
      shares: { count: Math.floor(Math.random() * 50) }
    });
  }

  return posts;
}

/**
 * Store post in database
 */
function storePost(pageId, postData) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO posts (
      facebook_post_id,
      page_id,
      content_type,
      caption_text,
      published_at,
      engagement_likes,
      engagement_comments,
      engagement_shares,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    postData.id,
    pageId,
    'post',
    postData.message || '',
    postData.created_time || new Date().toISOString(),
    postData.likes?.summary?.total_count || 0,
    postData.comments?.summary?.total_count || 0,
    postData.shares?.count || 0,
    new Date().toISOString()
  );
}

/**
 * Update page post count
 */
function updatePagePostCount(pageId, postCount) {
  const stmt = db.prepare(`
    UPDATE facebook_pages
    SET total_posts = ?,
        updated_at = ?
    WHERE id = ?
  `);

  return stmt.run(
    postCount,
    new Date().toISOString(),
    pageId
  );
}

/**
 * Calculate velocity score (engagement rate)
 */
function calculateVelocityScore(posts) {
  if (!posts || posts.length === 0) {
    return 0;
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.engagement_likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.engagement_comments || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.engagement_shares || 0), 0);

  const totalEngagement = totalLikes + totalComments + totalShares;
  const avgEngagement = totalEngagement / posts.length;

  return avgEngagement;
}

/**
 * Identify trending content
 */
function identifyTrendingContent(pageId, limit = 5) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE page_id = ?
      AND published_at >= datetime('now', '-7 days')
    ORDER BY (engagement_likes + engagement_comments + engagement_shares) DESC
    LIMIT ?
  `);

  return stmt.all(pageId, limit);
}

/**
 * Store trending content
 */
function storeTrendingContent(pageId, posts) {
  for (const post of posts) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO trending_content (
        post_id,
        page_id,
        velocity_score,
        trended_at
      ) VALUES (?, ?, ?, ?)
    `);

    const velocity = (post.engagement_likes || 0) + (post.engagement_comments || 0) + (post.engagement_shares || 0);

    stmt.run(
      post.id,
      pageId,
      velocity,
      new Date().toISOString()
    );
  }
}

/**
 * Main execution
 */
async function main() {
  log('=== Post Monitoring Started ===', 'INFO');

  try {
    const pages = getTrackedPages();

    if (pages.length === 0) {
      log('No tracked Facebook pages found. Add pages in the dashboard.', 'WARN');
      return;
    }

    log(`Found ${pages.length} tracked page(s)`, 'INFO');

    let totalPostsStored = 0;
    let successCount = 0;

    for (const page of pages) {
      try {
        const posts = await fetchRecentPosts(page);

        if (posts.length > 0) {
          // Store new posts
          for (const postData of posts) {
            try {
              storePost(page.id, {
                id: postData.id,
                message: postData.message,
                created_time: postData.created_time,
                likes: postData.likes,
                comments: postData.comments,
                shares: postData.shares
              });
              totalPostsStored++;
            } catch (error) {
              log(`Error storing post ${postData.id}: ${error.message}`, 'ERROR');
            }
          }

          // Update page post count
          updatePagePostCount(page.id, posts.length);

          // Identify and store trending content
          const trending = identifyTrendingContent(page.id, 5);
          storeTrendingContent(page.id, trending);

          log(`✅ Processed ${posts.length} posts for ${page.page_name}`, 'INFO');
          successCount++;
        }

      } catch (error) {
        log(`Error processing page ${page.page_name}: ${error.message}`, 'ERROR');
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log(`=== Post Monitoring Complete: ${successCount} pages, ${totalPostsStored} posts stored ===`, 'INFO');

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    console.error(error);
  } finally {
    db.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { fetchRecentPosts, storePost, identifyTrendingContent };
