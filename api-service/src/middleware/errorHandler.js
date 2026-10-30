const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal server error occurred.';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
  } else if (err.type === 'entity.parse.failed') {
    // Malformed JSON body
    statusCode = 400;
    errorCode = 'VALIDATION_FAILED';
    message = 'Invalid JSON syntax in request payload.';
  } else if (err.code === '23505') {
    // Database unique constraint violation
    statusCode = 409;
    errorCode = 'RESOURCE_CONFLICT';
    message = 'A resource with these details already exists.';
  } else if (err.code === '23503') {
    // Database foreign key violation
    statusCode = 400;
    errorCode = 'VALIDATION_FAILED';
    message = 'Referenced entity does not exist.';
  }

  // Structured logging of the error
  logger.error(err.message || 'Error handling request', {
    status_code: statusCode,
    error_code: errorCode,
    path: req.originalUrl,
    method: req.method,
    stack: statusCode >= 500 ? err.stack : undefined
  });

  return res.status(statusCode).json({
    error_code: errorCode,
    message
  });
}

function notFoundHandler(req, res, next) {
  return res.status(404).json({
    error_code: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
