/**
 * Application Configuration
 * Centralized configuration management
 */

const path = require('path');

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, '../../data/facebook-monetiser.db'),
    // Connection pool settings for SQLite (not applicable but kept for potential migration)
    pool: {
      min: 2,
      max: 10
    }
  },

  // API Settings
  api: {
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    },
    
    // Request limits
    maxBodySize: '10mb',
    
    // CORS
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  // Content Settings
  content: {
    // Risk scoring
    riskThresholds: {
      autoApprove: 0.3,
      manualReview: 0.5,
      block: 0.7
    },
    
    // Originality
    minOriginalityScore: 0.3,
    
    // Length limits
    maxCaptionLength: 2200,
    maxFirstCommentLength: 630,
    maxImagePromptLength: 1000
  },

  // Feature Flags
  features: {
    enableScraping: process.env.ENABLE_SCRAPING === 'true',
    enablePredictions: process.env.ENABLE_PREDICTIONS === 'true',
    enableContentGeneration: process.env.ENABLE_CONTENT_GENERATION === 'true',
    enablePublishing: process.env.ENABLE_PUBLISHING === 'true'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableAccessLog: process.env.ENABLE_ACCESS_LOG !== 'false',
    enableErrorLog: process.env.ENABLE_ERROR_LOG !== 'false'
  },

  // External Services
  external: {
    // OpenAI
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    },
    
    // Facebook/Apify
    apify: {
      apiKey: process.env.APIFY_API_KEY
    },
    
    // Firecrawl
    firecrawl: {
      apiKey: process.env.FIRECRAWL_API_KEY
    }
  }
};
