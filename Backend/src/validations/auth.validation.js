import Joi from 'joi';

/**
 * This module defines validation schemas for authentication-related operations using Joi.
 * It includes schemas for user registration, login, and password reset requests.
 * Each schema specifies the expected structure and constraints for the corresponding request payload.
 */

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required().messages({
  'string.empty': 'Email is required',
  'string.email': 'Email must be a valid email address',
});

//bcrypt silently ignores whitespace, so we can trim the password to avoid confusion.
//checks bytes length and ignores anything past 72 bytes
const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, 'letters')
  .pattern(/(?=.*\d)/, 'numbers')
  .custom((value, helpers) => {
    if (/\s/.test(value)) {
      return helpers.error('string.pattern.base', { name: 'no whitespace' });
    }

    if (Buffer.byteLength(value, 'utf8') > 72) {
      return helpers.error('string.max', { limit: 72, value });
    }

    return value;
  })
  .required()
  .messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least {#limit} characters long',
    'string.max': 'Password must be at most {#limit} characters long',
    'string.pattern.base': 'Password must contain at least one letter and one number and no whitespace',
  });

export const registerSchema = Joi.object({
    name: Joi.string()
    .trim()
    .min(2)
    .max(80)
    .pattern(/^[\p{L}\p{M}]+(?:[\s.'-][\p{L}\p{M}]+)*$/u, 'letters, spaces, full stops, hyphens and apostrophes')
    .required()
    .messages({
        'string.empty': 'Name is required',
        'string.pattern.base': 'Name can only contain letters, spaces, full stops, hyphens and apostrophes',
        'string.min': 'Name must be at least {#limit} characters long',
        'string.max': 'Name must be at most {#limit} characters long',
    }),
    email,
    password,
    // Marketplace roles accepted from the client: "freelancer" and "client", "admin" is rejected using a 400
    roles: Joi.array().items(Joi.string().valid('freelancer', 'client')).min(1).unique().required().messages({
        'array.includes': 'Roles can only include "freelancer" and/or "client"',
        'array.min': 'At least one role must be specified',
        'array.unique': 'Roles must not contain duplicates',
    }),
});

export const loginSchema = Joi.object({
    email,
    // Preserve the exact password entered; whitespace may be part of an existing password.
    // Login deliberately does not enforce registration strength rules.
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least {#limit} characters long',
        'string.max': 'Password must be at most {#limit} characters long',
        'string.pattern.base': 'Password must contain at least one letter and one number and no whitespace',
    }),
});
   