const AppError = require('../utils/appError');

/**
 * Generic validation middleware. Expects a Joi-style schema
 * (anything exposing `.validate(data) -> { error, value }`).
 *
 * Usage in a route file:
 *   const Joi = require('joi');
 *   const registerSchema = Joi.object({
 *     email: Joi.string().email().required(),
 *     password: Joi.string().min(8).required(),
 *   });
 *
 *   router.post('/register', validate(registerSchema), authController.register);
 *
 * On failure it produces a 400 with field-level messages, never raw
 * exceptions or internal details.
 */
module.exports = function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(AppError.badRequest('Validation failed', details));
    }

    req[property] = value; // sanitized/coerced value replaces raw input
    next();
  };
};
