import { Router } from 'express';
import { authRouter } from '../routes/auth.routes.js';

/**
 *  This module manages the auth routing for gigs and bookings
 */

const router = Router();
router.use('/auth', authRouter);
//Future implementation:
// router.use('/gigs', gigRouter);
//router.use('/bookings', bookingRouter);

export default router;