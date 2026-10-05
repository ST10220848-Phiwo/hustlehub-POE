<<<<<<< HEAD
import { AppError } from '../../utils/AppError.js';

/**
 * Deliberately doesn't echo the original URL in the error message to avoid leaking information about the server's routing structure.
 * Instead, it provides a generic "Route not found" message to the client.
 * The original URL is logged server-side for debugging purposes.
 */

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};
 
=======
const AppError = require('../utils/appError');

module.exports = function notFound(req, res, next) {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
};
>>>>>>> main
