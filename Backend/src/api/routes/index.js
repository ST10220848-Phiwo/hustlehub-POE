const { Router } = require('express');
const authRoute = require('./auth.route'); // your existing auth.route.js
const authenticate = require('../../middleware/authenticate');
// const userRoute = require('./user.route');

const router = Router();

// Public — no token required
router.use('/auth', authRoute); // /api/auth/register, /api/auth/login

// Anything mounted below this line requires a valid JWT.
// Add authorize('role') per-route on top of this where needed.
router.use('/users', authenticate, userRoute);

module.exports = router;