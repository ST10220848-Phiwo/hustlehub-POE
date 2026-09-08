const AppError = require('../utils/appError');

module.exports = function notFound(req, res, next) {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
};