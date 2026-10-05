<<<<<<< HEAD
import { AppError } from '../../utils/AppError.js';

/**
 * Middleware for authenticating requests using JWT.
 * Middleware checks for the presence of a JWT in the request cookies, verifies it, 
 * and attaches the authenticated user to the request object.
 * 
 */

export function validate(schema, property = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], 
            { abortEarly: false,
             stripUnknown: true,
             convert: true,
            });
        if (error) {
            const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
            return next(AppError.badRequest('Validation failed', details));
        }
        // req.query is a read-only object, so we cannot directly assign to it.
        //  Instead, we can use Object.assign to merge the validated value into req.query.
        if (property === 'query') {
            req.validatedQuery = value; // Store validated query parameters in a new property
        } else {
            req[property] = value; // Replace the original property with the validated value
        }
        next();
    };
}
=======
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
>>>>>>> main
