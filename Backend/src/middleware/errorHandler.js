<<<<<<< HEAD
import { AppError } from '../../utils/AppError.js';
import { logger } from '../infrastructure/logging/logger.js';

/**
 * Error handler middleware for managing and responding to errors in the application.
 * This middleware catches errors thrown by other middleware functions and sends a standardized error response.
 * It also logs the error details for debugging purposes.
 */

const TITLES = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
};

// Translate known library error codes to user-friendly messages
function toAppError(error) {
    if(error instanceof AppError) {
        return error; // Already an AppError, no need to convert
    }

    if(error.type === 'entity.parse.failed') {
        return AppError.badRequest('Invalid JSON payload');
    }

    if(error.type === 'entity.too.large') {
        return AppError.payloadTooLarge('Payload too large');
    }

    if(error.name === 'ValidationError' && error.errors) {
        //Mongoose schema message are written by us,
        //so we can use them directly in the response
        const details = Object.values(error.errors).map(err => ({ field: err.path, message: err.message }));
        return AppError.unprocessableEntity('Validation failed', details);
    }

    if(error.name === 'CastError' && error.kind === 'ObjectId') {
        return AppError.badRequest(`Invalid ID format for field: ${error.path}`);
    }

    if (error.name === 11000 && error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return AppError.conflict(`Duplicate value for field: ${field}`);
    }
    return null;
}

export function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    const appError = toAppError(err) || AppError.internalServerError('An unexpected error occurred');
    const statusCode = appError.statusCode || 500;
    if (statusCode >= 500) {
        // Log server errors for debugging, full details are logged,
        // but only a generic message is sent to the client to avoid leaking sensitive information.
        logger.error(`Error: ${appError.message}`, { error: err, stack: err.stack });
    } else {
        // Log client errors at a lower level, as they are often due to user input or request issues.
        logger.warn(`Client error: ${appError.message}`, { error: err });
    }

    return res
        .status(statusCode)
        .type('application/problem+json')
        .json({
            type: 'about:blank',
            title: TITLES[statusCode] || 'Error',
            status: statusCode,
            details: statusCode >= 500 ? 'An unexpected error occurred' : appError.details || undefined,
            requestId: req.id || undefined, // Include request ID if available for tracing
        });
    
}
 
=======
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
>>>>>>> main
