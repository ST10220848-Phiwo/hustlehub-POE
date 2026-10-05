import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me } from '../api/auth.controller.js';
import { authenticateWithRealUser } from '../middleware/authenticate.js';

const router = Router();

// Tighter than the global limiter in app.js on purpose - register/login are
// the credential-stuffing, brute-force, and registration-spam attack
// surface, and the generic 100-req/15min limit alone is not tight enough
// for that.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    type: 'about:blank',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many attempts. Please try again later.',
  },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticateWithRealUser, me);

export default router;