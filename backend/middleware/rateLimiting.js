/**
 * Rate Limiting Middleware
 * Configurable rate limits for API endpoints
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Strict limiter for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 write requests per minute
  message: {
    error: 'Too many write requests',
    message: 'Please slow down',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for authentication-related endpoints (if added later)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: {
    error: 'Too many attempts',
    message: 'Please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Scraping/API heavy endpoints
const scrapingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many scraping requests',
    message: 'Please slow down',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Health check - no rate limit
const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Very high limit for health checks
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

module.exports = {
  generalLimiter,
  writeLimiter,
  authLimiter,
  scrapingLimiter,
  healthCheckLimiter
};
