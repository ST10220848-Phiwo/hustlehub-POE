import { verifyAccessToken } from '../infrastructure/auth/jwt.js';
import { AppError } from './errorHandler.js';

function extractToken(req) {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Authentication required.', { status: 401, code: 'UNAUTHENTICATED' }));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles ?? [] };
    return next();
  } catch {
    return next(new AppError('Invalid or expired session.', { status: 401, code: 'UNAUTHENTICATED' }));
  }
}

export function attachUserIfPresent(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles ?? [] };
  } catch {
    // Ignore - this route doesn't require auth.
  }
  return next();
}

// Route guard factory: passes if req.user holds ANY of the given roles.
// Must run after `authenticate`.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles ?? [];
    const permitted = allowedRoles.some((role) => userRoles.includes(role));

    if (!permitted) {
      return next(new AppError('You do not have permission to perform this action.', {
        status: 403,
        code: 'FORBIDDEN',
      }));
    }

    return next();
  };
}