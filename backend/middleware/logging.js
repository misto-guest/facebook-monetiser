/**
 * Request Logging Middleware
 * Structured logging for API requests
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const accessLogPath = path.join(logsDir, 'access.log');
const errorLogPath = path.join(logsDir, 'error.log');
const auditLogPath = path.join(logsDir, 'audit.log');

/**
 * Write to log file
 */
function writeLog(filePath, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write log:', err);
    }
  });
}

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);

  // Add request ID to request
  req.id = requestId;

  // Log request start
  console.log(`[${requestId}] ${req.method} ${req.originalUrl} - Started`);
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    // Write to access log
    writeLog(accessLogPath, JSON.stringify(logData));

    // Log errors to error log
    if (res.statusCode >= 400) {
      writeLog(errorLogPath, JSON.stringify({
        ...logData,
        error: 'HTTP Error',
        statusCode: res.statusCode
      }));
      console.error(`[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    } else {
      console.log(`[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }

    return res.send(data);
  };

  next();
}

/**
 * Audit logger for sensitive operations
 */
function auditLogger(action) {
  return (req, res, next) => {
    const originalSend = res.send;
    const start = Date.now();
    const requestId = req.id || Math.random().toString(36).substring(2, 15);

    res.send = function(data) {
      res.send = originalSend;
      
      const auditEntry = {
        requestId,
        timestamp: new Date().toISOString(),
        action,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id || 'anonymous',
        ip: req.ip,
        status: res.statusCode,
        duration: Date.now() - start
      };

      writeLog(auditLogPath, JSON.stringify(auditEntry));
      return res.send(data);
    };

    next();
  };
}

/**
 * Error logger middleware
 */
function errorLogger(err, req, res, next) {
  const requestId = req.id || 'unknown';
  
  const errorData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    },
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  console.error(`[${requestId}] ERROR:`, err.message);
  writeLog(errorLogPath, JSON.stringify(errorData));

  next(err);
}

module.exports = {
  requestLogger,
  auditLogger,
  errorLogger,
  writeLog
};
