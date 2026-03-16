#!/usr/bin/env node

/**
 * Scheduled Posts Publisher
 * Publishes posts that are scheduled and due
 * Run via cron: */5 * * * * cd /app && node backend/scripts/publish-scheduled.js >> logs/automation.log 2>&1
 */

const path = require('path');
const Database = require('better-sqlite3');
const facebookPublisher = require('../services/facebook-publisher');

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
 * Get scheduled posts that are due
 */
function getDueScheduledPosts() {
  const stmt = db.prepare(`
    SELECT
      sp.*,
      p.page_id,
      p.page_name,
      p.facebook_page_id
    FROM scheduled_posts sp
    JOIN facebook_pages p ON sp.page_id = p.id
    WHERE sp.status = 'scheduled'
      AND sp.scheduled_for <= datetime('now', '+5 minutes')
    ORDER BY sp.scheduled_for ASC
  `);

  return stmt.all();
}

/**
 * Get post content by type
 */
function getPostContent(post) {
  if (post.content_type === 'image') {
    return {
      caption: post.caption_text,
      imageUrl: post.image_url
    };
  } else {
    return {
      message: post.caption_text
    };
  }
}

/**
 * Update post status
 */
function updatePostStatus(postId, status, publishedPostId = null, postUrl = null) {
  const stmt = db.prepare(`
    UPDATE scheduled_posts
    SET status = ?,
        published_at = ?,
        facebook_post_id = ?,
        post_url = ?,
        updated_at = ?
    WHERE id = ?
  `);

  return stmt.run(
    status,
    status === 'published' ? new Date().toISOString() : null,
    publishedPostId,
    postUrl,
    new Date().toISOString(),
    postId
  );
}

/**
 * Publish a scheduled post
 */
async function publishScheduledPost(post) {
  log(`Publishing scheduled post ${post.id} to ${post.page_name}`, 'INFO');

  try {
    const content = getPostContent(post);

    // Publish with first comment
    const result = await facebookPublisher.publishPostWithComment(
      post.facebook_page_id,
      post.content_type,
      content,
      post.first_comment
    );

    if (result.success) {
      // Update status to published
      updatePostStatus(post.id, 'published', result.postId, result.postUrl);

      log(`✅ Successfully published post ${post.id} to Facebook`, 'INFO');
      log(`   Post URL: ${result.postUrl}`, 'INFO');

      return { success: true, result };
    } else {
      // Update status to failed
      updatePostStatus(post.id, 'failed');

      log(`❌ Failed to publish post ${post.id}`, 'ERROR');
      return { success: false, error: 'Publish failed' };
    }
  } catch (error) {
    // Update status to failed
    updatePostStatus(post.id, 'failed');

    log(`Error publishing post ${post.id}: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

/**
 * Clean up old scheduled posts (older than 30 days)
 */
function cleanupOldPosts() {
  const stmt = db.prepare(`
    DELETE FROM scheduled_posts
    WHERE status IN ('published', 'failed', 'cancelled')
      AND created_at < datetime('now', '-30 days')
  `);

  const result = stmt.run();

  if (result.changes > 0) {
    log(`Cleaned up ${result.changes} old scheduled posts`, 'INFO');
  }
}

/**
 * Main execution
 */
async function main() {
  log('=== Scheduled Posts Publisher Started ===', 'INFO');

  try {
    const duePosts = getDueScheduledPosts();

    if (duePosts.length === 0) {
      log('No scheduled posts due at this time', 'INFO');
      return;
    }

    log(`Found ${duePosts.length} scheduled post(s) due for publishing`, 'INFO');

    let successCount = 0;
    let failCount = 0;

    for (const post of duePosts) {
      const result = await publishScheduledPost(post);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Rate limiting between posts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    log(`=== Publishing Complete: ${successCount} success, ${failCount} failed ===`, 'INFO');

    // Cleanup old posts
    cleanupOldPosts();

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

module.exports = { publishScheduledPost, getDueScheduledPosts };
