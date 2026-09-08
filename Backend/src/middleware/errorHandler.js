const AppError = require('../utils/appError');

/**
 * Single place that turns any thrown/next(err)'d error into a response.
 * Must be registered LAST, after all routes and other middleware.
 *
 * Rule: only AppError messages/details are ever sent to the client.
 * Everything else (bugs, library errors, DB errors) becomes a generic
 * 500 message. Full detail is logged server-side only.
 */
module.exports = function errorHandler(err, req, res, next) {
  // Swap console.error for a real logger (winston/pino) in production.
  console.error(err);

  let statusCode = 500;
  let message = 'Something went wrong. Please try again later.';
  let details;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // catches validation errors thrown by libraries that don't go through validate.js
    statusCode = 400;
    message = 'Validation failed';
  }

  const body = { success: false, message };
  if (details) body.details = details;

  res.status(statusCode).json(body);
  // Never include err.stack, req paths beyond what's already public,
  // or any process.env values in the response body.
};