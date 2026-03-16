/**
 * Local Facebook Scraper
 * Runs on mac-mini (can reach AdsPower), pushes results to Fly app
 * 
 * Usage: 
 *   node local-scraper.js                    # Scrape all configured pages
 *   node local-scraper.js --page Page61689  # Scrape specific page
 *   node local-scraper.js --help             # Show help
 */

const FacebookScraper = require('./backend/services/facebook-scraper');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const FLY_APP_URL = process.env.FLY_APP_URL || 'https://facebook-monetiser.fly.dev';
const FLY_API_KEY = process.env.FLY_API_KEY; // Optional: for authenticated requests

// Pages to scrape (configured in the app)
const PAGES_TO_SCRAPE = [
  { id: 'Page61689', name: 'Page61689', url: 'https://www.facebook.com/Page61689' },
  { id: 'LetsGoCaravanCamping', name: 'LetsGoCaravanCamping', url: 'https://www.facebook.com/LetsGoCaravanCamping' }
];

const scraper = new FacebookScraper({
  apiUrl: 'http://95.217.224.154:3000',
  apiKey: 'JTYDA_7531D_98HGTR_YT154',
  provider: 'adspower',
  profileId: 'k1aem3s1'
});

/**
 * Scrape a single Facebook page
 */
async function scrapePage(pageInfo) {
  console.log(`\n📄 Scraping ${pageInfo.name}...`);
  
  try {
    // Start browser
    const { browser, browserId } = await scraper.startBrowser();
    console.log(`  Browser started: ${browserId}`);
    
    // Create page and navigate
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 45000 });
    console.log(`  Page loaded: ${await page.title()}`);
    
    // Wait for content to load
    await page.waitForSelector('div[aria-role="article"]', { timeout: 15000 }).catch(() => {});
    
    // Extract posts
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll('div[aria-role="article"], div[data-pagelet="FeedUnit"]');
      const results = [];
      
      for (const post of postElements) {
        if (results.length >= 10) break;
        
        try {
          const textEl = post.querySelector('div[aria-label] span, div[data-ad-preview]');
          const text = textEl ? textEl.textContent.trim() : '';
          
          const timeEl = post.querySelector('a[href*="/groups/"][aria-label], a[href*="/pages/"][aria-label], abbr');
          const timestamp = timeEl ? timeEl.getAttribute('aria-label') || timeEl.textContent : '';
          
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
        } catch (e) {}
      }
      
      return results;
    });
    
    console.log(`  Scraped ${posts.length} posts`);
    
    // Cleanup
    await browser.close();
    await scraper.stopBrowser(browserId);
    
    return { success: true, posts, page: pageInfo };
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message, page: pageInfo };
  }
}

/**
 * Push results to Fly app
 */
async function pushToFlyApp(pageInfo, posts) {
  console.log(`  → Pushing ${posts.length} posts to ${FLY_APP_URL}...`);
  
  try {
    const response = await fetch(`${FLY_APP_URL}/api/scraper/push-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_name: pageInfo.name,
        page_url: pageInfo.url,
        posts: posts
      })
    });
    
    const result = await response.json();
    console.log(`  ✓ Push result:`, result.success ? 'Success' : 'Failed');
    return result;
    
  } catch (error) {
    console.error(`  ❌ Push failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Local Facebook Scraper
======================
Usage: node local-scraper.js [options]

Options:
  --page <name>    Scrape specific page only
  --all            Scrape all configured pages (default)
  --dry-run        Test scraping without pushing to Fly
  --help, -h      Show this help

Environment:
  FLY_APP_URL     Fly app URL (default: https://facebook-monetiser.fly.dev)
  FLY_API_KEY     API key for authenticated requests

Examples:
  node local-scraper.js
  node local-scraper.js --page Page61689
  node local-scraper.js --dry-run
`);
    return;
  }
  
  const dryRun = args.includes('--dry-run');
  const pageArg = args.find(a => !a.startsWith('--') && a !== '-h');
  
  // Determine which pages to scrape
  let pages = PAGES_TO_SCRAPE;
  if (pageArg) {
    pages = PAGES_TO_SCRAPE.filter(p => p.id === pageArg || p.name === pageArg);
    if (pages.length === 0) {
      console.error(`Page "${pageArg}" not found. Available: ${PAGES_TO_SCRAPE.map(p => p.name).join(', ')}`);
      process.exit(1);
    }
  }
  
  console.log(`\n🕷️  Local Facebook Scraper`);
  console.log(`   Target: ${FLY_APP_URL}`);
  console.log(`   Pages: ${pages.map(p => p.name).join(', ')}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no push)' : 'LIVE'}`);
  console.log('─'.repeat(50));
  
  // Scrape each page
  const results = [];
  for (const page of pages) {
    const result = await scrapePage(page);
    results.push(result);
    
    if (result.success && result.posts.length > 0 && !dryRun) {
      await pushToFlyApp(page, result.posts);
    }
    
    // Delay between pages
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const totalPosts = results.reduce((sum, r) => sum + (r.posts?.length || 0), 0);
  console.log(`   Pages scraped: ${successful}/${results.length}`);
  console.log(`   Total posts: ${totalPosts}`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No data pushed to Fly app');
  }
}

// Run
main().catch(console.error);
