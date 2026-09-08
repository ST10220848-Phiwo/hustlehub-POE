const AppError = require('../utils/appError');

/**
 * Role-based access check. Must run AFTER authenticate (needs req.user).
 *
 *   router.delete('/users/:id', authenticate, authorize('admin'), controller.remove);
 *   router.get('/reports', authenticate, authorize('admin', 'manager'), controller.list);
 */
module.exports = function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }

    next();
  };
};