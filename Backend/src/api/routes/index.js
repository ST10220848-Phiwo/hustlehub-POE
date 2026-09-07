import { Router } from 'express';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);

// Feature routers get mounted here as they're built, e.g.:
// apiRouter.use('/auth', authRouter);
// apiRouter.use('/gigs', gigsRouter);
// apiRouter.use('/bookings', bookingsRouter);
// apiRouter.use('/transactions', transactionsRouter);
// Each should stay thin - validation + calling an application service,
// with role/ownership checks applied via middleware before the handler runs.