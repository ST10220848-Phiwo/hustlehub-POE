/**@alias
 * AppError
 * 
 * Error class for handling application errors. It extends the built-in Error class 
 * and adds additional properties for status code, status, and operational flag.
 * 
 */

export class AppError extends Error {
  /**
   * Creates an instance of AppError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error.
   * @param {Object} details - Additional details about the error.
   */
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.details = details;
        this.isOperational = true;
    }

    get statusCode() {
        return this._statusCode;
    }

    static badRequest(message = "Bad Request: 'No details provided'", details = {}) {
        return new AppError(message, 400, details);
    }

    static unauthorized(message = "Unauthorized: 'Authentication required'", details = {}) {
        return new AppError(message, 401, details);
    }

    static forbidden(message = "Forbidden: 'Access denied'", details = {}) {
        return new AppError(message, 403, details);
    }

    static notFound(message = "Not Found: 'Resource not found'", details = {}) {
        return new AppError(message, 404, details);
    }

    static conflict(message = "Conflict: 'Resource conflict'", details = {}) {
        return new AppError(message, 409, details);
    }

    static unprocessableEntity(message = "Unprocessable Entity: 'Invalid data'", details = {}) {
        return new AppError(message, 422, details);
    }

    static tooManyRequests(message = "Too Many Requests: 'Rate limit exceeded'", details = {}) {
        return new AppError(message, 429, details);
    }

    static internalServerError(message = "Internal Server Error: 'An unexpected error occurred'", details = {}) {
        return new AppError(message, 500, details);
    }

    

}