const { UnauthorizedError } = require('../utils/errors');

function requireAuth(req, res, next) {
  const userIdHeader = req.header('X-User-ID');

  if (!userIdHeader || userIdHeader.trim() === '') {
    return next(new UnauthorizedError('Missing or empty X-User-ID header. Authorization required.'));
  }

  // Attach user identity to request context for downstream processing
  req.userId = userIdHeader.trim();
  next();
}

module.exports = {
  requireAuth
};
