const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');

/**
 * Verifies the Authorization: Bearer <token> header and attaches the
 * decoded, trusted claims to req.user. Any protected route just needs:
 *
 *   router.get('/me', authenticate, controller.getMe);
 */
module.exports = function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw AppError.unauthorized('Missing or malformed authorization header');
    }

    const payload = verifyToken(token); // throws AppError on invalid/expired

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};