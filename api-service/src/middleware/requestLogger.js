const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request processed', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      user_agent: req.headers['user-agent'],
      x_user_id: req.headers['x-user-id']
    });
  });

  next();
}

module.exports = requestLogger;
