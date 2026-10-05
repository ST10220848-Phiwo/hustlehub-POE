const jwt = require('jsonwebtoken');
const AppError = require('./appError');

const { JWT_SECRET, JWT_EXPIRES_IN = '1h' } = process.env;

if (!JWT_SECRET) {
  // Fail fast at startup rather than silently signing tokens with `undefined`
  throw new Error('JWT_SECRET is not set in environment variables');
}

/**
 * Sign a JWT. Keep the payload minimal — id + role is usually enough.
 * Never put passwords or full user objects in the payload; it's base64,
 * not encrypted, and readable by anyone holding the token.
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT, throwing an AppError (never the raw jsonwebtoken error)
 * so callers can just `next(err)` it straight to the error handler.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Session expired, please log in again');
    }
    throw AppError.unauthorized('Invalid token');
  }
}

module.exports = { signToken, verifyToken };