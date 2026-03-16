// API Base URL
const API_BASE = '/api';

// Global state
let pages = [];
let sources = [];
let posts = [];
let analytics = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadPages();
  loadSources();
  loadPosts();
  loadAnalytics();
  setupFormHandlers();
  initializeCharts();
});

// Tab Navigation
function showTab(tabName) {
  // Hide all content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  // Remove active from all tabs
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('tab-active');
    el.classList.add('text-gray-500');
  });
  // Show selected content
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  // Activate tab
  const tab = document.getElementById(`tab-${tabName}`);
  tab.classList.add('tab-active');
  tab.classList.remove('text-gray-500');
}

// Load Pages (Enhanced with SMV fields)
async function loadPages() {
  try {
    const res = await fetch(`${API_BASE}/pages`);
    const data = await res.json();
    pages = data.pages;
    renderPages();
    updatePageSelect();
  } catch (error) {
    console.error('Error loading pages:', error);
    document.getElementById('pages-list').innerHTML = '<p class="text-red-500">Error loading pages</p>';
  }
}

function renderPages() {
  const container = document.getElementById('pages-list');
  if (pages.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No pages yet. Add your first Facebook page!</p>';
    return;
  }

  container.innerHTML = pages.map(page => `
    <div class="bg-gray-50 rounded-lg p-4 border">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-lg">${page.name}</h3>
          <p class="text-gray-600 text-sm">ID: ${page.page_id}</p>
          <p class="text-gray-600 text-sm">${page.category || 'No category'}</p>
          ${page.primary_niche ? `<span class="inline-block mt-1 px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800">🎯 ${page.primary_niche}</span>` : ''}
          <div class="mt-2 flex space-x-4 text-sm text-gray-500">
            <span>👥 ${page.followers_count?.toLocaleString() || 0} followers</span>
            <span>📦 ${page.assets_count || 0} assets</span>
            <span>📝 ${page.posts_count || 0} posts</span>
          </div>
          <div class="mt-2 space-y-1">
            ${getMonetizationBadge(page.monetization_status)}
            ${page.language ? `<span class="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">🌐 ${page.language.toUpperCase()}</span>` : ''}
            <span class="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">🇺🇸 US</span>
          </div>
        </div>
        <div class="flex flex-col space-y-2">
          <button onclick="viewPageDetails(${page.id})" class="text-sm text-blue-600 hover:text-blue-800">Details</button>
          <button onclick="updateMonetization(${page.id})" class="text-sm text-purple-600 hover:text-purple-800">Monetization</button>
          <button onclick="deletePage(${page.id})" class="text-sm text-red-500 hover:text-red-700">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getMonetizationStatus(status) {
  const statuses = {
    approved: { label: 'Approved', class: 'bg-green-100 text-green-800' },
    pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
    restricted: { label: 'Restricted', class: 'bg-red-100 text-red-800' }
  };
  return statuses[status] || { label: 'Unknown', class: 'bg-gray-100 text-gray-800' };
}

function getMonetizationBadge(status) {
  if (!status) return '';
  const info = getMonetizationStatus(status);
  return `<span class="inline-block px-2 py-1 text-xs rounded ${info.class}">💰 ${info.label}</span>`;
}

function updatePageSelect() {
  const select = document.getElementById('post-page');
  if (!select) return;
  select.innerHTML = '<option value="">Choose a page...</option>' +
    pages.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// Load Sources (Enhanced with verification badges)
async function loadSources() {
  try {
    const res = await fetch(`${API_BASE}/sources`);
    const data = await res.json();
    sources = data.sources;
    renderSources();
  } catch (error) {
    console.error('Error loading sources:', error);
    document.getElementById('sources-list').innerHTML = '<p class="text-red-500">Error loading sources</p>';
  }
}

function renderSources() {
  const container = document.getElementById('sources-list');
  if (sources.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No sources yet. Add your first source!</p>';
    return;
  }

  container.innerHTML = sources.map(source => `
    <div class="bg-gray-50 rounded-lg p-4 border">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-2">
            <span class="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">${source.source_type}</span>
            ${getVerificationBadge(source)}
            ${getConfidenceBadge(source.confidence_level)}
            <h3 class="font-bold">${source.title || 'Untitled'}</h3>
          </div>
          <p class="text-gray-600 text-sm line-clamp-2">${source.content_text || 'No content'}</p>
          ${source.summary ? `<p class="text-gray-700 text-sm mt-2 italic">"${source.summary}"</p>` : ''}
          ${source.url ? `<a href="${source.url}" target="_blank" class="text-blue-500 text-sm hover:underline">View Source</a>` : ''}
          ${source.author ? `<p class="text-gray-500 text-xs mt-1">By: ${source.author}</p>` : ''}
          ${source.last_verified ? `<p class="text-gray-400 text-xs mt-1">✓ Verified: ${new Date(source.last_verified).toLocaleDateString()}</p>` : ''}
        </div>
        <div class="ml-4 flex flex-col space-y-2">
          <button onclick="viewSourceInsights(${source.id})" class="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200">Insights</button>
          <button onclick="addInsight(${source.id})" class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200">+ Insight</button>
          <button onclick="verifySource(${source.id})" class="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200">Verify</button>
          <button onclick="deleteSource(${source.id})" class="text-sm text-red-500 hover:text-red-700">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getVerificationBadge(source) {
  if (!source.last_verified) {
    return '<span class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Unverified</span>';
  }

  const daysSinceVerified = Math.floor((new Date() - new Date(source.last_verified)) / (1000 * 60 * 60 * 24));

  if (daysSinceVerified <= 7) {
    return '<span class="px-2 py-1 text-xs rounded bg-green-100 text-green-800">✓ Verified</span>';
  } else if (daysSinceVerified <= 30) {
    return '<span class="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">⚠ Stale</span>';
  } else {
    return '<span class="px-2 py-1 text-xs rounded bg-red-100 text-red-800">✗ Outdated</span>';
  }
}

function getConfidenceBadge(level) {
  if (!level) return '';
  const colors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800'
  };
  return `<span class="px-2 py-1 text-xs rounded ${colors[level] || 'bg-gray-100 text-gray-800'}">${level.toUpperCase()} Confidence</span>`;
}

// Load Posts (Enhanced with prediction display)
async function loadPosts() {
  try {
    const filter = document.getElementById('post-filter')?.value || '';
    const url = filter ? `${API_BASE}/posts?status=${filter}` : `${API_BASE}/posts`;
    const res = await fetch(url);
    const data = await res.json();
    posts = data.posts;
    renderPosts();
  } catch (error) {
    console.error('Error loading posts:', error);
    document.getElementById('posts-list').innerHTML = '<p class="text-red-500">Error loading posts</p>';
  }
}

function renderPosts() {
  const container = document.getElementById('posts-list');
  if (posts.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No posts yet. Create your first post!</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="bg-gray-50 rounded-lg p-4 border">
      <div class="flex justify-between items-start mb-3">
        <div>
          <span class="px-2 py-1 text-xs rounded ${getContentTypeClass(post.content_type)}">${post.content_type}</span>
          <span class="ml-2 text-sm text-gray-500">${post.page_name || 'Unknown Page'}</span>
        </div>
        <span class="px-2 py-1 text-xs rounded ${getStatusClass(post.approval_status)}">${post.approval_status}</span>
      </div>
      <p class="text-gray-800 mb-2 line-clamp-3">${post.caption || 'No caption'}</p>
      <div class="flex justify-between items-center text-sm text-gray-500 mb-2">
        <div class="space-x-3">
          <span>Risk: ${getRiskBadge(post.risk_score)}</span>
          <span>Originality: ${(post.originality_score * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <div class="space-x-2">
          ${post.approval_status === 'pending' ? `
            <button onclick="approvePost(${post.id})" class="text-green-600 hover:text-green-800">Approve</button>
            <button onclick="rejectPost(${post.id})" class="text-red-600 hover:text-red-800">Reject</button>
          ` : ''}
          <button onclick="viewPredictions(${post.id})" class="text-blue-600 hover:text-blue-800">Predictions</button>
        </div>
        <button onclick="deletePost(${post.id})" class="text-gray-600 hover:text-gray-800">Delete</button>
      </div>
      ${post.scheduled_for ? `<p class="text-xs text-gray-500 mt-2">📅 Scheduled: ${new Date(post.scheduled_for).toLocaleString()}</p>` : ''}
    </div>
  `).join('');
}

function getContentTypeClass(type) {
  const classes = {
    image: 'bg-blue-100 text-blue-800',
    reel: 'bg-pink-100 text-pink-800',
    text: 'bg-gray-100 text-gray-800',
    carousel: 'bg-purple-100 text-purple-800'
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}

function getStatusClass(status) {
  const classes = {
    pending: 'status-pending',
    auto_approved: 'status-approved',
    approved: 'status-approved',
    scheduled: 'status-approved',
    posted: 'status-posted',
    rejected: 'status-rejected'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function getRiskBadge(score) {
  if (score < 0.3) return '<span class="text-green-600">Low</span>';
  if (score < 0.6) return '<span class="text-yellow-600">Medium</span>';
  return '<span class="text-red-600">High</span>';
}

function filterPosts() {
  loadPosts();
}

// Load Analytics
async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/predictions/accuracy/metrics`);
    const data = await res.json();
    analytics = data.metrics;
    renderAnalytics();
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

function renderAnalytics() {
  if (!analytics) return;

  document.getElementById('total-predictions').textContent = analytics.total_predictions || 0;
  document.getElementById('avg-confidence').textContent = ((analytics.avg_confidence || 0) * 100).toFixed(1) + '%';
  document.getElementById('predictions-with-actuals').textContent = analytics.predictions_with_actuals || 0;

  const accuracy = analytics.estimated_accuracy_pct;
  if (accuracy !== null) {
    document.getElementById('estimated-accuracy').textContent = accuracy.toFixed(1) + '%';
  }
}

// SMV Enhancement Functions
async function viewPageDetails(pageId) {
  try {
    const res = await fetch(`${API_BASE}/pages/${pageId}/analytics`);
    const data = await res.json();
    const analytics = data.analytics;

    alert(`Page Analytics:\n\nTotal Posts: ${analytics.total_posts}\nPosted: ${analytics.posted_posts}\nPending: ${analytics.pending_posts}\nScheduled: ${analytics.scheduled_posts}\nAvg Engagement: ${((analytics.avg_engagement_rate || 0) * 100).toFixed(2)}%`);
  } catch (error) {
    alert('Error loading page details: ' + error.message);
  }
}

async function updateMonetization(pageId) {
  const status = prompt('Enter monetization status (approved/pending/restricted):');
  if (!status) return;

  const notes = prompt('Add notes (optional):');

  try {
    const res = await fetch(`${API_BASE}/pages/${pageId}/monetization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monetization_status: status, notes })
    });

    if (res.ok) {
      alert('Monetization status updated!');
      loadPages();
    } else {
      const error = await res.json();
      alert(error.error || 'Failed to update');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function verifySource(sourceId) {
  try {
    const res = await fetch(`${API_BASE}/sources/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sourceId })
    });

    if (res.ok) {
      alert('Source verified successfully!');
      loadSources();
    } else {
      alert('Failed to verify source');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function viewSourceInsights(sourceId) {
  try {
    const res = await fetch(`${API_BASE}/sources/insights/${sourceId}`);
    const data = await res.json();

    if (data.insights.length === 0) {
      alert('No insights found for this source.');
      return;
    }

    const insights = data.insights.map(i =>
      `- [${(i.effectiveness_score * 100).toFixed(0)}%] ${i.insight_text}`
    ).join('\n');

    alert(`Insights (${data.insights_count}):\n\n${insights}`);
  } catch (error) {
    alert('Error loading insights: ' + error.message);
  }
}

async function viewPredictions(postId) {
  try {
    const res = await fetch(`${API_BASE}/predictions/performance/${postId}`);
    const data = await res.json();

    const pred = data.prediction;
    const metrics = pred.predicted_metrics;

    alert(`Performance Predictions:\n\nCTR: ${(pred.predicted_ctr * 100).toFixed(2)}%\nCVR: ${(pred.predicted_cvr * 100).toFixed(2)}%\nCPA: $${pred.predicted_cpa.toFixed(2)}\nConfidence: ${(pred.confidence_score * 100).toFixed(0)}%\n\nEst. Reach: ${metrics.estimated_reach.toLocaleString()}\nEst. Engagement: ${metrics.estimated_engagement.toLocaleString()}\nEst. Clicks: ${metrics.estimated_clicks.toLocaleString()}`);
  } catch (error) {
    alert('Error loading predictions: ' + error.message);
  }
}

// Form Handlers
function setupFormHandlers() {
  // Add Page Form
  document.getElementById('add-page-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        closeModal('add-page-modal');
        e.target.reset();
        loadPages();
        alert('Page added successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add page');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

  // Add Source Form
  document.getElementById('add-source-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        closeModal('add-source-modal');
        e.target.reset();
        loadSources();
        alert('Source added successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add source');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

  // Create Post Form
  document.getElementById('create-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      page_id: parseInt(document.getElementById('post-page').value),
      content_type: document.getElementById('post-type').value,
      caption: document.getElementById('post-caption').value,
      first_comment: document.getElementById('post-comment').value || null,
      image_prompt: document.getElementById('post-image-prompt').value || null,
      scheduled_for: document.getElementById('post-schedule').value || null
    };

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Post created! Risk Score: ${result.risk_score.toFixed(2)}\nStatus: ${result.approval_status}`);
        document.getElementById('create-post-form').reset();
        loadPosts();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create post');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}

// Modal Functions
function showAddPageModal() {
  document.getElementById('add-page-modal').classList.remove('hidden');
}

function showAddSourceModal() {
  document.getElementById('add-source-modal').classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// CRUD Operations
async function deletePage(id) {
  if (!confirm('Are you sure you want to delete this page?')) return;

  try {
    const res = await fetch(`${API_BASE}/pages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadPages();
      alert('Page deleted successfully');
    }
  } catch (error) {
    alert('Error deleting page: ' + error.message);
  }
}

async function deleteSource(id) {
  if (!confirm('Are you sure you want to delete this source?')) return;

  try {
    const res = await fetch(`${API_BASE}/sources/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadSources();
      alert('Source deleted successfully');
    }
  } catch (error) {
    alert('Error deleting source: ' + error.message);
  }
}

async function addInsight(sourceId) {
  const insightText = prompt('Enter insight:');
  if (!insightText) return;

  try {
    const res = await fetch(`${API_BASE}/sources/${sourceId}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insight_text: insightText })
    });

    if (res.ok) {
      alert('Insight added successfully!');
      loadSources();
    } else {
      alert('Failed to add insight');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function approvePost(id) {
  try {
    const res = await fetch(`${API_BASE}/posts/${id}/approval`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });

    if (res.ok) {
      loadPosts();
    }
  } catch (error) {
    alert('Error approving post: ' + error.message);
  }
}

async function rejectPost(id) {
  try {
    const res = await fetch(`${API_BASE}/posts/${id}/approval`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    });

    if (res.ok) {
      loadPosts();
    }
  } catch (error) {
    alert('Error rejecting post: ' + error.message);
  }
}

async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const res = await fetch(`${API_BASE}/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadPosts();
      alert('Post deleted successfully');
    }
  } catch (error) {
    alert('Error deleting post: ' + error.message);
  }
}

// AI Content Generation
async function generateCaption() {
  try {
    const res = await fetch(`${API_BASE}/content/caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await res.json();
    document.getElementById('post-caption').value = data.caption;
    alert(`Caption generated! Risk Score: ${data.risk_score.toFixed(2)}`);
  } catch (error) {
    alert('Error generating caption: ' + error.message);
  }
}

async function generateComment() {
  const caption = document.getElementById('post-caption').value;
  try {
    const res = await fetch(`${API_BASE}/content/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, include_cta: true })
    });

    const data = await res.json();
    document.getElementById('post-comment').value = data.comment;
  } catch (error) {
    alert('Error generating comment: ' + error.message);
  }
}

async function generateImagePrompt() {
  const caption = document.getElementById('post-caption').value;
  try {
    const res = await fetch(`${API_BASE}/content/image-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption })
    });

    const data = await res.json();
    document.getElementById('post-image-prompt').value = data.prompt;
  } catch (error) {
    alert('Error generating image prompt: ' + error.message);
  }
}

async function analyzeContent() {
  const caption = document.getElementById('post-caption').value;
  const comment = document.getElementById('post-comment').value;

  try {
    const res = await fetch(`${API_BASE}/content/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, first_comment: comment })
    });

    const data = await res.json();
    alert(`Risk Analysis:\n\nCaption Risk: ${data.caption_risk_score.toFixed(2)}\nComment Risk: ${data.comment_risk_score.toFixed(2)}\nOverall Risk: ${data.overall_risk_score.toFixed(2)}\n\nRecommendation: ${data.recommendation}`);
  } catch (error) {
    alert('Error analyzing content: ' + error.message);
  }
}

// Refresh Data
function refreshData() {
  loadPages();
  loadSources();
  loadPosts();
  loadAnalytics();
  alert('Data refreshed!');
}

// Initialize Charts (placeholder for future chart library integration)
function initializeCharts() {
  console.log('Charts initialized');
}
