import { verifyAccessToken } from '../infrastructure/auth/jwt.js';
import { ACCESS_TOKEN_COOKIE } from '../config/jwt.js';
import { User } from '../infrastructure/auth/db/User.js';
import { AppError } from './utils/AppError.js';

/**
 * Middleware for authenticating requests using JWT.
 * Middleware checks for the presence of a JWT in the request cookies, verifies it, and attaches the authenticated user to the request object.
 * If the token is missing or invalid, it responds with an appropriate error.
 */

const invalidSession = () => AppError.unauthorized('Invalid session: Access token is missing or invalid');

function extractToken(req) {
  // Check for the access token in cookies
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (token) return token;

  // Check for the access token in the Authorization header (Bearer token)
  const header = req.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }

  return null;
}

export function createAuthMiddleware({ findUserById = User.findById } = {}) {
  async function authenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) return next(AppError.unauthorized('Authentication required: Access token is missing'));
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      //Message is intentionally vague to avoid leaking information about token validity
      //uniform messages hide whether the token is expired, malformed, or simply invalid.
      return next(invalidSession());
    }
    try {
      const user = await findUserById(payload.sub);
      if (!user || !user.isActive) return next(invalidSession());
      // Attach the authenticated user to the request object for downstream middleware and route handlers
      req.user = { id: String(payload.sub), roles: payload.roles };
      return next();
    } catch(err) {
      return next(err);
    }
  }

  async function attachUserIfPresent(req, _res, next) {
    const token = extractToken(req);
    if (!token) return next();
    try{
      const payload = verifyAccessToken(token);
      const user = await findUserById(payload.sub);
      if (user && user.isActive) {
        req.user = { id: String(payload.sub), roles: payload.roles };
      }
    } catch(err) {
      // Intentionally ignore errors here to allow requests to proceed without authentication if the token is invalid or the user is not found.
    }
    return next();
    
  }
  return { authenticate, attachUserIfPresent };
}

export const { authenticate, attachUserIfPresent } = createAuthMiddleware();

// Passes if req.user exists and has at least one of the required roles.
// If req.user is missing or does not have any of the required roles, it responds with a 403 Forbidden error.
export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    const userRoles = req.user?.roles || [];
    if (allowedRoles.some(role => userRoles.includes(role))) {
      return next();
    }
    return next(AppError.forbidden('Access denied: Insufficient permissions'));
  };
}


