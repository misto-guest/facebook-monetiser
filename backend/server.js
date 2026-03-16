const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import configuration
const config = require('./utils/config');
const { db, Database } = require('./utils/database');

// Import middleware
const { 
  generalLimiter, 
  writeLimiter, 
  scrapingLimiter,
  healthCheckLimiter 
} = require('./middleware/rateLimiting');
const { 
  requestLogger, 
  errorLogger 
} = require('./middleware/logging');

// Import routes
const pagesRouter = require('./api/pages');
const sourcesRouter = require('./api/sources');
const postsRouter = require('./api/posts');
const predictionsRouter = require('./api/predictions');
const contentGeneratorRouter = require('./api/content-generator');
const configRouter = require('./api/config');
const publishingRouter = require('./api/publishing');
const migrationsRouter = require('./api/migrations');
const schemaRouter = require('./api/schema');
const scraperRouter = require('./api/scraper');
const scrapedRouter = require('./api/scraped');

const app = express();
const PORT = config.port;

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use(cors(config.api.cors));

// Body parsing with size limit
app.use(express.json({ limit: config.api.maxBodySize }));
app.use(express.urlencoded({ extended: true, limit: config.api.maxBodySize }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging (all environments)
app.use(requestLogger);

// Rate limiting
app.use('/api', healthCheckLimiter);  // Health check - minimal limit
app.use('/api', generalLimiter);       // General API - 100 req/15min
app.use('/api/posts', writeLimiter);    // Write operations - stricter
app.use('/api/scraped', scrapingLimiter); // Scraping - most strict

// ============================================
// DATABASE
// ============================================

// Database path configuration
const dbPath = process.env.DATABASE_PATH 
  ? process.env.DATABASE_PATH
  : path.join(__dirname, '../data/facebook-monetiser.db');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created data directory: ${dbDir}`);
}

// Initialize database
const database = new Database(dbPath);

async function initializeDatabase() {
  try {
    await database.open();
    
    // Initialize schema
    const schemaPath = path.join(__dirname, 'database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      await database.initSchema(schemaPath);
    }
    
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    // Don't exit in production - allow degraded mode
    if (config.env === 'development') {
      process.exit(1);
    }
  }
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check database connectivity
    await database.get('SELECT 1');
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: config.env
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'degraded', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// API Routes
app.use('/api/pages', pagesRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/scraped', scrapedRouter);
app.use('/api/content', contentGeneratorRouter);
app.use('/api/config', configRouter);
app.use('/api/migrations', migrationsRouter);
app.use('/api/schema', schemaRouter);
app.use('/api/scraper', scraperRouter);
app.use('/api/publishing', publishingRouter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Cannot ${req.method} ${req.path}` 
  });
});

// Global error handler (must be last)
app.use(errorLogger);
app.use((err, req, res, next) => {
  // Don't leak error details in production
  const message = config.env === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    error: message,
    ...(config.env !== 'production' && { stack: err.stack })
  });
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  // Initialize database first
  await initializeDatabase();

  // Make db accessible to routes AFTER initialization
  app.locals.db = database;
  app.locals.rawDb = database.getDb();

  // Start listening
  app.listen(PORT, () => {
    console.log(`\n🚀 Facebook Monetiser Backend Server`);
    console.log(`📡 Server running: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🗄️  Database: ${dbPath}`);
    console.log(`🌍 Environment: ${config.env}\n`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  try {
    await database.close();
    console.log('Database closed');
  } catch (err) {
    console.error('Error closing database:', err.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM received, shutting down...');
  try {
    await database.close();
  } catch (err) {
    console.error('Error closing database:', err.message);
  }
  process.exit(0);
});

// Export for testing
module.exports = { app, database };

// Start server if run directly
if (require.main === module) {
  startServer();
}
