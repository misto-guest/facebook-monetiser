/**
 * Input Validation Middleware
 * Uses Joi for schema validation
 */

const Joi = require('joi');

// Validation schemas
const schemas = {
  // Post creation schema
  createPost: Joi.object({
    page_id: Joi.number().integer().positive().required(),
    content_type: Joi.string().valid('image', 'reel', 'text', 'carousel', 'story').required(),
    caption: Joi.string().max(2200).allow('', null),
    first_comment: Joi.string().max(630).allow('', null),
    image_prompt: Joi.string().max(1000).allow('', null),
    source_id: Joi.number().integer().positive().allow(null),
    competitor_id: Joi.number().integer().positive().allow(null),
    scheduled_for: Joi.date().iso().allow(null)
  }),

  // Post update schema
  updatePost: Joi.object({
    caption: Joi.string().max(2200).allow('', null),
    first_comment: Joi.string().max(630).allow('', null),
    image_prompt: Joi.string().max(1000).allow('', null),
    scheduled_for: Joi.date().iso().allow(null)
  }),

  // Approval status update
  approvalStatus: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'pending').required()
  }),

  // Post mark as posted
  markPosted: Joi.object({
    platform_post_id: Joi.string().max(255).allow(null)
  }),

  // Performance update
  performanceUpdate: Joi.object({
    platform_post_id: Joi.string().max(255).allow(null),
    reach: Joi.number().integer().min(0).allow(null),
    impressions: Joi.number().integer().min(0).allow(null),
    engagement_rate: Joi.number().min(0).max(100).allow(null),
    clicks: Joi.number().integer().min(0).allow(null),
    shares: Joi.number().integer().min(0).allow(null),
    comments: Joi.number().integer().min(0).allow(null),
    likes: Joi.number().integer().min(0).allow(null),
    saves: Joi.number().integer().min(0).allow(null),
    cpc: Joi.number().min(0).allow(null),
    ctr: Joi.number().min(0).max(100).allow(null)
  }),

  // Page creation
  createPage: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    page_id: Joi.string().max(255).required(),
    category: Joi.string().max(100).allow('', null),
    about: Joi.string().max(1000).allow('', null),
    followers_count: Joi.number().integer().min(0).default(0),
    country: Joi.string().length(2).default('US')
  }),

  // Source creation
  createSource: Joi.object({
    source_type: Joi.string().valid('tweet', 'article', 'case_study', 'video', 'competitor_post', 'facebook_group_post').required(),
    title: Joi.string().max(500).allow('', null),
    url: Joi.string().uri().max(2000).required(),
    author: Joi.string().max(255).allow('', null),
    platform: Joi.string().max(100).allow('', null),
    published_date: Joi.date().iso().allow(null),
    content_text: Joi.string().allow('', null)
  }),

  // Competitor creation
  createCompetitor: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    page_id: Joi.string().max(255).required(),
    category: Joi.string().max(100).allow('', null),
    followers_count: Joi.number().integer().min(0).default(0),
    country: Joi.string().length(2).default('US')
  }),

  // Schedule creation
  createSchedule: Joi.object({
    page_id: Joi.number().integer().positive().required(),
    day_of_week: Joi.number().integer().min(0).max(6).required(),
    post_time: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
    content_type: Joi.string().valid('image', 'reel', 'text', 'any').default('any'),
    is_active: Joi.boolean().default(true)
  }),

  // Generic ID parameter
  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  // Facebook group post URL
  facebookGroupPost: Joi.object({
    url: Joi.string().uri().pattern(/facebook\.com\/groups\/\d+\/posts\/\d+/).required()
  }),

  // Query filters
  postQuery: Joi.object({
    page_id: Joi.number().integer().positive(),
    status: Joi.string().valid('pending', 'auto_approved', 'approved', 'rejected', 'scheduled', 'posted'),
    content_type: Joi.string().valid('image', 'reel', 'text', 'carousel', 'story'),
    limit: Joi.number().integer().min(1).max(100).default(50)
  }),

  // Approval queue query
  approvalQueueQuery: Joi.object({
    min_risk: Joi.number().min(0).max(1).default(0.5)
  })
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of schema to use
 * @param {string} property - Request property to validate (body, query, params)
 */
function validate(schemaName, property = 'body') {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Schema '${schemaName}' not found`);
  }

  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace with sanitized values
    req[property] = value;
    next();
  };
}

/**
 * Sanitize string input - prevent XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object containing strings
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = {
  validate,
  schemas,
  sanitizeString,
  sanitizeObject
};
