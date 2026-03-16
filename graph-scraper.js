/**
 * Facebook Graph API Scraper
 * Uses Facebook Graph API to fetch public page posts
 * No browser needed - direct API calls
 * 
 * Setup:
 * 1. Get access token from: https://developers.facebook.com/tools/explorer/
 * 2. Set FACEBOOK_ACCESS_TOKEN env var or pass in constructor
 * 
 * Usage:
 *   node graph-scraper.js                    # Test with default page
 *   node graph-scraper.js --page Page61689  # Scrape specific page
 */

// Use native fetch (Node 18+)

// Configuration
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

// Get access token from environment
const USER_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';

// Cache for page access tokens
let pageAccessTokens = null;

/**
 * Get page access tokens from user token
 */
async function getPageAccessTokens() {
  if (pageAccessTokens) return pageAccessTokens;
  
  const url = `${FACEBOOK_GRAPH_API}/me/accounts?access_token=${USER_ACCESS_TOKEN}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  // Map to accessible pages
  pageAccessTokens = data.data.map(page => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token
  }));
  
  console.log(`Found ${pageAccessTokens.length} accessible pages`);
  return pageAccessTokens;
}

// Pages to scrape
const PAGES = [
  { id: 'Page61689', name: 'Page61689' },
  { id: 'LetsGoCaravanCamping', name: 'LetsGoCaravanCamping' }
];

/**
 * Fetch posts from a Facebook Page using Graph API
 */
async function fetchPagePosts(pageId, pageToken, limit = 10) {
  const url = `${FACEBOOK_GRAPH_API}/${pageId}/posts?access_token=${pageToken}&limit=${limit}&fields=id,message,created_time,permalink_url,full_picture`;
  
  console.log(`Fetching posts from ${pageId}...`);
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.error) {
    console.error(`  Error: ${data.error.message}`);
    return [];
  }
  
  const posts = (data.data || []).map(post => ({
    text: post.message || '',
    link: post.permalink_url || `https://facebook.com/${pageId}/posts/${post.id}`,
    timestamp: post.created_time || new Date().toISOString(),
    post_date: post.created_time ? post.created_time.split('T')[0] : new Date().toISOString().split('T')[0],
    image: post.full_picture || null
  }));
  
  console.log(`  Found ${posts.length} posts`);
  return posts;
}

/**
 * Test Graph API connection
 */
async function testConnection() {
  console.log('\n🔗 Testing Facebook Graph API...');
  console.log(`   Token: ${USER_ACCESS_TOKEN.substring(0, 10)}...${USER_ACCESS_TOKEN.substring(USER_ACCESS_TOKEN.length - 5)}`);
  
  const url = `${FACEBOOK_GRAPH_API}/me?access_token=${USER_ACCESS_TOKEN}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.log(`\n❌ Token Error: ${data.error.message}`);
      console.log('\nTo get a valid token:');
      console.log('1. Go to: https://developers.facebook.com/tools/explorer/');
      console.log('2. Click "Get Token" → "Get User Access Token"');
      console.log('3. Select permissions: pages_read_engagement, pages_show_list');
      console.log('4. Copy the access token and set it:');
      console.log('   export FACEBOOK_ACCESS_TOKEN="your-token-here"');
      return false;
    }
    
    console.log(`\n✅ Connected! User: ${data.name || data.id}`);
    return true;
  } catch (error) {
    console.error(`\n❌ Connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Push posts to Fly app
 */
async function pushToFlyApp(pageInfo, posts) {
  const FLY_APP_URL = process.env.FLY_APP_URL || 'https://facebook-monetiser.fly.dev';
  
  console.log(`  → Pushing ${posts.length} posts to ${FLY_APP_URL}...`);
  
  try {
    const response = await fetch(`${FLY_APP_URL}/api/scraper/push-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_name: pageInfo.name,
        page_url: `https://www.facebook.com/${pageInfo.id}`,
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
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Facebook Graph API Scraper
=========================
Usage: node graph-scraper.js [options]

Options:
  --page <id>    Scrape specific page (by ID)
  --all          Scrape all pages (default)
  --test         Test API connection only
  --help, -h     Show this help

Environment:
  FACEBOOK_ACCESS_TOKEN   Your Facebook access token (required)
  FLY_APP_URL            Fly app URL (default: https://facebook-monetiser.fly.dev)

Get Token:
  1. Go to: https://developers.facebook.com/tools/explorer/
  2. Get User Access Token
  3. Add permissions: pages_read_engagement, pages_show_list
  4. Export: export FACEBOOK_ACCESS_TOKEN="your-token"

Example:
  export FACEBOOK_ACCESS_TOKEN="EAAC..."
  node graph-scraper.js --all
`);
    return;
  }
  
  // Test connection first
  if (args.includes('--test')) {
    await testConnection();
    return;
  }
  
  const connected = await testConnection();
  if (!connected) {
    console.log('\n⚠️  Please provide a valid Facebook access token');
    process.exit(1);
  }
  
  // Get accessible pages
  const pages = await getPageAccessTokens();
  
  console.log(`\n🕷️  Facebook Graph API Scraper`);
  console.log(`   Pages: ${pages.map(p => p.name).join(', ')}`);
  console.log('─'.repeat(50));
  
  // Scrape each page
  for (const page of pages) {
    const posts = await fetchPagePosts(page.id, page.accessToken, 10);
    
    if (posts.length > 0) {
      await pushToFlyApp({ name: page.name, url: `https://www.facebook.com/${page.id}` }, posts);
    }
    
    // Delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n✅ Done!');
}

// Run
main().catch(console.error);
