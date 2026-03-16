#!/usr/bin/env node

/**
 * Follower Count Scraping Script
 * Fetches follower counts from Facebook pages and stores historical data
 * Run via cron: 0 9 * * * cd /app && node backend/scripts/scrape-followers.js >> logs/automation.log 2>&1
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
 * Fetch follower count from Facebook Graph API
 */
async function fetchFollowerCount(page) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    log('FACEBOOK_PAGE_ACCESS_TOKEN not configured. Using mock data.', 'WARN');
    return mockFollowerCount(page);
  }

  if (!page.page_id) {
    log(`No page_id for ${page.page_name}. Skipping.`, 'WARN');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${page.page_id}?fields=fan_count&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const followerCount = data.fan_count;
    log(`✅ Fetched ${followerCount} followers for ${page.page_name}`, 'INFO');

    return followerCount;
  } catch (error) {
    log(`Error fetching followers for ${page.page_name}: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Mock follower count (for development/testing)
 */
function mockFollowerCount(page) {
  // Generate somewhat realistic variation
  const baseCount = page.current_follower_count || 10000;
  const variation = Math.floor(Math.random() * 100) - 50; // +/- 50
  return Math.max(0, baseCount + variation);
}

/**
 * Store follower count history
 */
function storeFollowerHistory(pageId, followerCount) {
  const stmt = db.prepare(`
    INSERT INTO follower_history (
      page_id,
      follower_count,
      recorded_at
    ) VALUES (?, ?, ?)
  `);

  return stmt.run(
    pageId,
    followerCount,
    new Date().toISOString()
  );
}

/**
 * Update page with latest follower count
 */
function updatePageFollowerCount(pageId, followerCount) {
  const stmt = db.prepare(`
    UPDATE facebook_pages
    SET current_follower_count = ?,
        updated_at = ?
    WHERE id = ?
  `);

  return stmt.run(
    followerCount,
    new Date().toISOString(),
    pageId
  );
}

/**
 * Calculate growth rate
 */
function calculateGrowthRate(pageId) {
  const stmt = db.prepare(`
    SELECT
      (SELECT follower_count FROM follower_history
       WHERE page_id = ? AND recorded_at >= datetime('now', '-7 days')
       ORDER BY recorded_at ASC LIMIT 1) as start_count,
      (SELECT follower_count FROM follower_history
       WHERE page_id = ?
       ORDER BY recorded_at DESC LIMIT 1) as end_count
  `);

  const result = stmt.get(pageId, pageId);

  if (!result || !result.start_count || !result.end_count) {
    return null;
  }

  const growth = result.end_count - result.start_count;
  const growthRate = (growth / result.start_count) * 100;

  return {
    absolute: growth,
    percentage: growthRate
  };
}

/**
 * Update growth metrics
 */
function updateGrowthMetrics(pageId) {
  const growth = calculateGrowthRate(pageId);

  if (!growth) {
    return;
  }

  const stmt = db.prepare(`
    UPDATE facebook_pages
    SET follower_growth_7d = ?,
        growth_rate_7d = ?,
        updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    growth.absolute,
    growth.percentage,
    new Date().toISOString(),
    pageId
  );

  log(`Updated growth metrics for page ${pageId}: ${growth.absolute} (${growth.percentage.toFixed(2)}%)`, 'INFO');
}

/**
 * Main execution
 */
async function main() {
  log('=== Follower Count Scraping Started ===', 'INFO');

  try {
    const pages = getTrackedPages();

    if (pages.length === 0) {
      log('No tracked Facebook pages found. Add pages in the dashboard.', 'WARN');
      return;
    }

    log(`Found ${pages.length} tracked page(s)`, 'INFO');

    let successCount = 0;
    let failCount = 0;

    for (const page of pages) {
      try {
        const followerCount = await fetchFollowerCount(page);

        if (followerCount !== null) {
          // Store history
          storeFollowerHistory(page.id, followerCount);

          // Update current count
          updatePageFollowerCount(page.id, followerCount);

          // Update growth metrics
          updateGrowthMetrics(page.id);

          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        log(`Error processing page ${page.page_name}: ${error.message}`, 'ERROR');
        failCount++;
      }
    }

    log(`=== Follower Scraping Complete: ${successCount} success, ${failCount} failed ===`, 'INFO');

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

module.exports = { fetchFollowerCount, storeFollowerHistory };
