import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { register, login, logout, me } from '../api/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from '../../validations/auth.validation.js';
import { AppError } from '../utils/AppError.js';

const limiterDefaults = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  //Route 429s through the central error handler so they share the problem+json format
  handler: (_req, _res, next, options) => next(AppError.tooManyRequests(options.message)),
};

const loginLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const registerLimiter = rateLimit({
  ...limiterDefaults,
  windowsMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many accounts created from this network. Please try again later.'
});

export const authRouter = Router();

//Limiter runs before validation so malformed spam counts against the limit
authRouter.post('/register', registerLimiter, validate(registerSchema), register);
authRouter.post('/login', loginLimiter, validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);