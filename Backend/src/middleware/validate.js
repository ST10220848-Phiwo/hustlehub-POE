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