/**
 * AppError — the only kind of error that should reach the client with its
 * message intact. Anything else (programming errors, unexpected exceptions)
 * gets a generic message from errorHandler.js instead, to avoid leaking
 * stack traces, file paths, or config values.
 */
class AppError extends Error {
  /**
   * @param {string} message - safe, user-facing message
   * @param {number} statusCode - HTTP status code
   * @param {any} [details] - optional safe extra info (e.g. validation field errors)
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // marks "expected" errors vs. unhandled bugs

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;